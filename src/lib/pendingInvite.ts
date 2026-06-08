// 暫存「待加入的旅程邀請碼」，跨越 OAuth 重新導向。
// 流程：登入頁輸入碼 → 存起來 → 觸發 Google 登入 → 回跳後在旅程列表自動兌換並清除。
const KEY = 'cotravel.pendingInviteCode'

export function setPendingInvite(code: string): void {
  localStorage.setItem(KEY, code.trim().toUpperCase())
}

// 取出並清除（一次性）
export function takePendingInvite(): string | null {
  const v = localStorage.getItem(KEY)
  if (v) localStorage.removeItem(KEY)
  return v
}
