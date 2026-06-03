/** 费用公示：收入/支出大类及预设标题（单条录入与月度批量录入共用） */

export type ExpenseCategoryDef = {
  value: string
  label: string
  titles: string[]
}

export const INCOME_CATEGORIES: ExpenseCategoryDef[] = [
  {
    value: 'membership_income',
    label: '会员收入',
    titles: ['会费'],
  },
  {
    value: 'sponsorship_support',
    label: '赞助与支持',
    titles: ['赞助费'],
  },
  {
    value: 'activity_related_income',
    label: '活动相关收入',
    titles: ['代收比赛球费', '代收差点费', '代收餐费', '代收服装费'],
  },
  {
    value: 'investment_income',
    label: '投资收益',
    titles: ['利息收入', 'GIC 赎回'],
  },
  {
    value: 'other_income',
    label: '其他收入',
    titles: ['其他', '其他费'],
  },
]

export const EXPENSE_CATEGORIES: ExpenseCategoryDef[] = [
  {
    value: 'activity_expense',
    label: '活动支出',
    titles: [
      '比赛奖品及杂费',
      '活动餐费及酒水',
      '开杆赛餐费',
      '代付比赛费用 (含Zone4费用)',
      'ZONE 4 球费',
      '代付差点费',
      '摄影师费用',
      '退费',
      '服装礼品费',
    ],
  },
  {
    value: 'investment_savings',
    label: '投资与储蓄',
    titles: ['存GIC', '2026联赛押金'],
  },
  {
    value: 'operating_expense',
    label: '运营支出',
    titles: ['银行费', '银行费用'],
  },
  {
    value: 'other_expense',
    label: '其它支出',
    titles: ['其他'],
  },
]

export function getCategoriesForTransaction(
  transactionType: 'income' | 'expense'
): ExpenseCategoryDef[] {
  return transactionType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
}

export function getCategoryLabel(
  transactionType: 'income' | 'expense',
  expenseType: string
): string {
  const cat = getCategoriesForTransaction(transactionType).find((c) => c.value === expenseType)
  return cat?.label || expenseType
}
