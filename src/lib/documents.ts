// 文件匣資料存取（階段 4）：documents 的 list / upload / remove。
// 沿用 itinerary.ts / transports.ts 慣例：薄包裝 Supabase、出錯即 throw（訊息交給 errMessage 顯示）。
// RLS 已限定只有該趟成員可讀寫（見 supabase/schema.sql 的 "members rw documents"）。
// 檔案一律透過 storage 抽象層存取（不直接碰 Supabase Storage），以便日後換 Cloudflare R2。
import { supabase } from './supabase'
import { storage } from './storage'
import type { Document, DocumentCategory } from './types'

export async function listDocuments(tripId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Document[]
}

// 內部：把 join 查詢回來的 { documents: Document } 列攤平 + 依建立時間新到舊排序。
// supabase-js 無產生型別時把 to-one embed 推成陣列，故先轉 unknown 再收斂。
function flattenLinkedDocs(rows: unknown): Document[] {
  return ((rows ?? []) as { documents: Document | null }[])
    .map((r) => r.documents)
    .filter((d): d is Document => d != null)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
}

// 某行程項目已連結的文件（多對多，走 document_items join）
export async function listDocumentsByItem(itemId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from('document_items')
    .select('documents(*)')
    .eq('item_id', itemId)
  if (error) throw error
  return flattenLinkedDocs(data)
}

// 某交通段已連結的文件（多對多，走 document_transports join）
export async function listDocumentsByTransport(transportId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from('document_transports')
    .select('documents(*)')
    .eq('transport_id', transportId)
  if (error) throw error
  return flattenLinkedDocs(data)
}

// 某住宿已連結的文件（多對多，走 document_lodgings join）。住宿項目以 lodging_id 動態查詢此表，
// 故後續新增並連到該住宿的文件，已排好的住宿日會自動看到（連結掛 lodging 層、不隨住宿項目重建消失）。
export async function listDocumentsByLodging(lodgingId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from('document_lodgings')
    .select('documents(*)')
    .eq('lodging_id', lodgingId)
  if (error) throw error
  return flattenLinkedDocs(data)
}

// ---- 連結增刪（多對多；toggle 管理用） ----

export async function linkDocumentToItem(documentId: string, itemId: string): Promise<void> {
  const { error } = await supabase
    .from('document_items')
    .upsert({ document_id: documentId, item_id: itemId }, { onConflict: 'document_id,item_id' })
  if (error) throw error
}

export async function unlinkDocumentFromItem(documentId: string, itemId: string): Promise<void> {
  const { error } = await supabase
    .from('document_items')
    .delete()
    .eq('document_id', documentId)
    .eq('item_id', itemId)
  if (error) throw error
}

export async function linkDocumentToTransport(
  documentId: string,
  transportId: string,
): Promise<void> {
  const { error } = await supabase
    .from('document_transports')
    .upsert(
      { document_id: documentId, transport_id: transportId },
      { onConflict: 'document_id,transport_id' },
    )
  if (error) throw error
}

export async function unlinkDocumentFromTransport(
  documentId: string,
  transportId: string,
): Promise<void> {
  const { error } = await supabase
    .from('document_transports')
    .delete()
    .eq('document_id', documentId)
    .eq('transport_id', transportId)
  if (error) throw error
}

export async function linkDocumentToLodging(documentId: string, lodgingId: string): Promise<void> {
  const { error } = await supabase
    .from('document_lodgings')
    .upsert(
      { document_id: documentId, lodging_id: lodgingId },
      { onConflict: 'document_id,lodging_id' },
    )
  if (error) throw error
}

export async function unlinkDocumentFromLodging(
  documentId: string,
  lodgingId: string,
): Promise<void> {
  const { error } = await supabase
    .from('document_lodgings')
    .delete()
    .eq('document_id', documentId)
    .eq('lodging_id', lodgingId)
  if (error) throw error
}

// 文件匣 chip 用：每份文件目前連到幾處（items + transports 合計）
export async function listLinkCounts(documentIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  if (documentIds.length === 0) return counts
  const [items, transports, lodgings] = await Promise.all([
    supabase.from('document_items').select('document_id').in('document_id', documentIds),
    supabase.from('document_transports').select('document_id').in('document_id', documentIds),
    supabase.from('document_lodgings').select('document_id').in('document_id', documentIds),
  ])
  if (items.error) throw items.error
  if (transports.error) throw transports.error
  if (lodgings.error) throw lodgings.error
  for (const row of [...(items.data ?? []), ...(transports.data ?? []), ...(lodgings.data ?? [])]) {
    const id = (row as { document_id: string }).document_id
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
}

// Supabase Storage 的物件 key 只允許部分 ASCII 字元，中文等字元會被拒（Invalid key）。
// key 不需含真實檔名（已用 uuid 當唯一名），故只取安全副檔名；真實檔名另存 DB file_name 供顯示。
function safeExtension(name: string): string {
  const m = /\.([a-zA-Z0-9]+)$/.exec(name)
  return m ? `.${m[1].toLowerCase()}` : ''
}

export interface UploadDocumentInput {
  trip_id: string
  category: DocumentCategory
  file: File
}

// 上傳流程：先傳檔（storage key 首段為 trip_id，供 storage RLS 判斷成員）→ 再寫中繼資料。
// 中繼資料寫入失敗則清掉已上傳檔，避免孤兒檔（careful 失敗路徑）。
export async function uploadDocument(input: UploadDocumentInput): Promise<Document> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const uploaded_by = session?.user.id ?? null

  // 路徑首段為 trip_id（供 storage RLS 判斷成員），檔名用 uuid + 安全副檔名（避免 Invalid key）
  const storage_path = `${input.trip_id}/${crypto.randomUUID()}${safeExtension(input.file.name)}`

  await storage.upload(storage_path, input.file, {
    contentType: input.file.type || undefined,
  })

  try {
    const { data, error } = await supabase
      .from('documents')
      .insert({
        trip_id: input.trip_id,
        category: input.category,
        file_name: input.file.name,
        storage_path,
        uploaded_by,
      })
      .select()
      .single()
    if (error) throw error
    return data as Document
  } catch (e) {
    // 中繼資料寫入失敗 → 清掉已上傳檔（best-effort，清不掉也不掩蓋原始錯誤）
    await storage.remove(storage_path).catch(() => {})
    throw e
  }
}

// ---- 備忘錄（功能 6）：kind='note'、無 storage_path，內文存 content ----

export interface CreateNoteInput {
  trip_id: string
  category: DocumentCategory
  title: string
  content: string
}

export async function createNote(input: CreateNoteInput): Promise<Document> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const uploaded_by = session?.user.id ?? null

  const { data, error } = await supabase
    .from('documents')
    .insert({
      trip_id: input.trip_id,
      category: input.category,
      kind: 'note',
      file_name: input.title,
      storage_path: null,
      content: input.content,
      uploaded_by,
    })
    .select()
    .single()
  if (error) throw error
  return data as Document
}

export async function updateNote(
  id: string,
  patch: { title?: string; content?: string },
): Promise<Document> {
  const update: Record<string, string> = {}
  if (patch.title !== undefined) update.file_name = patch.title
  if (patch.content !== undefined) update.content = patch.content
  const { data, error } = await supabase
    .from('documents')
    .update(update)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Document
}

// 更新文件中繼資料（改顯示名稱 / 改分類）。file_name 為顯示名、與 storage key（uuid）分離，
// 故改名只動 DB、不搬 storage 物件；改分類只是換 documents.category。檔案與備忘錄皆適用。
export async function updateDocument(
  id: string,
  patch: { file_name?: string; category?: DocumentCategory },
): Promise<Document> {
  const update: Record<string, string> = {}
  if (patch.file_name !== undefined) update.file_name = patch.file_name
  if (patch.category !== undefined) update.category = patch.category
  const { data, error } = await supabase
    .from('documents')
    .update(update)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Document
}

// 刪除文件：先刪 DB 列（避免留下指向已消失檔案的破列），再 best-effort 清 storage。
// 備忘錄無 storage_path，跳過 storage 刪除。離線快取由呼叫端在成功後一併移除（見 documentView / docCache）。
export async function removeDocument(doc: Pick<Document, 'id' | 'storage_path'>): Promise<void> {
  const { error } = await supabase.from('documents').delete().eq('id', doc.id)
  if (error) throw error
  if (doc.storage_path) await storage.remove(doc.storage_path).catch(() => {})
}
