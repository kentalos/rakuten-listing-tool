import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  LPInputSchema, 
  LPScoreSchema, 
  SYSTEM_PROMPT, 
  generateUserPrompt,
  type LPInput,
  type LPScore
} from '@/lib/lp-scorer';

// Gemini APIクライアントの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    // リクエストボディの取得と検証
    const body = await request.json();
    const validatedInput = LPInputSchema.parse(body);

    // Gemini APIを使用してLP採点を実行
    const score = await callGeminiAPI(validatedInput);

    // レスポンスの検証
    const validatedResponse = LPScoreSchema.parse(score);

    return NextResponse.json(validatedResponse);

  } catch (error) {
    console.error('LP採点エラー:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { 
          error: '入力データの形式が正しくありません',
          details: error.message 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'LP採点中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// Gemini APIを使用してLP採点を実行する関数
async function callGeminiAPI(lpData: LPInput): Promise<LPScore> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const systemPrompt = SYSTEM_PROMPT;
  const userPrompt = generateUserPrompt(lpData);

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: systemPrompt + "\n\n" + userPrompt }
          ]
        }
      ]
    });

    const response = await result.response;
    const text = response.text();

    // JSONの抽出（```json ブロックがある場合に対応）
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;

    const parsedResponse = JSON.parse(jsonText);
    
    // スキーマに合わせて変換
    return {
      overallScore: parsedResponse.overallScore,
      scores: parsedResponse.scores,
      improvements: parsedResponse.improvements,
      imageAnalysis: parsedResponse.imageAnalysis || []
    };

  } catch (error) {
    console.error('Gemini API呼び出しエラー:', error);
    throw new Error('LP採点の実行中にエラーが発生しました');
  }
}