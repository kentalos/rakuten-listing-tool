/**
 * LP採点比較ページ
 * 複数商品のLP採点結果を比較表示する
 */
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LPScore } from '@/lib/lp-scorer'
import Link from 'next/link'

interface SavedScore {
  overallScore: number
  scores: Array<{
    category: string
    score: number
    feedback: string
  }>
  improvements: string[]
  imageAnalysis?: Array<{
    imageUrl: string
    analysis: string
    suggestions: string[]
    score: number
  }>
  item: {
    name: string
    url: string
    price: number
    shop: string
    image?: string
  }
  timestamp: string
}

export default function LPComparison() {
  const [savedScores, setSavedScores] = useState<Record<string, SavedScore>>({})
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  // ローカルストレージから採点結果を読み込み
  useEffect(() => {
    const scores = JSON.parse(localStorage.getItem('lpScores') || '{}')
    setSavedScores(scores)
  }, [])

  // 選択アイテムの切り替え
  const toggleSelection = (itemUrl: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemUrl)) {
        newSet.delete(itemUrl)
      } else {
        newSet.add(itemUrl)
      }
      return newSet
    })
  }

  // 全選択/全解除
  const toggleSelectAll = () => {
    if (selectedItems.size === Object.keys(savedScores).length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(Object.keys(savedScores)))
    }
  }

  // 採点結果をクリア
  const clearScores = () => {
    if (confirm('すべての採点結果を削除しますか？')) {
      localStorage.removeItem('lpScores')
      setSavedScores({})
      setSelectedItems(new Set())
    }
  }

  const scoreEntries = Object.entries(savedScores)
  const selectedScores = scoreEntries.filter(([url]) => selectedItems.has(url))

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-7xl">
        {/* ヘッダー */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                LP採点比較
              </h1>
              <p className="text-gray-600">
                複数商品のLP採点結果を比較して分析できます
              </p>
            </div>
            <div className="flex space-x-2">
              <Link href="/">
                <Button variant="outline">
                  ← 楽天検索に戻る
                </Button>
              </Link>
              <Link href="/lp-scorer">
                <Button variant="outline">
                  LP採点器 →
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {scoreEntries.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-gray-500 text-lg mb-4">
                まだLP採点結果がありません
              </p>
              <p className="text-gray-400 text-sm mb-6">
                楽天商品検索で商品のLP採点を実行してください
              </p>
              <Link href="/">
                <Button>
                  楽天商品検索に戻る
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 操作パネル */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>比較設定</CardTitle>
                <CardDescription>
                  比較したい商品を選択してください（{scoreEntries.length}件の採点結果）
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleSelectAll}
                    >
                      {selectedItems.size === scoreEntries.length ? '全解除' : '全選択'}
                    </Button>
                    <span className="text-sm text-gray-600">
                      {selectedItems.size}件選択中
                    </span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={clearScores}
                  >
                    すべて削除
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 商品一覧 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {scoreEntries.map(([url, score]) => (
                <Card 
                  key={url} 
                  className={`cursor-pointer transition-all ${
                    selectedItems.has(url) 
                      ? 'ring-2 ring-blue-500 bg-blue-50' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => toggleSelection(url)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      {score.item.image && (
                        <img
                          src={score.item.image}
                          alt={score.item.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                          {score.item.name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {score.item.shop}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-red-600">
                            ¥{score.item.price.toLocaleString()}
                          </span>
                          <span className="text-blue-600 font-bold">
                            {score.overallScore}/5.0
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(score.timestamp).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 比較結果 */}
            {selectedScores.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>比較結果</CardTitle>
                  <CardDescription>
                    選択した{selectedScores.length}件の商品のLP採点結果を比較
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* 総合スコア比較 */}
                  <div className="mb-6">
                    <h3 className="font-semibold mb-3">総合スコア比較</h3>
                    <div className="space-y-2">
                      {selectedScores
                        .sort(([,a], [,b]) => b.overallScore - a.overallScore)
                        .map(([url, score], index) => (
                          <div key={url} className="flex items-center space-x-3">
                            <span className="text-sm font-medium w-8">
                              #{index + 1}
                            </span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium truncate">
                                  {score.item.name}
                                </span>
                                <span className="text-blue-600 font-bold">
                                  {score.overallScore}/5.0
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${(score.overallScore / 5) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* 詳細スコア比較 */}
                  <div className="mb-6">
                    <h3 className="font-semibold mb-3">詳細スコア比較</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">評価項目</th>
                            {selectedScores.map(([url, score]) => (
                              <th key={url} className="text-center p-2 min-w-[120px]">
                                <div className="truncate" title={score.item.name}>
                                  {score.item.name.substring(0, 15)}...
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {selectedScores[0]?.[1].scores.map((_, categoryIndex) => {
                            const categoryName = selectedScores[0][1].scores[categoryIndex].category
                            return (
                              <tr key={categoryIndex} className="border-b">
                                <td className="p-2 font-medium">{categoryName}</td>
                                {selectedScores.map(([url, score]) => (
                                  <td key={url} className="text-center p-2">
                                    <span className="font-bold">
                                      {score.scores[categoryIndex]?.score || 0}/5
                                    </span>
                                  </td>
                                ))}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 改善提案比較 */}
                  <div className="mb-6">
                    <h3 className="font-semibold mb-3">改善提案</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedScores.map(([url, score]) => (
                        <div key={url} className="border rounded p-3">
                          <h4 className="font-medium text-sm mb-2 truncate">
                            {score.item.name}
                          </h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {score.improvements.map((improvement, index) => (
                              <li key={index} className="flex items-start">
                                <span className="text-blue-500 mr-2">•</span>
                                <span>{improvement}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 画像分析比較 */}
                  {selectedScores.some(([, score]) => score.imageAnalysis && score.imageAnalysis.length > 0) && (
                    <div>
                      <h3 className="font-semibold mb-3">画像分析比較</h3>
                      <div className="space-y-4">
                        {selectedScores.map(([url, score]) => (
                          score.imageAnalysis && score.imageAnalysis.length > 0 && (
                            <div key={url} className="border rounded p-4">
                              <h4 className="font-medium text-sm mb-3 truncate">
                                {score.item.name} - 画像分析結果 ({score.imageAnalysis.length}枚)
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {score.imageAnalysis.map((imageAnalysis, index) => (
                                  <div key={index} className="bg-gray-50 rounded p-3">
                                    <div className="flex items-start space-x-3 mb-2">
                                      <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                                        <img
                                          src={imageAnalysis.imageUrl}
                                          alt={`画像${index + 1}`}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement
                                            target.style.display = 'none'
                                          }}
                                        />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-xs font-medium text-gray-700">
                                            画像 {index + 1}
                                          </span>
                                          <span className="text-xs font-bold text-blue-600">
                                            {imageAnalysis.score}/5
                                          </span>
                                        </div>
                                        <p className="text-xs text-gray-600 line-clamp-2">
                                          {imageAnalysis.analysis}
                                        </p>
                                      </div>
                                    </div>
                                    {imageAnalysis.suggestions.length > 0 && (
                                      <div className="mt-2">
                                        <p className="text-xs font-medium text-gray-700 mb-1">改善提案:</p>
                                        <ul className="text-xs text-gray-600 space-y-1">
                                          {imageAnalysis.suggestions.slice(0, 2).map((suggestion, suggestionIndex) => (
                                            <li key={suggestionIndex} className="flex items-start">
                                              <span className="text-blue-500 mr-1">•</span>
                                              <span className="line-clamp-2">{suggestion}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}