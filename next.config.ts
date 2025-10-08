import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 静的エクスポート設定
  output: 'export',
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  distDir: 'dist',
  
  // GitHub Pagesのベースパス設定（リポジトリ名に合わせて調整）
  basePath: process.env.NODE_ENV === 'production' ? '/rakuten-listing-tool' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/rakuten-listing-tool/' : '',
  
  // 画像最適化を無効化（静的エクスポートでは使用不可）
  images: {
    unoptimized: true,
  },
  
  eslint: {
    // ESLintを完全に無効化
    ignoreDuringBuilds: true,
    // ESLintの実行を完全にスキップ
    dirs: [],
  },
  typescript: {
    // TypeScriptエラーも無視（必要に応じて）
    ignoreBuildErrors: false,
  },
  // 実験的機能でESLintを無効化
  experimental: {
    eslint: false,
  },
};

export default nextConfig;
