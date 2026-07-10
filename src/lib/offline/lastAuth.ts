// 最後一次成功登入的使用者摘要（localStorage）。
// 離線開 App 時 getSession() 可能因 token 過期刷新卡住或回 null，
// 以此判定「本機曾登入過」→ 進入唯讀離線模式，而不是把使用者踢去無法登入的登入頁。
export interface LastAuth {
  id: string
  name: string
  avatarUrl: string | null
}

const KEY = 'cotravel.lastAuth'

export function saveLastAuth(a: LastAuth): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(a))
  } catch {
    // 寫入失敗（容量/隱私模式）不致命，只是下次離線進不了離線模式
  }
}

export function loadLastAuth(): LastAuth | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as LastAuth) : null
  } catch {
    return null
  }
}

export function clearLastAuth(): void {
  localStorage.removeItem(KEY)
}
