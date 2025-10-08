'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  type LPInput, 
  type LPScore, 
  getScoreColor,
  getScoreBgColor
} from '@/lib/lp-scorer'
import Link from 'next/link'

export default function LPScorerPage() {
  const searchParams = useSearchParams()
  const [lpData, setLpData] = useState<LPInput>({
    title: '',
    headings: [],
    body: '',
    images: [],
    price_texts: [],
    cta_texts: [],
  })
  const [detailedData, setDetailedData] = useState<any>(null)
  const [score, setScore] = useState<LPScore | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAutoFilled, setIsAutoFilled] = useState(false)

  // 自動入力機能
  useEffect(() => {
    const autoFill = searchParams.get('autoFill')
    const detailed = searchParams.get('detailed')
    if (autoFill === 'true') {
      try {
        const savedData = localStorage.getItem('autoFillLPData')
        if (savedData) {
          const parsedData = JSON.parse(savedData)
          setLpData(parsedData)
          setIsAutoFilled(true)
          
          // 詳細スクレイピングデータの場合は追加情報を保存
          if (detailed === 'true') {
            setDetailedData({
              reviews: parsedData.reviews || [],
              specifications: parsedData.specifications || {},
              shop_info: parsedData.shop_info || {}
            })
          }
          
          // 使用後はローカルストレージから削除
          localStorage.removeItem('autoFillLPData')
        }
      } catch (error) {
        console.error('自動入力データの読み込みに失敗しました:', error)
      }
    }
  }, [searchParams])

  // フォームの更新処理
  const updateField = (field: keyof LPInput, value: string | string[]) => {
    setLpData(prev => ({ ...prev, [field]: value }))
  }

  // 配列フィールドの文字列変換
  const arrayToString = (arr: string[]): string => arr.join('\n')
  const stringToArray = (str: string): string[] => 
    str.split('\n').map(s => s.trim()).filter(s => s.length > 0)

  // LP採点処理
  const handleScore = async () => {
    if (!lpData.title.trim()) {
      setError('タイトルを入力してください')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/lp-scorer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(lpData),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const scoreData = await response.json()
      setScore(scoreData)
    } catch (err) {
      console.error('採点エラー:', err)
      setError(err instanceof Error ? err.message : '採点中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  // リセット処理
  const handleReset = () => {
    setLpData({
      title: '',
      headings: [],
      body: '',
      images: [],
      price_texts: [],
      cta_texts: [],
    })
    setScore(null)
    setError(null)
  }

  // サンプルデータの設定
  const loadSampleData = () => {
    setLpData({
      title: '革新的なスマートウォッチ - 健康管理の新時代',
      headings: [
        '健康管理がこれ一つで完結',
        '24時間心拍数モニタリング',
        '防水設計で安心',
        'お客様の声',
        'よくある質問'
      ],
      body: 'このスマートウォッチは、最新のセンサー技術を搭載し、あなたの健康状態を24時間監視します。心拍数、血圧、睡眠の質まで、すべてのデータをリアルタイムで追跡。防水設計なので、運動中や入浴時も安心してご利用いただけます。',
      images: [
        'https://example.com/smartwatch-main.jpg',
        'https://example.com/smartwatch-features.jpg',
        'https://example.com/smartwatch-lifestyle.jpg'
      ],
      price_texts: ['特別価格 29,800円', '通常価格 39,800円から10,000円OFF'],
      cta_texts: ['今すぐ購入する', '詳細を見る', 'カートに追加'],
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-6xl">
        {/* ヘッダー */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                LP採点器
              </h1>
              <p className="text-gray-600">
                ランディングページの主要要素を0-5点で採点し、改善案を提案します
              </p>
            </div>
            <Link href="/">
              <Button variant="outline">
                ← 楽天検索に戻る
              </Button>
            </Link>
          </div>
        </header>

        {/* 自動入力メッセージ */}
        {isAutoFilled && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <span className="text-green-600">✅</span>
                <span className="text-green-700">
                  {detailedData ? 
                    '楽天商品の詳細情報がスクレイピングされ自動入力されました。レビューや仕様情報も含まれています。' :
                    '楽天商品の情報が自動入力されました。必要に応じて編集してから採点してください。'
                  }
                </span>
              </div>
              {detailedData && (
                <div className="mt-3 text-sm text-green-600">
                  <div className="grid grid-cols-2 gap-2">
                    {detailedData.reviews?.length > 0 && (
                      <div>📝 レビュー: {detailedData.reviews.length}件</div>
                    )}
                    {Object.keys(detailedData.specifications || {}).length > 0 && (
                      <div>📋 仕様情報: {Object.keys(detailedData.specifications).length}項目</div>
                    )}
                    {detailedData.shop_info?.name && (
                      <div>🏪 ショップ: {detailedData.shop_info.name}</div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 入力フォーム */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>LP情報入力</CardTitle>
                <CardDescription>
                  採点したいランディングページの情報を入力してください
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    ページタイトル *
                  </label>
                  <Input
                    placeholder="例: 革新的なスマートウォッチ - 健康管理の新時代"
                    value={lpData.title}
                    onChange={(e) => updateField('title', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    見出し（h要素）
                  </label>
                  <Textarea
                    placeholder="見出しを1行ずつ入力してください&#10;例:&#10;健康管理がこれ一つで完結&#10;24時間心拍数モニタリング"
                    value={arrayToString(lpData.headings)}
                    onChange={(e) => updateField('headings', stringToArray(e.target.value))}
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    本文テキスト（一部）
                  </label>
                  <Textarea
                    placeholder="ページの主要な本文テキストを入力してください"
                    value={lpData.body}
                    onChange={(e) => updateField('body', e.target.value)}
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    画像URL
                  </label>
                  <Textarea
                    placeholder="画像URLを1行ずつ入力してください&#10;例:&#10;https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                    value={arrayToString(lpData.images)}
                    onChange={(e) => updateField('images', stringToArray(e.target.value))}
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    価格表示テキスト
                  </label>
                  <Textarea
                    placeholder="価格に関するテキストを1行ずつ入力してください&#10;例:&#10;特別価格 29,800円&#10;通常価格 39,800円から10,000円OFF"
                    value={arrayToString(lpData.price_texts)}
                    onChange={(e) => updateField('price_texts', stringToArray(e.target.value))}
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    CTA（行動喚起）テキスト
                  </label>
                  <Textarea
                    placeholder="CTAボタンやリンクのテキストを1行ずつ入力してください&#10;例:&#10;今すぐ購入する&#10;詳細を見る"
                    value={arrayToString(lpData.cta_texts)}
                    onChange={(e) => updateField('cta_texts', stringToArray(e.target.value))}
                    rows={3}
                  />
                </div>

                <div className="flex space-x-2">
                  <Button 
                    onClick={handleScore} 
                    disabled={isLoading || !lpData.title.trim()}
                    className="flex-1"
                  >
                    {isLoading ? '採点中...' : 'LP採点を実行'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={loadSampleData}
                  >
                    サンプル
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleReset}
                  >
                    リセット
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 採点結果 */}
          <div className="space-y-6">
            {error && (
              <Card className="border-red-200">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2 text-red-600">
                    <span>⚠️</span>
                    <span>{error}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {isLoading && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p>LP採点中...</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {score && (
              <>
                {/* 総合スコア */}
                <Card>
                  <CardHeader>
                    <CardTitle>総合スコア</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-blue-600 mb-2">
                        {score.overallScore}/5.0
                      </div>
                      <p className="text-gray-600">
                        Gemini AIによる専門的な分析結果
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* 詳細スコア */}
                <Card>
                  <CardHeader>
                    <CardTitle>詳細スコア</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {score.scores.map((item, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{item.category}</span>
                            <span className={`px-2 py-1 rounded text-sm font-medium ${getScoreBgColor(item.score)} ${getScoreColor(item.score)}`}>
                              {item.score}/5
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{item.feedback}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* 画像分析結果 */}
                {score.imageAnalysis && score.imageAnalysis.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>画像分析結果</CardTitle>
                      <CardDescription>
                        各画像の詳細な分析とフィードバック（画像をクリックで拡大表示）
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {score.imageAnalysis.map((imageData, index) => (
                          <div key={index} className="border rounded-lg p-4 bg-gray-50">
                            <div className="flex items-start gap-6">
                              {/* 画像プレビュー */}
                              <div className="flex-shrink-0">
                                <a 
                                  href={imageData.imageUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="block hover:opacity-80 transition-opacity cursor-pointer"
                                  title="クリックして画像を新しいタブで開く"
                                >
                                  <img 
                                    src={imageData.imageUrl} 
                                    alt={`分析対象画像 ${index + 1}`}
                                    className="w-32 h-32 object-cover rounded-lg border shadow-md hover:shadow-lg transition-shadow"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                    }}
                                  />
                                </a>
                                <div className="mt-3 text-center">
                                  <Badge 
                                    variant="outline" 
                                    className={`${getScoreBgColor(imageData.score)} ${getScoreColor(imageData.score)}`}
                                  >
                                    {imageData.score}/5
                                  </Badge>
                                </div>
                                <div className="mt-2 text-center">
                                  <span className="text-xs text-gray-500">
                                    🔗 クリックで拡大
                                  </span>
                                </div>
                              </div>
                              
                              {/* 分析内容 */}
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900 mb-2">
                                  画像 {index + 1}
                                </h4>
                                <p className="text-sm text-gray-600 mb-3">
                                  {imageData.analysis}
                                </p>
                                
                                {/* 改善提案 */}
                                {imageData.suggestions && imageData.suggestions.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-medium text-gray-700 mb-1">
                                      改善提案:
                                    </h5>
                                    <ul className="text-sm text-gray-600 space-y-1">
                                      {imageData.suggestions.map((suggestion, suggestionIndex) => (
                                        <li key={suggestionIndex} className="flex items-start gap-1">
                                          <span className="text-blue-500">•</span>
                                          <span>{suggestion}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* 画像URL（参考用） */}
                            <div className="mt-4 pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-400 break-all">
                                URL: 
                                <a 
                                  href={imageData.imageUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="ml-1 text-blue-500 hover:text-blue-700 underline"
                                >
                                  {imageData.imageUrl}
                                </a>
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* レビュー分析結果 */}
                {detailedData && detailedData.reviews && detailedData.reviews.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>レビュー分析結果</CardTitle>
                      <CardDescription>
                        スクレイピングしたレビューの詳細分析
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {/* レビュー概要 */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-blue-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {detailedData.reviews.find(r => r.average_rating)?.average_rating || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-600">平均評価</div>
                          </div>
                          <div className="bg-green-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {detailedData.reviews.find(r => r.review_count)?.review_count || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-600">レビュー数</div>
                          </div>
                          <div className="bg-purple-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-purple-600">
                              {detailedData.reviews.filter(r => r.reviews && r.reviews.length > 0).reduce((acc, r) => acc + r.reviews.length, 0)}
                            </div>
                            <div className="text-sm text-gray-600">取得レビュー</div>
                          </div>
                        </div>

                        {/* レビュー分析サマリー */}
                        {detailedData.reviews.some(r => r.review_summary) && (
                          <div className="space-y-4">
                            <h4 className="font-medium text-gray-900">レビュー分析サマリー</h4>
                            {detailedData.reviews.map((reviewData, index) => (
                              reviewData.review_summary && (
                                <div key={index} className="bg-gray-50 p-4 rounded-lg">
                                  {/* ポジティブキーワード */}
                                  {reviewData.review_summary.positive_keywords && reviewData.review_summary.positive_keywords.length > 0 && (
                                    <div className="mb-3">
                                      <h5 className="text-sm font-medium text-green-700 mb-2">
                                        ポジティブキーワード:
                                      </h5>
                                      <div className="flex flex-wrap gap-1">
                                        {reviewData.review_summary.positive_keywords.map((keyword, idx) => (
                                          <Badge key={idx} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                            {keyword}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* ネガティブキーワード */}
                                  {reviewData.review_summary.negative_keywords && reviewData.review_summary.negative_keywords.length > 0 && (
                                    <div className="mb-3">
                                      <h5 className="text-sm font-medium text-red-700 mb-2">
                                        ネガティブキーワード:
                                      </h5>
                                      <div className="flex flex-wrap gap-1">
                                        {reviewData.review_summary.negative_keywords.map((keyword, idx) => (
                                          <Badge key={idx} variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                            {keyword}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* 共通テーマ */}
                                  {reviewData.review_summary.common_themes && reviewData.review_summary.common_themes.length > 0 && (
                                    <div>
                                      <h5 className="text-sm font-medium text-blue-700 mb-2">
                                        共通テーマ:
                                      </h5>
                                      <div className="flex flex-wrap gap-1">
                                        {reviewData.review_summary.common_themes.map((theme, idx) => (
                                          <Badge key={idx} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                            {theme}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            ))}
                          </div>
                        )}

                        {/* 個別レビュー */}
                        <div className="space-y-4">
                          <h4 className="font-medium text-gray-900">個別レビュー</h4>
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {detailedData.reviews.map((reviewData, reviewIndex) => (
                              reviewData.reviews && reviewData.reviews.map((review, index) => (
                                <div key={`${reviewIndex}-${index}`} className="border rounded-lg p-3 bg-white">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      {review.rating && (
                                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                          ⭐ {review.rating}
                                        </Badge>
                                      )}
                                      {review.date && (
                                        <span className="text-xs text-gray-500">{review.date}</span>
                                      )}
                                    </div>
                                    {review.helpful_count && (
                                      <span className="text-xs text-gray-500">
                                        👍 {review.helpful_count}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    {review.text}
                                  </p>
                                </div>
                              ))
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 改善提案 */}
                <Card>
                  <CardHeader>
                    <CardTitle>改善提案</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {score.improvements.map((improvement, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-blue-600 font-bold">{index + 1}.</span>
                          <span>{improvement}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </>
            )}

            {!score && !isLoading && !error && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-gray-500">
                    <p>LP情報を入力して「LP採点を実行」ボタンを押してください</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* フッター */}
        <footer className="mt-12 text-center text-sm text-gray-500">
          <p>LP採点器 - EC向けコンバージョン最適化ツール</p>
        </footer>
      </div>
    </div>
  )
}