// 從 supabase / RPC 拋出的錯誤取出可顯示的訊息（RPC 的 raise exception 訊息會帶在 message）。
export function errMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message: unknown }).message
    if (typeof m === 'string' && m.trim()) return m
  }
  return '發生錯誤，請再試一次'
}
