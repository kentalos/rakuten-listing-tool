/**
 * ヘルスチェックAPI
 * アプリケーションの稼働状況を確認するためのエンドポイント
 */
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // 基本的なヘルスチェック
    return NextResponse.json({ 
      ok: true,
      timestamp: new Date().toISOString(),
      status: 'healthy'
    })
  } catch (error) {
    // エラーハンドリング
    return NextResponse.json(
      { 
        ok: false, 
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}