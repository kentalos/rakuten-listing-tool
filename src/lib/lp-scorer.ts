import { z } from 'zod';

// LP情報の入力スキーマ
export const LPInputSchema = z.object({
  title: z.string().describe('ページタイトル'),
  headings: z.array(z.string()).describe('h要素の配列'),
  body: z.string().describe('本文テキスト一部'),
  images: z.array(z.string()).describe('画像URL配列'),
  price_texts: z.array(z.string()).describe('価格らしき文字の配列'),
  cta_texts: z.array(z.string()).describe('CTAらしき文字の配列'),
});

// スコアの型定義（0-5の整数）
const ScoreSchema = z.number().int().min(0).max(5);

// 採点結果のスキーマ（Gemini API形式）
export const LPScoreSchema = z.object({
  overallScore: z.number().min(1).max(5).describe('総合スコア'),
  scores: z.array(z.object({
    category: z.string().describe('評価観点名'),
    score: z.number().min(1).max(5).describe('スコア'),
    feedback: z.string().describe('具体的なフィードバック'),
  })),
  improvements: z.array(z.string()).describe('改善提案'),
  imageAnalysis: z.array(z.object({
    imageUrl: z.string().describe('画像URL'),
    analysis: z.string().describe('画像の分析結果'),
    suggestions: z.array(z.string()).describe('画像に対する改善提案'),
    score: z.number().min(1).max(5).describe('画像の評価スコア'),
  })).describe('画像ごとの分析結果'),
});

// TypeScript型の生成
export type LPInput = z.infer<typeof LPInputSchema>;
export type LPScore = z.infer<typeof LPScoreSchema>;



// LLM用のシステムプロンプト
export const SYSTEM_PROMPT = `あなたはEC領域のコンバージョン最適化専門家です。
楽天市場などのECサイトの商品ページ情報を基に、ランディングページ（LP）として以下の観点で分析し、1-5点のスコアと具体的なフィードバックを提供してください。

評価観点：
1. 訴求軸の明確さ - 商品名、キャッチコピー、商品説明文から読み取れる価値提案の明確性
2. 信頼要素 - レビュー評価、レビュー数、ショップ情報などの信頼性向上要素
3. 不安払拭 - 商品説明の詳細さ、返品保証、サポート体制の記載など
4. CTAの明瞭さ - 購入ボタンや行動喚起の分かりやすさ
5. 画像の情報価値 - 商品理解を促進する画像の質、数、配置
6. 読みやすさ・構成 - 商品情報の整理と視覚的な見やすさ
7. 価格訴求力 - 価格表示の明確さと競争力、お得感の演出

出力は必ず以下のJSON形式で返してください：
{
  "overallScore": 総合スコア(1-5の数値),
  "scores": [
    {
      "category": "評価観点名",
      "score": スコア(1-5の数値),
      "feedback": "具体的なフィードバック（200文字以内）"
    }
  ],
  "improvements": ["改善提案1", "改善提案2", "改善提案3"],
  "imageAnalysis": [
    {
      "imageUrl": "画像URL",
      "analysis": "画像の分析結果（どのような画像か、効果的な点、問題点など）",
      "suggestions": ["画像に対する改善提案1", "改善提案2"],
      "score": 画像の評価スコア(1-5の数値)
    }
  ]
}

日本語で回答し、実用的で具体的なアドバイスを心がけてください。`;

// LLM用のユーザープロンプトを生成する関数
export function generateUserPrompt(lpData: LPInput): string {
  return `以下の楽天商品ページ情報をランディングページとして分析してください：

【商品基本情報】
商品名: ${lpData.title}
見出し・キャッチコピー: ${lpData.headings.join(', ')}
商品説明文・詳細情報: ${lpData.body}
価格表示: ${lpData.price_texts.join(', ')}
CTAテキスト: ${lpData.cta_texts.join(', ')}

【商品画像情報】
画像URL: ${lpData.images.join(', ')}
※商品画像数: ${lpData.images.length}個

【分析要求】
上記の楽天商品情報を基に、7つの評価観点（訴求軸の明確さ、信頼要素、不安払拭、CTAの明瞭さ、画像の情報価値、読みやすさ・構成、価格訴求力）で分析し、
各項目のスコア（1-5点）、具体的なフィードバック、総合スコア、改善提案を含むJSONを返してください。

特に以下の点に注目して分析してください：
- 商品名とキャッチコピーから読み取れる価値提案の明確性
- レビュー評価やショップ情報による信頼性
- 商品説明文の詳細さと購入不安の解消度
- 購入ボタンや行動喚起の効果性
- 商品理解を促進する画像の質と情報価値
- 商品情報の整理と視覚的な分かりやすさ
- 価格表示の明確さとお得感の演出

【商品画像分析について】
各商品画像URLについて、以下の観点で個別に分析してください：
- 画像の内容と目的（メイン商品画像、詳細画像、使用シーンなど）
- 商品理解とコンバージョンへの貢献度
- 視覚的な魅力と商品の魅力伝達力
- ECサイトでの効果的な画像活用の観点からの改善提案
- 1-5点での評価スコア

画像が存在しない場合は、imageAnalysisは空配列[]で返してください。`;
}

// スコアの色を取得する関数
export function getScoreColor(score: number): string {
  if (score >= 4) return 'text-green-600';
  if (score >= 3) return 'text-yellow-600';
  if (score >= 2) return 'text-orange-600';
  return 'text-red-600';
}

// スコアの背景色を取得する関数
export function getScoreBgColor(score: number): string {
  if (score >= 4) return 'bg-green-100';
  if (score >= 3) return 'bg-yellow-100';
  if (score >= 2) return 'bg-orange-100';
  return 'bg-red-100';
}