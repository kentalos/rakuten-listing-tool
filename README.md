# EC向け小型ツール

Next.js + TypeScript + shadcn/ui + Supabase + Vercelで構築されたEC向け小型ツールの雛形です。

## 🚀 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **UIコンポーネント**: shadcn/ui
- **データベース**: Supabase (PostgreSQL)
- **デプロイ**: Vercel
- **パッケージマネージャー**: pnpm

## 📦 セットアップ手順

### 1. 依存関係のインストール

```bash
# pnpmを使用（推奨）
pnpm install

# または npm
npm install

# または yarn
yarn install
```

### 2. 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```env
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. 開発サーバーの起動

```bash
pnpm dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションを確認できます。

## 🔧 利用可能なスクリプト

```bash
# 開発サーバー起動
pnpm dev

# 本番ビルド
pnpm build

# 本番サーバー起動
pnpm start

# 型チェック
pnpm type-check

# Lintチェック
pnpm lint

# Lint修正
pnpm lint:fix
```

## 📁 プロジェクト構造

```
ec-tool-template/
├── src/
│   ├── app/                    # App Router ページ
│   │   ├── api/               # API ルート
│   │   │   └── health/        # ヘルスチェックAPI
│   │   ├── globals.css        # グローバルスタイル
│   │   ├── layout.tsx         # ルートレイアウト
│   │   └── page.tsx           # メインページ
│   ├── components/            # Reactコンポーネント
│   │   └── ui/               # shadcn/ui コンポーネント
│   └── lib/                  # ユーティリティ
│       ├── supabase.ts       # Supabase クライアント
│       └── utils.ts          # 共通ユーティリティ
├── .env.local                # 環境変数（ローカル）
├── vercel.json              # Vercel設定
└── README.md                # このファイル
```

## 🌐 API エンドポイント

### ヘルスチェック
- **URL**: `/api/health`
- **メソッド**: GET
- **レスポンス**: `{ ok: true, timestamp: string, status: string }`

## 🚀 デプロイ手順

### Vercelでのデプロイ

1. Vercelアカウントにログイン
2. GitHubリポジトリと連携
3. 環境変数を設定：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. デプロイ実行

```bash
# Vercel CLIを使用する場合
npx vercel
```

## 🔒 環境変数一覧

| 変数名 | 説明 | 必須 | 例 |
|--------|------|------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトURL | ✅ | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase匿名キー | ✅ | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

## ✅ セルフチェック項目

デプロイ前に以下の項目を確認してください：

### ビルドチェック
```bash
pnpm build
```
- ✅ エラーなくビルドが完了する
- ✅ TypeScriptの型エラーがない

### 型チェック
```bash
pnpm type-check
```
- ✅ 型エラーがない

### Lintチェック
```bash
pnpm lint
```
- ✅ ESLintエラーがない

### 動作確認
```bash
pnpm start
```
- ✅ `http://localhost:3000` でアプリケーションが表示される
- ✅ 検索フォームが動作する
- ✅ `/api/health` エンドポイントが正常にレスポンスを返す

## 🎨 UI/UX 特徴

- **レスポンシブデザイン**: デスクトップでは2カラム、モバイルでは1カラムレイアウト
- **モダンUI**: shadcn/uiによる美しいコンポーネント
- **アクセシビリティ**: キーボードナビゲーション対応
- **ローディング状態**: 検索中のフィードバック表示

## 🔧 カスタマイズ

### 新しいページの追加
`src/app/` ディレクトリに新しいフォルダとファイルを作成してください。

### 新しいAPIエンドポイントの追加
`src/app/api/` ディレクトリに新しいフォルダと `route.ts` ファイルを作成してください。

### UIコンポーネントの追加
```bash
pnpm dlx shadcn@latest add [component-name]
```

## 📝 ライセンス

MIT License

## 🤝 コントリビューション

プルリクエストやイシューの報告を歓迎します。

---

**注意**: 本番環境では必ず実際のSupabaseプロジェクトの認証情報を使用してください。
