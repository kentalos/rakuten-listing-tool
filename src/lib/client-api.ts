/**
 * 静的エクスポート用のクライアントサイドAPI関数
 * GitHub Pagesでは直接外部APIを呼び出します
 */

import { ApiItem, RakutenApiResponseSchema, transformRakutenItem } from './rakuten';
import { LPInput, LPScore } from './lp-scorer';

// 環境変数の取得
const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true';
const rakutenAppId = process.env.NEXT_PUBLIC_RAKUTEN_APP_ID;
const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

/**
 * 楽天商品検索（クライアントサイド）
 */
export async function searchRakutenProducts(query: string): Promise<{ items: ApiItem[], total: number }> {
  if (!isStaticExport) {
    // 開発環境では従来のAPIルートを使用
    const response = await fetch(`/api/rakuten?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    return response.json();
  }

  // 静的エクスポート環境では直接楽天APIを呼び出し
  if (!rakutenAppId || rakutenAppId === 'your-rakuten-app-id-here') {
    throw new Error('楽天アプリケーションIDが設定されていません');
  }

  const rakutenApiUrl = new URL('https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601');
  rakutenApiUrl.searchParams.set('format', 'json');
  rakutenApiUrl.searchParams.set('keyword', query);
  rakutenApiUrl.searchParams.set('applicationId', rakutenAppId);
  rakutenApiUrl.searchParams.set('hits', '20');
  rakutenApiUrl.searchParams.set('sort', '-reviewCount');

  const response = await fetch(rakutenApiUrl.toString(), {
    method: 'GET',
    headers: {
      'User-Agent': 'EC-Tool-Template/1.0',
    },
  });

  if (!response.ok) {
    throw new Error('楽天APIからのデータ取得に失敗しました');
  }

  const data = await response.json();
  const validatedData = RakutenApiResponseSchema.parse(data);
  const items = validatedData.Items.map(item => transformRakutenItem(item.Item));

  return {
    items,
    total: items.length,
  };
}

/**
 * LP採点（クライアントサイド）
 */
export async function scoreLandingPage(lpData: LPInput): Promise<LPScore> {
  if (!isStaticExport) {
    // 開発環境では従来のAPIルートを使用
    const response = await fetch('/api/lp-scorer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(lpData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'LP採点に失敗しました');
    }

    return response.json();
  }

  // 静的エクスポート環境では直接Gemini APIを呼び出し
  if (!geminiApiKey || geminiApiKey === 'your-gemini-api-key-here') {
    throw new Error('Gemini APIキーが設定されていません');
  }

  // Gemini APIの呼び出し（簡略版）
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `以下のランディングページを採点してください。JSON形式で回答してください。

タイトル: ${lpData.title}
見出し: ${lpData.headings.join(', ')}
本文: ${lpData.body}
価格: ${lpData.price_texts.join(', ')}
CTA: ${lpData.cta_texts.join(', ')}

以下の形式で回答してください：
{
  "overallScore": 85,
  "scores": {
    "headline": 80,
    "value_proposition": 85,
    "social_proof": 75,
    "cta": 90,
    "design": 80
  },
  "improvements": [
    "見出しをより魅力的にする",
    "価格の根拠を明確にする"
  ],
  "imageAnalysis": []
}`
        }]
      }]
    }),
  });

  if (!response.ok) {
    throw new Error('LP採点に失敗しました');
  }

  const result = await response.json();
  const text = result.candidates[0].content.parts[0].text;
  
  // JSONの抽出
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('採点結果の解析に失敗しました');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * 商品詳細スクレイピング（クライアントサイド）
 * 注意: 静的エクスポートではCORSの制限により使用できません
 */
export async function scrapeProductDetails(productUrl: string): Promise<any> {
  if (!isStaticExport) {
    // 開発環境では従来のAPIルートを使用
    const response = await fetch('/api/scrape-product', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productUrl }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'スクレイピングに失敗しました');
    }

    return response.json();
  }

  // 静的エクスポートではスクレイピング機能は使用できません
  throw new Error('静的エクスポート環境ではスクレイピング機能は使用できません');
}