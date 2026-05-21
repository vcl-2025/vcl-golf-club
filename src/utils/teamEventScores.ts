/** 团体赛成绩汇总（与 UserScoreQuery 比洞 / 总杆逻辑一致） */

export type ScoringMode = 'ryder_cup' | 'total_strokes'

export interface TeamScoreRow {
  team_name?: string | null
  group_number?: number | null
  hole_scores?: number[] | string[] | null
  net_strokes?: number | null
  total_strokes?: number | null
}

export interface TeamSummaryItem {
  team_name: string
  score: number
}

function normalizeHoleScores(holeScores: unknown): number[] {
  if (!Array.isArray(holeScores) || holeScores.length === 0) return []
  if (typeof holeScores[0] === 'string') {
    return holeScores.map((s) => parseInt(String(s), 10) || 0)
  }
  return holeScores.map((s) =>
    typeof s === 'number' && !isNaN(s) ? Number(s) : 0
  )
}

/** 总杆模式：各队成员净杆（或总杆）之和 */
function computeTotalStrokesTeamScores(scores: TeamScoreRow[]): TeamSummaryItem[] {
  const teamMap = new Map<string, number[]>()
  scores.forEach((score) => {
    if (!score.team_name) return
    const strokes =
      score.net_strokes != null ? score.net_strokes : score.total_strokes
    if (strokes == null) return
    const name = score.team_name.trim()
    if (!teamMap.has(name)) teamMap.set(name, [])
    teamMap.get(name)!.push(strokes)
  })
  return Array.from(teamMap.entries())
    .map(([team_name, values]) => ({
      team_name,
      score: Math.round(values.reduce((sum, v) => sum + v, 0)),
    }))
    .sort((a, b) => a.score - b.score)
}

/** 比洞（莱德杯）模式：按组比洞，累计各组胜场分（胜 1 / 平各 0.5） */
function computeRyderCupTeamScores(scores: TeamScoreRow[]): TeamSummaryItem[] {
  const groups = new Map<number, Map<string, { holeScores: number[] }[]>>()

  scores.forEach((score) => {
    if (!score.team_name || score.group_number == null) return
    const holeScores = normalizeHoleScores(score.hole_scores)
    if (holeScores.length !== 18) return

    const groupNum = score.group_number
    const teamName = score.team_name.trim()
    if (!groups.has(groupNum)) groups.set(groupNum, new Map())
    const groupTeams = groups.get(groupNum)!
    if (!groupTeams.has(teamName)) groupTeams.set(teamName, [])
    groupTeams.get(teamName)!.push({ holeScores })
  })

  const totalScores = new Map<string, number>()

  groups.forEach((teamsMap) => {
    const teamEntries = Array.from(teamsMap.entries())
    if (teamEntries.length < 1) return

    const teamWins = new Map<string, number>()
    teamEntries.forEach(([teamName]) => {
      teamWins.set(teamName, 0)
      if (!totalScores.has(teamName)) totalScores.set(teamName, 0)
    })

    for (let hole = 0; hole < 18; hole++) {
      const holeBestScores: Array<{ teamName: string; bestScore: number }> = []
      teamEntries.forEach(([teamName, players]) => {
        const holePlayerScores = players
          .map((p) => {
            const s = p.holeScores[hole]
            return s !== undefined && s !== null && !isNaN(s) ? Number(s) : Infinity
          })
          .filter((s) => s !== Infinity)
        const bestScore =
          holePlayerScores.length > 0 ? Math.min(...holePlayerScores) : Infinity
        if (bestScore !== Infinity) {
          holeBestScores.push({ teamName, bestScore })
        }
      })
      if (holeBestScores.length === 0) continue

      const minBestScore = Math.min(...holeBestScores.map((h) => h.bestScore))
      const winners = holeBestScores.filter((h) => h.bestScore === minBestScore)
      const pointsPerTeam = 1 / winners.length
      winners.forEach((winner) => {
        teamWins.set(
          winner.teamName,
          (teamWins.get(winner.teamName) || 0) + pointsPerTeam
        )
      })
    }

    const sortedByHoleWins = teamEntries
      .map(([teamName]) => ({
        teamName,
        wins: teamWins.get(teamName) || 0,
      }))
      .sort((a, b) => b.wins - a.wins)
    const maxWins = sortedByHoleWins[0]?.wins || 0
    const groupWinners = sortedByHoleWins.filter((t) => t.wins === maxWins)

    if (groupWinners.length === 1) {
      const w = groupWinners[0].teamName
      totalScores.set(w, (totalScores.get(w) || 0) + 1)
    } else if (groupWinners.length > 1) {
      groupWinners.forEach((w) => {
        totalScores.set(
          w.teamName,
          (totalScores.get(w.teamName) || 0) + 0.5
        )
      })
    }
  })

  return Array.from(totalScores.entries())
    .map(([team_name, score]) => ({ team_name, score }))
    .sort((a, b) => b.score - a.score)
}

export function computeTeamSummaryScores(
  scores: TeamScoreRow[],
  scoringMode: ScoringMode = 'ryder_cup'
): TeamSummaryItem[] {
  if (scoringMode === 'total_strokes') {
    return computeTotalStrokesTeamScores(scores)
  }
  const ryder = computeRyderCupTeamScores(scores)
  if (ryder.length > 0) return ryder
  // 无比洞洞位数据时回退总杆汇总，避免空白
  return computeTotalStrokesTeamScores(scores)
}

export function formatTeamScoreDisplay(
  score: number,
  scoringMode: ScoringMode = 'ryder_cup'
): string {
  if (scoringMode === 'total_strokes') {
    return `${Math.round(score)}杆`
  }
  return score % 1 === 0 ? `${score}分` : `${score.toFixed(1)}分`
}
