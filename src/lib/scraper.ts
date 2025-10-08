import * as cheerio from 'cheerio';

/**
 * 楽天商品ページから画像URLを抽出する関数
 * @param itemUrl 楽天商品ページのURL
 * @returns 抽出された画像URLの配列
 */
export async function scrapeRakutenImages(itemUrl: string): Promise<string[]> {
  try {
    console.log('スクレイピング開始:', itemUrl);
    
    // 楽天商品ページを取得
    const response = await fetch(itemUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!response.ok) {
      console.error('ページの取得に失敗:', response.status, response.statusText);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const imageUrls: string[] = [];
    const seenUrls = new Set<string>();

    // 楽天商品ページの画像を抽出する複数のセレクタ
    const imageSelectors = [
      // メイン商品画像
      '.item-image img',
      '.item-main-image img',
      '.main-image img',
      '.product-image img',
      '.item-photo img',
      
      // サムネイル画像
      '.item-thumbnail img',
      '.thumbnail img',
      '.sub-image img',
      '.item-sub-image img',
      
      // 商品詳細画像
      '.item-detail img',
      '.product-detail img',
      '.item-description img',
      '.description img',
      
      // 一般的な画像セレクタ
      'img[src*="item.rakuten.co.jp"]',
      'img[src*="image.rakuten.co.jp"]',
      'img[src*="shop.r10s.jp"]',
      'img[src*="thumbnail.image.rakuten.co.jp"]',
      
      // より広範囲な画像検索
      'img[alt*="商品"]',
      'img[alt*="画像"]',
      'img[data-src*="rakuten"]',
      'img[data-original*="rakuten"]',
    ];

    // 各セレクタで画像を検索
    imageSelectors.forEach(selector => {
      $(selector).each((_, element) => {
        const $img = $(element);
        let src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-original');
        
        if (src) {
          // 相対URLを絶対URLに変換
          if (src.startsWith('//')) {
            src = 'https:' + src;
          } else if (src.startsWith('/')) {
            const baseUrl = new URL(itemUrl);
            src = baseUrl.origin + src;
          }
          
          // 有効な画像URLかチェック
          if (isValidImageUrl(src) && !seenUrls.has(src)) {
            seenUrls.add(src);
            imageUrls.push(src);
          }
        }
      });
    });

    // 画像URLを品質順にソート（大きい画像を優先）
    const sortedImages = imageUrls.sort((a, b) => {
      const scoreA = getImageQualityScore(a);
      const scoreB = getImageQualityScore(b);
      return scoreB - scoreA;
    });

    console.log(`スクレイピング完了: ${sortedImages.length}枚の画像を取得`);
    return sortedImages;

  } catch (error) {
    console.error('スクレイピングエラー:', error);
    return [];
  }
}

/**
 * 有効な画像URLかどうかをチェック
 */
function isValidImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // 楽天関連のドメインかチェック
    const validDomains = [
      'item.rakuten.co.jp',
      'image.rakuten.co.jp',
      'shop.r10s.jp',
      'thumbnail.image.rakuten.co.jp',
      'tshop.r10s.jp',
      'shop-pro.jp'
    ];
    
    const isRakutenDomain = validDomains.some(domain => 
      urlObj.hostname.includes(domain)
    );
    
    // 画像ファイルの拡張子をチェック
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const hasImageExtension = imageExtensions.some(ext => 
      urlObj.pathname.toLowerCase().includes(ext)
    );
    
    // 除外すべきパターン
    const excludePatterns = [
      'icon',
      'button',
      'banner',
      'logo',
      'spacer',
      'blank',
      '1x1',
      'pixel',
      'tracking'
    ];
    
    const shouldExclude = excludePatterns.some(pattern => 
      url.toLowerCase().includes(pattern)
    );
    
    return isRakutenDomain && hasImageExtension && !shouldExclude;
    
  } catch {
    return false;
  }
}

/**
 * 画像の品質スコアを計算（大きい画像ほど高スコア）
 */
function getImageQualityScore(url: string): number {
  let score = 0;
  
  // サイズ指定がある場合のスコア
  if (url.includes('_ex')) score += 100; // 特大画像
  else if (url.includes('_l')) score += 80; // 大画像
  else if (url.includes('_m')) score += 60; // 中画像
  else if (url.includes('_s')) score += 40; // 小画像
  else if (url.includes('_t')) score += 20; // サムネイル
  
  // 数値でサイズが指定されている場合
  const sizeMatch = url.match(/(\d+)x(\d+)/);
  if (sizeMatch) {
    const width = parseInt(sizeMatch[1]);
    const height = parseInt(sizeMatch[2]);
    score += Math.min(width * height / 1000, 100);
  }
  
  // メイン画像っぽいパターン
  if (url.includes('main')) score += 50;
  if (url.includes('01') || url.includes('_1')) score += 30;
  
  return score;
}

/**
 * 楽天APIの画像とスクレイピングした画像をマージする
 */
export function mergeImages(apiImages: string[], scrapedImages: string[]): string[] {
  const allImages = [...apiImages];
  const seenUrls = new Set(apiImages);
  
  // スクレイピングした画像を追加（重複を除く）
  scrapedImages.forEach(url => {
    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      allImages.push(url);
    }
  });
  
  return allImages;
}