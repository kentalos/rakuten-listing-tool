import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
