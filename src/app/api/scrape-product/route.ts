import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { productUrl } = await request.json();

    if (!productUrl) {
      return NextResponse.json(
        { error: '商品URLが必要です' },
        { status: 400 }
      );
    }

    // Pythonスクリプトのパスを設定
    const scriptPath = path.join(process.cwd(), 'scripts', 'rakuten_scraper.py');
    
    // Pythonスクリプトを実行
    const pythonProcess = spawn('python', [scriptPath, productUrl], {
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8'
      }
    });
    
    let outputBuffer = Buffer.alloc(0);
    let errorOutput = '';

    // 標準出力をバイナリで収集
    pythonProcess.stdout.on('data', (data) => {
      outputBuffer = Buffer.concat([outputBuffer, data]);
    });

    // エラー出力を収集
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString('utf-8');
    });

    // プロセス完了を待機
    const result = await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            // バッファをUTF-8でデコードしてからJSON解析
            const output = outputBuffer.toString('utf-8');
            const scrapedData = JSON.parse(output);
            resolve(scrapedData);
          } catch (parseError) {
            reject(new Error(`JSON解析エラー: ${parseError}`));
          }
        } else {
          reject(new Error(`Pythonスクリプトエラー (終了コード: ${code}): ${errorOutput}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`プロセス実行エラー: ${error.message}`));
      });

      // タイムアウト設定（30秒）
      setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('スクレイピングがタイムアウトしました'));
      }, 30000);
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('スクレイピングエラー:', error);
    
    return NextResponse.json(
      { 
        error: 'スクレイピング中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// GETメソッドでのテスト用エンドポイント
export async function GET() {
  return NextResponse.json({
    message: 'スクレイピングAPIエンドポイントが正常に動作しています',
    usage: 'POST /api/scrape-product with { "productUrl": "楽天商品URL" }'
  });
}