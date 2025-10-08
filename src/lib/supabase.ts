/**
 * Supabaseクライアントの設定
 * データベース接続とAPIアクセスを管理
 */
import { createClient } from '@supabase/supabase-js'

// 環境変数からSupabaseの設定を取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Supabaseクライアントを作成
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 型安全性のための基本的な型定義
export type Database = {
  // 必要に応じてテーブル定義を追加
}