#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
楽天商品ページスクレイピングスクリプト
商品の詳細情報、画像、レビューなどを収集
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import time
import sys
from urllib.parse import urljoin, urlparse
from fake_useragent import UserAgent
import logging

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RakutenScraper:
    def __init__(self):
        self.session = requests.Session()
        self.ua = UserAgent()
        self.session.headers.update({
            'User-Agent': self.ua.random,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        })
    
    def scrape_product(self, product_url):
        """
        楽天商品ページから詳細情報をスクレイピング
        """
        try:
            logger.info(f"スクレイピング開始: {product_url}")
            
            # ページを取得
            response = self.session.get(product_url, timeout=30)
            response.raise_for_status()
            
            # エンコーディングを自動検出（楽天はShift_JISが多い）
            if response.encoding == 'ISO-8859-1' or not response.encoding:
                # chardetで自動検出を試行
                try:
                    import chardet
                    detected = chardet.detect(response.content)
                    if detected['encoding']:
                        response.encoding = detected['encoding']
                    else:
                        response.encoding = 'shift_jis'  # 楽天のデフォルト
                except ImportError:
                    response.encoding = 'shift_jis'  # chardetがない場合のフォールバック
            
            soup = BeautifulSoup(response.text, 'lxml')
            
            # 商品情報を抽出
            product_data = {
                'url': product_url,
                'title': self._extract_title(soup),
                'price': self._extract_price(soup),
                'description': self._extract_description(soup),
                'images': self._extract_images(soup, product_url),
                'reviews': self._extract_reviews(soup),
                'specifications': self._extract_specifications(soup),
                'shop_info': self._extract_shop_info(soup),
                'breadcrumbs': self._extract_breadcrumbs(soup),
                'features': self._extract_features(soup),
                'cta_buttons': self._extract_cta_buttons(soup)
            }
            
            logger.info("スクレイピング完了")
            return product_data
            
        except Exception as e:
            logger.error(f"スクレイピングエラー: {str(e)}")
            return None
    
    def _extract_title(self, soup):
        """商品タイトルを抽出"""
        selectors = [
            'h1.item_name',
            'h1[data-testid="item-name"]',
            '.item_name h1',
            'h1.product-title',
            'h1',
            '.product-name h1',
            '[data-testid="item-name"]'
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                return element.get_text(strip=True)
        
        # titleタグからフォールバック
        title_tag = soup.find('title')
        if title_tag:
            title = title_tag.get_text(strip=True)
            # 楽天市場の文字を除去
            title = re.sub(r'【楽天市場】|楽天市場', '', title).strip()
            return title
        
        return ""
    
    def _extract_price(self, soup):
        """価格情報を抽出"""
        price_info = {
            'current_price': '',
            'original_price': '',
            'discount_rate': '',
            'price_text': ''
        }
        
        # 現在価格
        price_selectors = [
            '.price_value',
            '.price-value',
            '[data-testid="price"]',
            '.item_price .price',
            '.price .number',
            '.price-current',
            '.sale-price'
        ]
        
        for selector in price_selectors:
            element = soup.select_one(selector)
            if element:
                price_text = element.get_text(strip=True)
                price_info['current_price'] = price_text
                price_info['price_text'] = price_text
                break
        
        # 元価格（割引前）
        original_selectors = [
            '.price_original',
            '.original-price',
            '.price-before',
            '.regular-price'
        ]
        
        for selector in original_selectors:
            element = soup.select_one(selector)
            if element:
                price_info['original_price'] = element.get_text(strip=True)
                break
        
        # 割引率
        discount_selectors = [
            '.discount_rate',
            '.discount-rate',
            '.sale-rate'
        ]
        
        for selector in discount_selectors:
            element = soup.select_one(selector)
            if element:
                price_info['discount_rate'] = element.get_text(strip=True)
                break
        
        return price_info
    
    def _extract_description(self, soup):
        """商品説明を抽出"""
        description_parts = []
        
        # 商品説明の候補セレクタ
        desc_selectors = [
            '.item_desc',
            '.product-description',
            '.item-description',
            '.description',
            '.product-detail',
            '.item-detail'
        ]
        
        for selector in desc_selectors:
            elements = soup.select(selector)
            for element in elements:
                text = element.get_text(separator='\n', strip=True)
                if text and len(text) > 50:  # 十分な長さの説明のみ
                    description_parts.append(text)
        
        # 商品特徴やキャッチコピー
        feature_selectors = [
            '.item_catch',
            '.product-catch',
            '.catch-copy',
            '.feature-list li',
            '.product-features li'
        ]
        
        for selector in feature_selectors:
            elements = soup.select(selector)
            for element in elements:
                text = element.get_text(strip=True)
                if text:
                    description_parts.append(text)
        
        return '\n\n'.join(description_parts)
    
    def _extract_images(self, soup, base_url):
        """商品画像URLを抽出"""
        images = []
        
        # 画像セレクタ
        img_selectors = [
            '.item_image img',
            '.product-image img',
            '.item-photo img',
            '.gallery img',
            '.product-gallery img',
            '.item_img img',
            '[data-testid="item-image"] img'
        ]
        
        for selector in img_selectors:
            img_elements = soup.select(selector)
            for img in img_elements:
                src = img.get('src') or img.get('data-src') or img.get('data-lazy')
                if src:
                    # 相対URLを絶対URLに変換
                    full_url = urljoin(base_url, src)
                    # サムネイルではなく、より大きな画像を取得
                    full_url = self._get_larger_image_url(full_url)
                    if full_url not in images:
                        images.append(full_url)
        
        # 追加の画像検索（JavaScript生成画像など）
        script_tags = soup.find_all('script')
        for script in script_tags:
            if script.string:
                # 画像URLのパターンを検索
                img_urls = re.findall(r'https?://[^"\s]+\.(?:jpg|jpeg|png|gif|webp)', script.string)
                for url in img_urls:
                    if 'rakuten' in url and url not in images:
                        images.append(url)
        
        return images[:10]  # 最大10枚まで
    
    def _get_larger_image_url(self, img_url):
        """サムネイル画像をより大きなサイズに変換"""
        # 楽天の画像URLパターンを変換
        if 'thumbnail.image.rakuten.co.jp' in img_url:
            # サムネイルを大きなサイズに変換
            img_url = img_url.replace('?_ex=128x128', '?_ex=400x400')
            img_url = img_url.replace('?_ex=64x64', '?_ex=400x400')
            img_url = img_url.replace('?_ex=200x200', '?_ex=400x400')
        
        return img_url
    
    def _extract_reviews(self, soup):
        """レビュー情報を抽出（詳細分析対応）"""
        review_info = {
            'average_rating': '',
            'review_count': '',
            'rating_distribution': {},
            'reviews': [],
            'review_summary': {
                'positive_keywords': [],
                'negative_keywords': [],
                'common_themes': []
            }
        }
        
        # 平均評価
        rating_selectors = [
            '.review_average',
            '.rating-average',
            '.average-rating',
            '[data-testid="rating-average"]',
            '.rating-score',
            '.review-rating-average'
        ]
        
        for selector in rating_selectors:
            element = soup.select_one(selector)
            if element:
                review_info['average_rating'] = element.get_text(strip=True)
                break
        
        # レビュー数
        count_selectors = [
            '.review_count',
            '.review-count',
            '[data-testid="review-count"]',
            '.review-total-count',
            '.total-reviews'
        ]
        
        for selector in count_selectors:
            element = soup.select_one(selector)
            if element:
                review_info['review_count'] = element.get_text(strip=True)
                break
        
        # 評価分布（星の数ごとの件数）
        rating_dist_selectors = [
            '.rating-distribution',
            '.review-rating-breakdown',
            '.star-rating-breakdown'
        ]
        
        for selector in rating_dist_selectors:
            dist_element = soup.select_one(selector)
            if dist_element:
                for i in range(1, 6):
                    star_element = dist_element.select_one(f'[data-rating="{i}"], .star-{i}, .rating-{i}')
                    if star_element:
                        count_text = star_element.get_text(strip=True)
                        review_info['rating_distribution'][f'{i}star'] = count_text
                break
        
        # 個別レビュー（詳細情報付き）
        review_selectors = [
            '.review_item',
            '.review-item',
            '.user-review',
            '.review-content',
            '.customer-review'
        ]
        
        for selector in review_selectors:
            review_elements = soup.select(selector)[:10]  # 最大10件に増加
            for review in review_elements:
                review_data = {
                    'text': '',
                    'rating': '',
                    'date': '',
                    'helpful_count': ''
                }
                
                # レビューテキスト
                text_element = review.select_one('.review-text, .review-content, .comment-text')
                if text_element:
                    review_data['text'] = text_element.get_text(separator=' ', strip=True)
                else:
                    review_data['text'] = review.get_text(separator=' ', strip=True)
                
                # 評価（星の数）
                rating_element = review.select_one('.rating, .star-rating, .review-rating')
                if rating_element:
                    rating_text = rating_element.get_text(strip=True)
                    # 星の数を抽出
                    rating_match = re.search(r'(\d+)', rating_text)
                    if rating_match:
                        review_data['rating'] = rating_match.group(1)
                
                # 投稿日
                date_element = review.select_one('.review-date, .post-date, .date')
                if date_element:
                    review_data['date'] = date_element.get_text(strip=True)
                
                # 参考になった数
                helpful_element = review.select_one('.helpful-count, .useful-count')
                if helpful_element:
                    review_data['helpful_count'] = helpful_element.get_text(strip=True)
                
                if review_data['text']:
                    review_info['reviews'].append(review_data)
        
        # レビューの簡単な分析
        if review_info['reviews']:
            review_info['review_summary'] = self._analyze_reviews(review_info['reviews'])
        
        return review_info
    
    def _analyze_reviews(self, reviews):
        """レビューの簡単な分析を行う"""
        summary = {
            'positive_keywords': [],
            'negative_keywords': [],
            'common_themes': []
        }
        
        # ポジティブ・ネガティブキーワードの簡単な検出
        positive_words = ['良い', 'いい', '満足', '便利', '使いやすい', '安い', 'おすすめ', '快適', '丈夫', '綺麗']
        negative_words = ['悪い', '不満', '高い', '使いにくい', '壊れた', '期待外れ', '残念', '問題', '不具合']
        
        all_text = ' '.join([review['text'] for review in reviews if isinstance(review, dict)])
        
        for word in positive_words:
            if word in all_text:
                summary['positive_keywords'].append(word)
        
        for word in negative_words:
            if word in all_text:
                summary['negative_keywords'].append(word)
        
        # よく出現するテーマ（簡単な実装）
        common_phrases = ['配送', '梱包', '価格', '品質', 'サイズ', 'デザイン', '機能', 'サポート']
        for phrase in common_phrases:
            if phrase in all_text:
                summary['common_themes'].append(phrase)
        
        return summary
    
    def _extract_specifications(self, soup):
        """商品仕様を抽出"""
        specs = {}
        
        # 仕様表のセレクタ
        spec_selectors = [
            '.spec_table tr',
            '.specification tr',
            '.product-spec tr',
            '.item-spec tr'
        ]
        
        for selector in spec_selectors:
            rows = soup.select(selector)
            for row in rows:
                cells = row.find_all(['td', 'th'])
                if len(cells) >= 2:
                    key = cells[0].get_text(strip=True)
                    value = cells[1].get_text(strip=True)
                    if key and value:
                        specs[key] = value
        
        return specs
    
    def _extract_shop_info(self, soup):
        """ショップ情報を抽出"""
        shop_info = {
            'name': '',
            'rating': '',
            'url': ''
        }
        
        # ショップ名
        shop_selectors = [
            '.shop_name',
            '.shop-name',
            '.store-name',
            '[data-testid="shop-name"]'
        ]
        
        for selector in shop_selectors:
            element = soup.select_one(selector)
            if element:
                shop_info['name'] = element.get_text(strip=True)
                break
        
        return shop_info
    
    def _extract_breadcrumbs(self, soup):
        """パンくずリストを抽出"""
        breadcrumbs = []
        
        breadcrumb_selectors = [
            '.breadcrumb a',
            '.breadcrumbs a',
            '.navigation a'
        ]
        
        for selector in breadcrumb_selectors:
            elements = soup.select(selector)
            for element in elements:
                text = element.get_text(strip=True)
                if text:
                    breadcrumbs.append(text)
        
        return breadcrumbs
    
    def _extract_features(self, soup):
        """商品特徴・セールスポイントを抽出"""
        features = []
        
        feature_selectors = [
            '.feature_list li',
            '.product-features li',
            '.selling-points li',
            '.highlight li',
            '.benefits li'
        ]
        
        for selector in feature_selectors:
            elements = soup.select(selector)
            for element in elements:
                text = element.get_text(strip=True)
                if text:
                    features.append(text)
        
        return features
    
    def _extract_cta_buttons(self, soup):
        """CTA（行動喚起）ボタンを抽出"""
        cta_buttons = []
        
        button_selectors = [
            '.cart_button',
            '.add-to-cart',
            '.buy-button',
            '.purchase-button',
            '.order-button',
            'button[type="submit"]',
            '.btn-primary',
            '.btn-buy'
        ]
        
        for selector in button_selectors:
            elements = soup.select(selector)
            for element in elements:
                text = element.get_text(strip=True)
                if text and len(text) < 50:  # 短いテキストのみ
                    cta_buttons.append(text)
        
        return list(set(cta_buttons))  # 重複除去

def main():
    """メイン関数"""
    if len(sys.argv) != 2:
        error_output = json.dumps({"error": "商品URLが必要です"}, ensure_ascii=False)
        sys.stdout.buffer.write(error_output.encode('utf-8'))
        sys.stdout.buffer.flush()
        sys.exit(1)
    
    product_url = sys.argv[1]
    logger.info(f"スクレイピング開始: {product_url}")
    
    try:
        scraper = RakutenScraper()
        result = scraper.scrape_product(product_url)
        
        if result:
            logger.info("スクレイピング完了")
            # UTF-8エンコーディングで出力
            output = json.dumps(result, ensure_ascii=False, indent=2)
            sys.stdout.buffer.write(output.encode('utf-8'))
            sys.stdout.buffer.flush()
        else:
            error_output = json.dumps({"error": "スクレイピングに失敗しました"}, ensure_ascii=False)
            sys.stdout.buffer.write(error_output.encode('utf-8'))
            sys.stdout.buffer.flush()
            sys.exit(1)
    except Exception as e:
        logger.error(f"スクレイピングエラー: {e}")
        error_output = json.dumps({"error": str(e)}, ensure_ascii=False)
        sys.stdout.buffer.write(error_output.encode('utf-8'))
        sys.stdout.buffer.flush()
        sys.exit(1)

if __name__ == "__main__":
    main()