import { z } from 'zod';
import { scrapeRakutenImages, mergeImages } from './scraper';

// 楽天APIのアイテム情報のスキーマ
export const RakutenItemSchema = z.object({
  itemName: z.string(),
  itemUrl: z.string().url(),
  itemPrice: z.number(),
  reviewCount: z.number(),
  reviewAverage: z.number().optional(), // レビュー平均点
  itemCaption: z.string().optional(), // 商品説明文
  catchcopy: z.string().optional(), // キャッチコピー
  mediumImageUrls: z.array(z.object({
    imageUrl: z.string().url()
  })).optional(),
  shopName: z.string(),
});

// 楽天APIのレスポンススキーマ
export const RakutenApiResponseSchema = z.object({
  Items: z.array(z.object({
    Item: RakutenItemSchema
  }))
});

// 我々のAPIが返すアイテム情報のスキーマ
export const ApiItemSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  price: z.number(),
  reviewCount: z.number(),
  reviewAverage: z.number().optional(), // レビュー平均点
  description: z.string().optional(), // 商品説明文
  catchcopy: z.string().optional(), // キャッチコピー
  image: z.string().url().optional(),
  images: z.array(z.string().url()).optional(), // 複数画像対応
  shop: z.string(),
});

// 我々のAPIレスポンススキーマ
export const ApiResponseSchema = z.object({
  items: z.array(ApiItemSchema),
  total: z.number(),
});

// TypeScript型の定義
export type RakutenItem = z.infer<typeof RakutenItemSchema>;
export type RakutenApiResponse = z.infer<typeof RakutenApiResponseSchema>;
export type ApiItem = z.infer<typeof ApiItemSchema>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;

// 楽天APIのアイテムを我々のAPIアイテム形式に変換する関数
export function transformRakutenItem(rakutenItem: RakutenItem): ApiItem {
  // 全ての画像URLを取得
  const allImages = rakutenItem.mediumImageUrls?.map(img => img.imageUrl) || [];
  
  return {
    name: rakutenItem.itemName,
    url: rakutenItem.itemUrl,
    price: rakutenItem.itemPrice,
    reviewCount: rakutenItem.reviewCount,
    reviewAverage: rakutenItem.reviewAverage,
    description: rakutenItem.itemCaption,
    catchcopy: rakutenItem.catchcopy,
    image: allImages[0], // 後方互換性のため最初の画像を保持
    images: allImages, // 全ての画像
    shop: rakutenItem.shopName,
  };
}

// スクレイピング機能を含む楽天APIアイテム変換関数
export async function transformRakutenItemWithScraping(rakutenItem: RakutenItem): Promise<ApiItem> {
  // 楽天APIから取得した画像
  const apiImages = rakutenItem.mediumImageUrls?.map(img => img.imageUrl) || [];
  
  // スクレイピングで追加画像を取得
  let allImages = apiImages;
  try {
    console.log(`商品ページをスクレイピング中: ${rakutenItem.itemName}`);
    const scrapedImages = await scrapeRakutenImages(rakutenItem.itemUrl);
    allImages = mergeImages(apiImages, scrapedImages);
    console.log(`画像取得完了: API ${apiImages.length}枚 + スクレイピング ${scrapedImages.length}枚 = 合計 ${allImages.length}枚`);
  } catch (error) {
    console.error('スクレイピングエラー:', error);
    // エラーが発生してもAPIの画像は使用
  }
  
  return {
    name: rakutenItem.itemName,
    url: rakutenItem.itemUrl,
    price: rakutenItem.itemPrice,
    reviewCount: rakutenItem.reviewCount,
    reviewAverage: rakutenItem.reviewAverage,
    description: rakutenItem.itemCaption,
    catchcopy: rakutenItem.catchcopy,
    image: allImages[0], // 後方互換性のため最初の画像を保持
    images: allImages, // 全ての画像（API + スクレイピング）
    shop: rakutenItem.shopName,
  };
}

// 簡易レートリミッター
class RateLimiter {
  private lastRequest = 0;
  private readonly interval = 1000; // 1秒

  async checkLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    
    if (timeSinceLastRequest < this.interval) {
      const waitTime = this.interval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequest = Date.now();
  }
}

export const rateLimiter = new RateLimiter();