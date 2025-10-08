/**
 * メインページ
 * 楽天リスティング比較ミニ
 * 楽天商品検索フォームと結果表示エリアを含む
 */
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiItem } from '@/lib/rakuten'
import { LPScore } from '@/lib/lp-scorer'
import Link from 'next/link'

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('猫 爪とぎ')
  const [searchResults, setSearchResults] = useState<ApiItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalResults, setTotalResults] = useState(0)
  const [lpScores, setLpScores] = useState<Record<string, LPScore>>({})
  const [scoringItems, setScoringItems] = useState<Set<string>>(new Set())
  const [scrapingItems, setScrapingItems] = useState<Set<string>>(new Set())

  // 検索処理
  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/rakuten?q=${encodeURIComponent(searchQuery)}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      setSearchResults(data.items)
      setTotalResults(data.total)
    } catch (err) {
      console.error('検索エラー:', err)
      setError(err instanceof Error ? err.message : '検索中にエラーが発生しました')
      setSearchResults([])
      setTotalResults(0)
    } finally {
      setIsLoading(false)
    }
  }

  // リトライ処理
  const handleRetry = () => {
    handleSearch()
  }

  // LP採点器への遷移処理
  const handleGoToScorer = (item: ApiItem) => {
    // 商品データをローカルストレージに保存
    const lpData = {
      title: item.name,
      headings: [item.name, ...(item.catchcopy ? [item.catchcopy] : [])],
      body: [
        item.name,
        item.catchcopy || '',
        item.description || '',
        `${item.shop}の商品です。`,
        `価格: ¥${item.price.toLocaleString()}`,
        item.reviewAverage ? `レビュー平均: ${item.reviewAverage}点` : '',
        item.reviewCount ? `レビュー数: ${item.reviewCount}件` : ''
      ].filter(text => text.trim()).join('\n\n'),
      images: item.images && item.images.length > 0 ? item.images : (item.image ? [item.image] : []),
      price_texts: [`¥${item.price.toLocaleString()}`],
      cta_texts: ['商品を見る', '購入する', 'カートに入れる'],
    }
    
    localStorage.setItem('autoFillLPData', JSON.stringify(lpData))
    
    // LP採点器ページに遷移（同じタブで）
    window.location.href = '/lp-scorer?autoFill=true'
  }

  // LP採点処理
  const handleLPScore = async (item: ApiItem) => {
    const itemKey = item.url
    setScoringItems(prev => new Set(prev).add(itemKey))

    try {
      // 商品URLからLP情報を抽出（詳細版）
      const lpData = {
        title: item.name,
        headings: [item.name, ...(item.catchcopy ? [item.catchcopy] : [])],
        body: [
          item.name,
          item.catchcopy || '',
          item.description || '',
          `${item.shop}の商品です。`,
          `価格: ¥${item.price.toLocaleString()}`,
          item.reviewAverage ? `レビュー平均: ${item.reviewAverage}点` : '',
          item.reviewCount ? `レビュー数: ${item.reviewCount}件` : ''
        ].filter(text => text.trim()).join('\n\n'),
        images: item.images && item.images.length > 0 ? item.images : (item.image ? [item.image] : []),
        price_texts: [`¥${item.price.toLocaleString()}`],
        cta_texts: ['商品を見る', '購入する', 'カートに入れる'],
      }

      const response = await fetch('/api/lp-scorer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(lpData),
      })

      if (!response.ok) {
        throw new Error('LP採点に失敗しました')
      }

      const score = await response.json()
      setLpScores(prev => ({
        ...prev,
        [itemKey]: score
      }))

      // ローカルストレージに保存
      const savedScores = JSON.parse(localStorage.getItem('lpScores') || '{}')
      savedScores[itemKey] = {
        ...score,
        item: {
          name: item.name,
          url: item.url,
          price: item.price,
          shop: item.shop,
          image: item.image
        },
        timestamp: new Date().toISOString()
      }
      localStorage.setItem('lpScores', JSON.stringify(savedScores))

    } catch (error) {
      console.error('LP採点エラー:', error)
      alert('LP採点中にエラーが発生しました')
    } finally {
      setScoringItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemKey)
        return newSet
      })
    }
  }

  // 詳細スクレイピング処理
  const handleDetailedScraping = async (item: ApiItem) => {
    const itemKey = item.url
    setScrapingItems(prev => new Set(prev).add(itemKey))

    try {
      const response = await fetch('/api/scrape-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productUrl: item.url }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'スクレイピングに失敗しました')
      }

      const result = await response.json()
      
      if (result.success && result.data) {
        // スクレイピングした詳細データでLP採点器に遷移
        const detailedLpData = {
          title: result.data.title || item.name,
          headings: result.data.headings || [item.name],
          body: result.data.description || item.description || '',
          images: result.data.images || (item.image ? [item.image] : []),
          price_texts: result.data.price_texts || [`¥${item.price.toLocaleString()}`],
          cta_texts: result.data.cta_texts || ['商品を見る', '購入する'],
          reviews: result.data.reviews || [],
          specifications: result.data.specifications || {},
          shop_info: result.data.shop_info || { name: item.shop }
        }
        
        localStorage.setItem('autoFillLPData', JSON.stringify(detailedLpData))
        
        // LP採点器ページに遷移
        window.location.href = '/lp-scorer?autoFill=true&detailed=true'
      } else {
        throw new Error('スクレイピングデータの取得に失敗しました')
      }

    } catch (error) {
      console.error('詳細スクレイピングエラー:', error)
      alert(`詳細スクレイピング中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setScrapingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemKey)
        return newSet
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-7xl">
        {/* ヘッダー */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="text-center flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                楽天市場商品リスティング比較ツール
              </h1>
              <p className="text-gray-600">
                楽天市場の商品を検索・分析して比較できるツール
              </p>
            </div>
            <div className="flex space-x-2">
              <Link href="/lp-scorer">
                <Button variant="outline">
                  LP採点器 →
                </Button>
              </Link>
              <Link href="/lp-comparison">
                <Button variant="outline">
                  LP比較 →
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* 検索フォーム */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>商品検索</CardTitle>
            <CardDescription>
              楽天市場から商品を検索します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                type="text"
                placeholder="検索キーワードを入力..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button 
                onClick={handleSearch}
                disabled={isLoading || !searchQuery.trim()}
              >
                {isLoading ? '検索中...' : '検索'}
              </Button>
            </div>
            
            {/* 検索オプション */}
            <div className="text-sm text-gray-500">
              <p>💡 ヒント: より具体的なキーワードで検索すると、より良い結果が得られます</p>
            </div>
          </CardContent>
        </Card>

        {/* エラー表示 */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-red-600">⚠️</span>
                  <span className="text-red-700">{error}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRetry}
                  disabled={isLoading}
                >
                  リトライ
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 検索結果ヘッダー */}
        {(searchResults.length > 0 || isLoading) && (
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              検索結果
              {totalResults > 0 && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  （{totalResults}件中 {searchResults.length}件を表示）
                </span>
              )}
            </h2>
          </div>
        )}

        {/* ローディング表示 */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <span className="ml-3 text-gray-600">検索中...</span>
          </div>
        )}

        {/* 検索結果グリッド */}
        {!isLoading && searchResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {searchResults.map((item, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square relative bg-gray-100">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      画像なし
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm line-clamp-2 mb-2 min-h-[2.5rem]">
                    {item.name}
                  </h3>
                  <div className="space-y-2">
                    <p className="text-lg font-bold text-red-600">
                      ¥{item.price.toLocaleString()}
                    </p>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>レビュー: {item.reviewCount}件</span>
                      <span className="truncate ml-2">{item.shop}</span>
                    </div>
                    
                    {/* LP採点結果表示 */}
                    {lpScores[item.url] && (
                      <div className="bg-blue-50 p-2 rounded text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">LP採点結果</span>
                          <span className="text-blue-600 font-bold">
                            {lpScores[item.url].overallScore}/5.0
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {lpScores[item.url].scores.slice(0, 2).map((score, idx) => (
                            <div key={idx}>
                              {score.category}: {score.score}/5
                            </div>
                          ))}
                        </div>
                        
                        {/* 画像分析結果 */}
                        {lpScores[item.url].imageAnalysis && lpScores[item.url].imageAnalysis.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-blue-200">
                            <div className="text-xs font-medium text-gray-700 mb-2">
                              画像分析 ({lpScores[item.url].imageAnalysis.length}枚)
                            </div>
                            <div className="space-y-2">
                              {lpScores[item.url].imageAnalysis.slice(0, 2).map((imageAnalysis, idx) => (
                                <div key={idx} className="space-y-1">
                                  <div className="w-full h-16 bg-gray-200 rounded overflow-hidden">
                                    <img
                                      src={imageAnalysis.imageUrl}
                                      alt={`画像${idx + 1}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement
                                        target.style.display = 'none'
                                      }}
                                    />
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    スコア: {imageAnalysis.score}/5 | {imageAnalysis.feedback}
                                  </div>
                                </div>
                              ))}
                              {lpScores[item.url].imageAnalysis.length > 2 && (
                                <div className="text-xs text-gray-500">
                                  他{lpScores[item.url].imageAnalysis.length - 2}枚...
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <div className="flex space-x-2">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1"
                        >
                          <Button variant="outline" size="sm" className="w-full">
                            商品を見る
                          </Button>
                        </a>
                        <Button 
                          variant="default" 
                          size="sm" 
                          onClick={() => handleDetailedScraping(item)}
                          disabled={scrapingItems.has(item.url)}
                          className="flex-1"
                        >
                          {scrapingItems.has(item.url) ? '🔍 分析中...' : '🔍 LP採点器'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 検索結果なし */}
        {!isLoading && !error && searchResults.length === 0 && totalResults === 0 && searchQuery && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">「{searchQuery}」の検索結果が見つかりませんでした</p>
            <p className="text-gray-400 text-sm mt-2">別のキーワードで検索してみてください</p>
          </div>
        )}

        {/* 初期状態 */}
        {!isLoading && !error && searchResults.length === 0 && !searchQuery && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">検索キーワードを入力して商品を探してみましょう</p>
            <p className="text-gray-400 text-sm mt-2">例: 猫 爪とぎ</p>
          </div>
        )}

        {/* フッター */}
        <footer className="mt-12 text-center text-sm text-gray-500">
          <p>楽天市場商品リスティング比較ツール - Next.js + TypeScript + 楽天API</p>
        </footer>
      </div>
    </div>
  )
}
