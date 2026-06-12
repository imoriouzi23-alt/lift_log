# LIFT LOG 🏋️

種目別の最高1RMを主役にした筋トレ記録アプリ（PWA）。

## 機能
- 種目別の最高1RM表示（PR更新バッジ・前回比）
- セット単位の記録・Epley式1RM自動計算
- 種目のカスタム追加・削除
- 目標RM設定＋達成お祝い画面（紙吹雪）
- 体組成記録（体重・体脂肪率・筋肉量）と推移グラフ
- カレンダーでトレ日を可視化
- データはブラウザに保存（localStorage）
- ホーム画面に追加でアプリ化

---

## PCでのデプロイ手順（推奨）

### 1. ローカルで動作確認
```bash
npm install
npm run dev
```
→ ブラウザで http://localhost:5173 が開く。動けばOK。

### 2. ビルドが通るか確認
```bash
npm run build
```
→ エラーなく `dist/` が生成されればデプロイ可能。

### 3. GitHubにpush
```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/＜ユーザー名＞/lift-log.git
git push -u origin main
```

### 4. Vercelでデプロイ
1. vercel.com に GitHub でログイン
2. Add New → Project → lift-log を Import
3. Framework は自動で「Vite」が選ばれる。設定そのままで Deploy
4. 1〜2分でURL発行

### 5. ホーム画面に追加
発行URLをスマホで開く：
- iPhone(Safari): 共有 → ホーム画面に追加
- Android(Chrome): メニュー → ホーム画面に追加

---

## 構成
```
lift-log/
├─ index.html
├─ package.json
├─ vite.config.js
├─ src/
│  ├─ main.jsx
│  └─ App.jsx
└─ public/
   ├─ manifest.json
   ├─ favicon.svg
   ├─ icon-192.png
   └─ icon-512.png
```

## トラブルシューティング
- **ビルドで「Rollup failed to resolve import "/src/main.jsx"」**
  → src/ フォルダが正しくアップされていない。フォルダ構造を保つこと。
- **Vercelで Root Directory を聞かれたら** `./`（デフォルト）のままでOK。
