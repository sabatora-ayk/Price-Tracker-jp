import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

// フロントエンド用クライアント（公開可能キー使用）
export const supabase = createClient(supabaseUrl, supabasePublishableKey)

// 型定義
export type PriceRecord = {
  id: string
  item_code: string
  item_name: string
  price: number
  unit: string
  recorded_at: string
  source: string
  dependency_country: string | null
  created_at: string
}
