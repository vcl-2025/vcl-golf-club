/**
 * 模拟正式抽奖 + 补抽缺席逻辑（对齐 vendor/log-lottery）：
 * - 抽奖池：isWin === false && !isAbsent（奖项 isAll=false）
 * - 揭晓后 50% 缺席：保留者记中奖；缺席者 isAbsent=true 且不记中奖
 * - 插入补抽奖（名额=缺席人数）并继续抽
 * - 校验：缺席者不再入池；全场中奖无重复人
 *
 * 用法：node scripts/simulate-lottery-absent.mjs
 */

import { randomInt } from 'node:crypto'

const RUNS = 1000
const PERSON_COUNT = 120
const SINGLE_TIME_MAX = 40

/** 对齐 getRandomElements：无放回随机抽取 */
function getRandomElements(sourceArray, count) {
  if (count <= 0) return []
  const newArray = [...sourceArray]
  if (count >= newArray.length) {
    // Fisher–Yates
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

/** 正式项目常见奖项结构（名额合计 19，名单 120，足以支撑补抽链） */
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

/** 50% 缺席：随机打乱后取前一半（奇数时向下取整） */
function splitAbsent(drawn) {
  if (drawn.length <= 0) return { kept: [], removed: [] }
  const shuffled = getRandomElements(drawn, drawn.length)
  const removeCount = Math.floor(shuffled.length * 0.5)
  // 至少抽 2 人时保证能触发补抽；单人轮则 50% 概率缺席
  let n = removeCount
  if (shuffled.length === 1) n = randomInt(2) // 0 or 1
  if (shuffled.length >= 2 && n === 0) n = 1 // 强制至少 1 人缺席，贴近「每抽一次都有补抽」
  const removed = shuffled.slice(0, n)
  const removedIds = new Set(removed.map(p => p.id))
  const kept = shuffled.filter(p => !removedIds.has(p.id))
  return { kept, removed }
}

function simulateOneRun(runIndex) {
  const people = Array.from({ length: PERSON_COUNT }, (_, i) => makePerson(i + 1))
  const prizes = makePrizes()
  let prizeCursor = 0
  let redrawSeq = 0

  const errors = []
  const drawLog = []
  /** 每次抽奖时入池的人 id，用于事后核对缺席者是否又进池 */
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

      // 缺席者不得入池
      for (const p of pool) {
        if (p.isAbsent) {
          errors.push({
            type: 'ABSENT_IN_POOL',
            run: runIndex,
            prize: prize.name,
            personId: p.id,
          })
        }
      }

      const leftover = prize.count - prize.isUsedCount
      const luckyCount = Math.min(SINGLE_TIME_MAX, Math.max(leftover, 0), pool.length)
      if (luckyCount <= 0) {
        // 人不够：标为用尽并结束该奖（与产品「人数不足」提示对应）
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

      // 同轮不得重复
      const drawnIds = drawn.map(p => p.id)
      if (new Set(drawnIds).size !== drawnIds.length) {
        errors.push({ type: 'DUP_IN_ROUND', run: runIndex, prize: prize.name, drawnIds })
      }

      // 本轮 50% 缺席 → 补抽
      const { kept, removed } = splitAbsent(drawn)

      // 整段名额消耗（含缺席）
      prize.isUsedCount += drawn.length
      if (prize.isUsedCount >= prize.count) {
        prize.isUsed = true
        prize.isUsedCount = prize.count
      }

      if (kept.length) addAlreadyPersonList(people, kept, prize)
      if (removed.length) markAbsentPersonList(people, removed)

      drawLog.push({
        prize: prize.name,
        drawn: drawnIds,
        kept: kept.map(p => p.id),
        removed: removed.map(p => p.id),
      })

      // 缺席者不应被记为中奖
      for (const a of removed) {
        const person = people.find(p => p.id === a.id)
        if (person?.isWin || (person?.prizeId?.length ?? 0) > 0) {
          errors.push({
            type: 'ABSENT_MARKED_WIN',
            run: runIndex,
            prize: prize.name,
            personId: a.id,
          })
        }
        if (!person?.isAbsent) {
          errors.push({
            type: 'ABSENT_NOT_FLAGGED',
            run: runIndex,
            personId: a.id,
          })
        }
      }

      if (removed.length > 0) {
        redrawSeq++
        const redrawPrize = buildRedrawPrize(prize, removed.length, redrawSeq)
        insertPrizeAfter(prizes, prize.id, redrawPrize)
        // 切到补抽奖（下一轮 while 外层会抽到它）
        // 当前奖若未抽完会继续本奖；抽完后 cursor 前进到补抽奖
      }

      // 若本奖未抽完，继续本奖剩余名额；抽完则跳出内层
      if (prize.isUsed) break
    }

    prizeCursor++
  }

  // —— 全局校验 ——
  const winners = people.filter(p => p.isWin)
  const winnerIds = winners.map(p => p.id)
  if (new Set(winnerIds).size !== winnerIds.length) {
    errors.push({ type: 'DUP_WINNER_GLOBAL', run: runIndex, winnerIds })
  }

  // 同一人不应中多个奖（isAll=false）
  for (const w of winners) {
    if (w.prizeId.length > 1) {
      errors.push({
        type: 'MULTI_PRIZE_WIN',
        run: runIndex,
        personId: w.id,
        prizeIds: [...w.prizeId],
      })
    }
  }

  // 缺席者不得出现在之后任意一次入池快照
  const absentIds = new Set(people.filter(p => p.isAbsent).map(p => p.id))
  // 按时间序：某人被标记缺席后，后续 pool 不得包含他
  const absentAt = new Map() // personId -> first drawLog index when marked
  drawLog.forEach((d, i) => {
    for (const id of d.removed) {
      if (!absentAt.has(id)) absentAt.set(id, i)
    }
  })
  // poolSnapshots 与 drawLog 一一对应
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

  // 缺席者不得出现在任意 kept / 中奖名单
  for (const d of drawLog) {
    for (const id of d.kept) {
      if (absentIds.has(id) && people.find(p => p.id === id)?.isAbsent) {
        // kept 当时未缺席；若之后又缺席（不可能，已 isWin）——仅当 kept 后又被标缺席才异常
      }
    }
  }
  for (const id of absentIds) {
    const p = people.find(x => x.id === id)
    if (p?.isWin) {
      errors.push({ type: 'ABSENT_IS_WINNER', run: runIndex, personId: id })
    }
    // 缺席后若又出现在某轮 drawn（且该轮在标记之后）
    for (let i = 0; i < drawLog.length; i++) {
      const markedAt = absentAt.get(id)
      if (markedAt !== undefined && i > markedAt && drawLog[i].drawn.includes(id)) {
        errors.push({
          type: 'ABSENT_REDRAWN',
          run: runIndex,
          personId: id,
          prize: drawLog[i].prize,
        })
      }
    }
  }

  const totalAbsent = people.filter(p => p.isAbsent).length
  const totalWinners = winners.length
  const redrawPrizes = prizes.filter(p => p.isRedrawPrize).length

  return {
    errors,
    totalAbsent,
    totalWinners,
    redrawPrizes,
    drawRounds: drawLog.length,
  }
}

function main() {
  let failRuns = 0
  const errorCounts = new Map()
  let sumAbsent = 0
  let sumWinners = 0
  let sumRedraw = 0
  let sumRounds = 0
  const samples = []

  for (let i = 0; i < RUNS; i++) {
    const r = simulateOneRun(i + 1)
    sumAbsent += r.totalAbsent
    sumWinners += r.totalWinners
    sumRedraw += r.redrawPrizes
    sumRounds += r.drawRounds
    if (r.errors.length) {
      failRuns++
      for (const e of r.errors) {
        errorCounts.set(e.type, (errorCounts.get(e.type) || 0) + 1)
      }
      if (samples.length < 8) samples.push(r.errors.slice(0, 3))
    }
  }

  console.log('=== 抽奖缺席/重复人 模拟测试 ===')
  console.log(`轮次: ${RUNS}`)
  console.log(`每场名单: ${PERSON_COUNT} 人`)
  console.log(`每场奖项: 特等1 + 一等2 + 二等3 + 三等5 + 幸运8（合计19名额，补抽另计）`)
  console.log(`每抽揭晓后: 约 50% 缺席并触发补抽`)
  console.log('')
  console.log(`通过场次: ${RUNS - failRuns} / ${RUNS}`)
  console.log(`失败场次: ${failRuns}`)
  console.log(`平均缺席人数: ${(sumAbsent / RUNS).toFixed(2)}`)
  console.log(`平均中奖人数: ${(sumWinners / RUNS).toFixed(2)}`)
  console.log(`平均补抽奖项数: ${(sumRedraw / RUNS).toFixed(2)}`)
  console.log(`平均抽奖轮次: ${(sumRounds / RUNS).toFixed(2)}`)
  console.log('')

  if (failRuns === 0) {
    console.log('结论: PASS')
    console.log('- 缺席者未再进入后续抽奖池')
    console.log('- 缺席者未被记为中奖')
    console.log('- 全场中奖无重复人')
    console.log('- 单轮抽取无重复人')
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
