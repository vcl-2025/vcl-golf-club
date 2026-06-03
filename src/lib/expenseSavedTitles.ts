const STORAGE_KEY = 'vcl_expense_saved_titles_v1'

export type SavedExpenseTitle = {
  transaction_type: 'income' | 'expense'
  expense_type: string
  title: string
}

function normalizeTitle(title: string): string {
  return title.trim()
}

export function getSavedExpenseTitles(): SavedExpenseTitle[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedExpenseTitle[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e) =>
        (e.transaction_type === 'income' || e.transaction_type === 'expense') &&
        e.expense_type &&
        normalizeTitle(e.title)
    )
  } catch {
    return []
  }
}

export function saveExpenseTitle(entry: SavedExpenseTitle): void {
  const title = normalizeTitle(entry.title)
  if (!title) return
  const list = getSavedExpenseTitles()
  const exists = list.some(
    (e) =>
      e.transaction_type === entry.transaction_type &&
      e.expense_type === entry.expense_type &&
      normalizeTitle(e.title) === title
  )
  if (exists) return
  list.push({
    transaction_type: entry.transaction_type,
    expense_type: entry.expense_type,
    title,
  })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export function removeSavedExpenseTitle(entry: SavedExpenseTitle): void {
  const title = normalizeTitle(entry.title)
  const list = getSavedExpenseTitles().filter(
    (e) =>
      !(
        e.transaction_type === entry.transaction_type &&
        e.expense_type === entry.expense_type &&
        normalizeTitle(e.title) === title
      )
  )
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}
