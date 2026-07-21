/**
 * 抽奖规则回归模拟（对齐 vendor/log-lottery）
 *
 * 规则：
 * 1. 抽奖池：isWin===false && !isAbsent（isAll=false）
 * 2. 每轮揭晓约 50% 缺席：保留者记中奖；缺席者 isAbsent、不记中奖
 * 3. 插入补抽奖（名额=缺席人数）并继续
 * 4. 缺席者不得再入后续抽奖池 / 不得再被抽中 / 不得出现在中奖名单
 * 5. 全场中奖无重复人；单轮无重复；同一人不得中多个奖（isAll=false）
 * 6. 各奖实际中奖人数不得超过该奖名额
 * 7. 取消「已抽取」须同步 clearWinnersForPrize，重抽后不得叠成 20/10
 *
 * 用法：node scripts/simulate-lottery-absent.mjs
 */

import { randomInt } from 'node:crypto'

const RUNS = 1000
const PERSON_COUNT = 120
const SINGLE_TIME_MAX = 40

function getRandomElements(sourceArray, count) {
  if (count <= 0) return []
  const newArray = [...sourceArray]
  if (count >= newArray.length) {
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = randomInt(i + 1)
      ;[newArray[i], newArray[j]] = [newArray[j], newArray[i]]
    }
    return newArray
  }
  const result = []
  for (let i = 0; i < count; i++) {
    const idx = randomInt(newArray.length)
    result.push(newArray[idx])
    newArray.splice(idx, 1)
  }
  return result
}

function makePerson(id) {
  return {
    id,
    uid: String(1000 + id),
    name: `P${id}`,
    department: id % 5 === 0 ? '嘉宾' : '会员',
    isWin: false,
    isAbsent: false,
    prizeId: [],
    prizeName: [],
  }
}

function makePrizes() {
  return [
    { id: 'p1', name: '特等奖', count: 1, isUsedCount: 0, isUsed: false, isAll: false, isRedrawPrize: false },
    { id: 'p2', name: '一等奖', count: 2, isUsedCount: 0, isUsed: false, isAll: false, isRedrawPrize: false },
    { id: 'p3', name: '二等奖', count: 3, isUsedCount: 0, isUsed: false, isAll: false, isRedrawPrize: false },
    { id: 'p4', name: '三等奖', count: 5, isUsedCount: 0, isUsed: false, isAll: false, isRedrawPrize: false },
    { id: 'p5', name: '幸运奖', count: 8, isUsedCount: 0, isUsed: false, isAll: false, isRedrawPrize: false },
  ]
}

function getNotPersonList(people) {
  return people.filter(p => p.isWin === false && !p.isAbsent)
}

function getNotThisPrizePersonList(people, prize) {
  return people.filter(p => !p.isAbsent && !p.prizeId.includes(String(prize.id)))
}

function addAlreadyPersonList(people, winners, prize) {
  const byId = new Map(people.map(p => [p.id, p]))
  for (const w of winners) {
    const target = byId.get(w.id)
    if (!target) continue
    target.isWin = true
    target.isAbsent = false
    target.prizeName.push(prize.name)
    target.prizeId.push(String(prize.id))
  }
}

function markAbsentPersonList(people, absentees) {
  const byId = new Map(people.map(p => [p.id, p]))
  for (const a of absentees) {
    const target = byId.get(a.id)
    if (!target) continue
    target.isAbsent = true
  }
}

/** 对齐 clearWinnersForPrize */
function clearWinnersForPrize(people, prizeId) {
  const prizeIdStr = String(prizeId)
  let cleared = 0
  for (const item of people) {
    const ids = Array.isArray(item.prizeId) ? item.prizeId : []
    if (!ids.some(id => String(id) === prizeIdStr)) continue
    const nextIds = []
    const nextNames = []
    const names = Array.isArray(item.prizeName) ? item.prizeName : []
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i]) === prizeIdStr) {
        cleared++
        continue
      }
      nextIds.push(String(ids[i]))
      nextNames.push(names[i] ?? '')
    }
    item.prizeId = nextIds
    item.prizeName = nextNames
    item.isWin = nextIds.length > 0
  }
  return cleared
}

function insertPrizeAfter(prizes, afterId, prize) {
  const idx = prizes.findIndex(p => String(p.id) === String(afterId))
  if (idx < 0) {
    prizes.push(prize)
    return
  }
  prizes.splice(idx + 1, 0, prize)
}

function buildRedrawPrize(source, count, seq) {
  return {
    id: `redraw-${source.id}-${seq}`,
    name: `${source.name}（补抽）`,
    count,
    isUsedCount: 0,
    isUsed: false,
    isAll: Boolean(source.isAll),
    isRedrawPrize: true,
  }
}

function splitAbsent(drawn) {
  if (drawn.length <= 0) return { kept: [], removed: [] }
  const shuffled = getRandomElements(drawn, drawn.length)
  let n = Math.floor(shuffled.length * 0.5)
  if (shuffled.length === 1) n = randomInt(2)
  if (shuffled.length >= 2 && n === 0) n = 1
  const removed = shuffled.slice(0, n)
  const removedIds = new Set(removed.map(p => p.id))
  const kept = shuffled.filter(p => !removedIds.has(p.id))
  return { kept, removed }
}

function winnersOfPrize(people, prizeId) {
  const id = String(prizeId)
  return people.filter(p => p.isWin && (p.prizeId || []).some(x => String(x) === id))
}

/**
 * 抽完某个奖（含期间插入的补抽链中、属于该奖流程的部分由外层 while 处理）
 * 这里按奖项列表游标推进整场。
 */
function runFullLottery(people, prizes, errors, runIndex, { forceAbsent = true } = {}) {
  let prizeCursor = 0
  let redrawSeq = 0
  const drawLog = []
  const poolSnapshots = []

  while (prizeCursor < prizes.length) {
    const prize = prizes[prizeCursor]
    if (prize.isUsed) {
      prizeCursor++
      continue
    }

    while (!prize.isUsed) {
      const pool = prize.isAll
        ? getNotThisPrizePersonList(people, prize)
        : getNotPersonList(people)

      for (const p of pool) {
        if (p.isAbsent) {
          errors.push({ type: 'ABSENT_IN_POOL', run: runIndex, prize: prize.name, personId: p.id })
        }
        if (!prize.isAll && p.isWin) {
          errors.push({ type: 'WINNER_IN_POOL', run: runIndex, prize: prize.name, personId: p.id })
        }
      }

      const leftover = prize.count - prize.isUsedCount
      const luckyCount = Math.min(SINGLE_TIME_MAX, Math.max(leftover, 0), pool.length)
      if (luckyCount <= 0) {
        prize.isUsed = true
        prize.isUsedCount = prize.count
        break
      }

      poolSnapshots.push({
        prizeId: prize.id,
        prizeName: prize.name,
        poolIds: pool.map(p => p.id),
      })

      const drawn = getRandomElements(pool, luckyCount)
      const drawnIds = drawn.map(p => p.id)
      if (new Set(drawnIds).size !== drawnIds.length) {
        errors.push({ type: 'DUP_IN_ROUND', run: runIndex, prize: prize.name, drawnIds })
      }

      let kept = drawn
      let removed = []
      if (forceAbsent) {
        ;({ kept, removed } = splitAbsent(drawn))
      }

      prize.isUsedCount += drawn.length
      if (prize.isUsedCount >= prize.count) {
        prize.isUsed = true
        prize.isUsedCount = prize.count
      }

      if (kept.length) addAlreadyPersonList(people, kept, prize)
      if (removed.length) markAbsentPersonList(people, removed)

      drawLog.push({
        prizeId: prize.id,
        prize: prize.name,
        drawn: drawnIds,
        kept: kept.map(p => p.id),
        removed: removed.map(p => p.id),
      })

      for (const a of removed) {
        const person = people.find(p => p.id === a.id)
        if (person?.isWin || (person?.prizeId?.length ?? 0) > 0) {
          errors.push({ type: 'ABSENT_MARKED_WIN', run: runIndex, prize: prize.name, personId: a.id })
        }
        if (!person?.isAbsent) {
          errors.push({ type: 'ABSENT_NOT_FLAGGED', run: runIndex, personId: a.id })
        }
      }

      if (removed.length > 0) {
        redrawSeq++
        insertPrizeAfter(prizes, prize.id, buildRedrawPrize(prize, removed.length, redrawSeq))
      }

      if (prize.isUsed) break
    }

    prizeCursor++
  }

  return { drawLog, poolSnapshots }
}

function assertAbsentAndDupRules(people, drawLog, poolSnapshots, errors, runIndex) {
  const winners = people.filter(p => p.isWin)
  const winnerIds = winners.map(p => p.id)
  if (new Set(winnerIds).size !== winnerIds.length) {
    errors.push({ type: 'DUP_WINNER_GLOBAL', run: runIndex, winnerIds })
  }

  for (const w of winners) {
    if (w.prizeId.length > 1) {
      errors.push({ type: 'MULTI_PRIZE_WIN', run: runIndex, personId: w.id, prizeIds: [...w.prizeId] })
    }
  }

  const absentAt = new Map()
  drawLog.forEach((d, i) => {
    for (const id of d.removed) {
      if (!absentAt.has(id)) absentAt.set(id, i)
    }
  })

  for (let i = 0; i < poolSnapshots.length; i++) {
    const snap = poolSnapshots[i]
    for (const id of snap.poolIds) {
      const markedAt = absentAt.get(id)
      if (markedAt !== undefined && markedAt < i) {
        errors.push({
          type: 'ABSENT_REENTER_POOL',
          run: runIndex,
          personId: id,
          laterPrize: snap.prizeName,
          markedAtDraw: markedAt,
          laterDraw: i,
        })
      }
    }
  }

  const absentIds = people.filter(p => p.isAbsent).map(p => p.id)
  for (const id of absentIds) {
    const p = people.find(x => x.id === id)
    if (p?.isWin) {
      errors.push({ type: 'ABSENT_IS_WINNER', run: runIndex, personId: id })
    }
    for (let i = 0; i < drawLog.length; i++) {
      const markedAt = absentAt.get(id)
      if (markedAt !== undefined && i > markedAt && drawLog[i].drawn.includes(id)) {
        errors.push({ type: 'ABSENT_REDRAWN', run: runIndex, personId: id, prize: drawLog[i].prize })
      }
    }
  }
}

function assertPrizeCap(people, prizes, errors, runIndex) {
  for (const prize of prizes) {
    const wins = winnersOfPrize(people, prize.id)
    if (wins.length > prize.count) {
      errors.push({
        type: 'PRIZE_OVERFILL',
        run: runIndex,
        prize: prize.name,
        prizeId: prize.id,
        winners: wins.length,
        cap: prize.count,
      })
    }
  }
}

function simulateOneRun(runIndex) {
  const errors = []
  const people = Array.from({ length: PERSON_COUNT }, (_, i) => makePerson(i + 1))
  const prizes = makePrizes()

  const { drawLog, poolSnapshots } = runFullLottery(people, prizes, errors, runIndex, { forceAbsent: true })
  assertAbsentAndDupRules(people, drawLog, poolSnapshots, errors, runIndex)
  assertPrizeCap(people, prizes, errors, runIndex)

  const totalAbsent = people.filter(p => p.isAbsent).length
  const totalWinners = people.filter(p => p.isWin).length
  const redrawPrizes = prizes.filter(p => p.isRedrawPrize).length

  // —— 场景 B：取消「已抽取」清中奖后重抽，不得超员 ——
  // 挑一个已完成的非补抽奖（幸运奖），模拟取消勾选
  const target = prizes.find(p => !p.isRedrawPrize && p.id === 'p5' && p.isUsed)
  let reopenOk = false
  if (target) {
    const before = winnersOfPrize(people, target.id).length
    const cleared = clearWinnersForPrize(people, target.id)
    target.isUsed = false
    target.isUsedCount = 0

    if (cleared !== before) {
      errors.push({
        type: 'REOPEN_CLEAR_MISMATCH',
        run: runIndex,
        before,
        cleared,
      })
    }
    if (winnersOfPrize(people, target.id).length !== 0) {
      errors.push({ type: 'REOPEN_WINNERS_REMAIN', run: runIndex })
    }

    // 只重抽该奖（本场景不再强制缺席，专注验证清名单）
    const solo = [target]
    runFullLottery(people, solo, errors, runIndex, { forceAbsent: false })
    const after = winnersOfPrize(people, target.id).length
    if (after > target.count) {
      errors.push({
        type: 'REOPEN_OVERFILL',
        run: runIndex,
        winners: after,
        cap: target.count,
        ratio: `${after}/${target.count}`,
      })
    }
    if (after !== target.count && getNotPersonList(people).length + after >= target.count) {
      // 人够时应正好抽满
      errors.push({
        type: 'REOPEN_UNDERFILL',
        run: runIndex,
        winners: after,
        cap: target.count,
      })
    }
    reopenOk = after === target.count
  }

  return {
    errors,
    totalAbsent,
    totalWinners,
    redrawPrizes,
    drawRounds: drawLog.length,
    reopenOk,
  }
}

function main() {
  let failRuns = 0
  const errorCounts = new Map()
  let sumAbsent = 0
  let sumWinners = 0
  let sumRedraw = 0
  let sumRounds = 0
  let reopenOkCount = 0
  const samples = []

  for (let i = 0; i < RUNS; i++) {
    const r = simulateOneRun(i + 1)
    sumAbsent += r.totalAbsent
    sumWinners += r.totalWinners
    sumRedraw += r.redrawPrizes
    sumRounds += r.drawRounds
    if (r.reopenOk) reopenOkCount++
    if (r.errors.length) {
      failRuns++
      for (const e of r.errors) {
        errorCounts.set(e.type, (errorCounts.get(e.type) || 0) + 1)
      }
      if (samples.length < 8) samples.push(r.errors.slice(0, 4))
    }
  }

  console.log('=== 抽奖规则回归模拟（1000 次）===')
  console.log(`名单: ${PERSON_COUNT} 人/场`)
  console.log('奖项: 特等1 + 一等2 + 二等3 + 三等5 + 幸运8')
  console.log('规则: 每轮约50%缺席补抽；缺席不再入池；无重复中奖；取消已抽取须清名单后重抽')
  console.log('')
  console.log(`通过场次: ${RUNS - failRuns} / ${RUNS}`)
  console.log(`失败场次: ${failRuns}`)
  console.log(`平均缺席: ${(sumAbsent / RUNS).toFixed(2)}`)
  console.log(`平均中奖: ${(sumWinners / RUNS).toFixed(2)}`)
  console.log(`平均补抽奖项: ${(sumRedraw / RUNS).toFixed(2)}`)
  console.log(`平均抽奖轮次: ${(sumRounds / RUNS).toFixed(2)}`)
  console.log(`取消已抽取后重抽正确: ${reopenOkCount} / ${RUNS}`)
  console.log('')

  if (failRuns === 0) {
    console.log('结论: PASS')
    console.log('- 缺席者不入池、不中奖、不再被抽')
    console.log('- 无重复中奖 / 单轮无重复 / 无人多奖')
    console.log('- 各奖中奖人数未超名额')
    console.log('- 取消「已抽取」清名单后重抽不超员')
  }
  else {
    console.log('结论: FAIL')
    console.log('错误类型统计:')
    for (const [k, v] of [...errorCounts.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k}: ${v}`)
    }
    console.log('样例错误:', JSON.stringify(samples, null, 2))
    process.exitCode = 1
  }
}

main()
