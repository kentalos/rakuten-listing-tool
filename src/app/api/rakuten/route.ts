import { NextRequest, NextResponse } from 'next/server';
import { 
  RakutenApiResponseSchema, 
  transformRakutenItem, 
  transformRakutenItemWithScraping,
  rateLimiter,
  ApiResponseSchema 
} from '@/lib/rakuten';

export async function GET(request: NextRequest) {
  try {
    // レートリミットチェック
    await rateLimiter.checkLimit();

    // クエリパラメータの取得
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const enableScraping = searchParams.get('scraping') === 'true';

    if (!query) {
      return NextResponse.json(
        { error: 'クエリパラメータ "q" が必要です' },
        { status: 400 }
      );
    }

    // 環境変数の確認
    const appId = process.env.RAKUTEN_APP_ID;
    if (!appId || appId === 'your-rakuten-app-id-here') {
      return NextResponse.json(
        { 
          error: 'RAKUTEN_APP_IDが正しく設定されていません。.env.localファイルで実際の楽天アプリケーションIDを設定してください。',
          details: '楽天デベロッパーサイト（https://webservice.rakuten.co.jp/）でアプリケーションIDを取得できます。'
        },
        { status: 500 }
      );
    }

    // 楽天APIのURL構築
    const rakutenApiUrl = new URL('https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601');
    rakutenApiUrl.searchParams.set('format', 'json');
    rakutenApiUrl.searchParams.set('keyword', query);
    rakutenApiUrl.searchParams.set('applicationId', appId);
    rakutenApiUrl.searchParams.set('hits', '20'); // 取得件数
    rakutenApiUrl.searchParams.set('sort', '-reviewCount'); // レビュー数順（降順）

    // デバッグ用：リクエストURLをログ出力
    console.log('楽天API リクエストURL:', rakutenApiUrl.toString());

    // 楽天APIを呼び出し
    const response = await fetch(rakutenApiUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'EC-Tool-Template/1.0',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('楽天API エラー:', response.status, response.statusText);
      console.error('楽天API エラー詳細:', errorText);
      return NextResponse.json(
        { error: '楽天APIからのデータ取得に失敗しました' },
        { status: 502 }
      );
    }

    const data = await response.json();

    // レスポンスの検証
    const validatedData = RakutenApiResponseSchema.parse(data);

    // データの変換（スクレイピング機能の有無で分岐）
    let items;
    if (enableScraping) {
      console.log('スクレイピング機能を有効にして商品データを変換中...');
      // 並列処理でスクレイピングを実行（ただし、レートリミットを考慮して制限）
      const itemPromises = validatedData.Items.slice(0, 5).map(async (item, index) => {
        // スクレイピングの間隔を空ける
        await new Promise(resolve => setTimeout(resolve, index * 500));
        return transformRakutenItemWithScraping(item.Item);
      });
      
      // 残りのアイテムは通常の変換
      const remainingItems = validatedData.Items.slice(5).map(item => transformRakutenItem(item.Item));
      
      const scrapedItems = await Promise.all(itemPromises);
      items = [...scrapedItems, ...remainingItems];
    } else {
      items = validatedData.Items.map(item => transformRakutenItem(item.Item));
    }

    // レスポンスの構築
    const apiResponse = {
      items,
      total: items.length,
    };

    // レスポンススキーマの検証
    const validatedResponse = ApiResponseSchema.parse(apiResponse);

    return NextResponse.json(validatedResponse);

  } catch (error) {
    console.error('楽天API呼び出しエラー:', error);

    // エラーの種類に応じたレスポンス
    if (error instanceof Error) {
      if (error.message.includes('楽天API呼び出しエラー')) {
        return NextResponse.json(
          { error: '楽天APIからのデータ取得に失敗しました' },
          { status: 502 }
        );
      }
      
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { error: 'APIレスポンスの形式が不正です' },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(
      { error: '内部サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}