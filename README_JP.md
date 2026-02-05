# 🪣 My Bucket Editor

> **Electron & React ベースの安全なリアルタイム共同コードエディタ**

My Bucket Editorは、開発者がローカルフォルダをホストし、リアルタイムでコードの共同編集を行うことができる強力なデスクトップアプリケーションです。ネイティブアプリのパフォーマンスとクラウドベースのコラボレーションツールの柔軟性を兼ね備えています。

---

## 📸 スクリーンショット

*(ここにスクリーンショットを追加してください)*
> **設定画面**
>
> *(画像プレースホルダー)*

> **エディタ画面**
>
> *(画像プレースホルダー)*

---

## ✨ 主な機能

### 🚀 リアルタイム・コラボレーション (Real-time Collaboration)
- **ホスト＆ゲストモード**: 自分のプロジェクトをホストしたり、友人のセッションに簡単に参加できます。
- **CRDTベースの同期**: [Yjs](https://github.com/yjs/yjs)を採用し、競合のない完璧なリアルタイム同期を実現しています。
- **Monaco Editor**: VS Codeのような編集体験（シンタックスハイライト、IntelliSenseなど）を提供します。

### 🔒 強化されたセキュリティ (Enhanced Security)
- **2要素認証 (2FA)**: TOTP (Google Authenticator, Authyなど) を使用してセッションを安全に保護します。
- **ゲスト管理**: ホストはゲストの接続リクエストを直接承認または拒否できます。
- **セキュアトンネリング**: **ngrok** および **localtunnel** を内蔵し、ローカルサーバーを外部と安全に共有できます。

### 🛠️ 開発者ツール
- **ターミナル統合**: エディタ内で直接コマンドを実行できます。
- **ファイルシステムアクセス**: ローカルファイルシステムへの完全なアクセス権（ホストのみ）を提供します。
- **自動バックアップ**: データ損失を防ぐため、プロジェクトの状態を自動的にバックアップします。

---

## 🏁 始め方 (Getting Started)

### 必須要件
- Node.js (v16 以上推奨)
- npm または yarn

### インストール方法

1. **リポジトリのクローン (Clone)**
   ```bash
   git clone https://github.com/yourusername/my-bucket-editor.git
   cd my-bucket-editor
   ```

2. **依存関係のインストール**
   ```bash
   npm install
   ```

3. **アプリケーションの実行 (開発モード)**
   ```bash
   npm run dev
   ```

4. **プロダクションビルド**
   ```bash
   npm run build:win  # Windows用
   npm run build:mac  # macOS用
   ```

---

## 🏗️ 技術スタック (Tech Stack)

- **Core**: [Electron](https://www.electronjs.org/), [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Editor**: [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- **Collaboration**: [Yjs](https://github.com/yjs/yjs), [Socket.io](https://socket.io/)
- **Security**: `speakeasy` (TOTP), `qrcode`
- **Tunneling**: `ngrok`, `localtunnel`

---

## 🏆 My Bucket Editorだけのメリット

*   **ローカルファースト (Local-First)**: コードは自分のコンピュータに安全に保存されます。共有したいときだけ共有できます。
*   **セキュリティ重視の設計**: 2FAと詳細なゲスト管理機能により、不正アクセスを根本から遮断します。
*   **慣れ親しんだ体験**: VS Codeの使用経験があれば、誰でも簡単に適応できるMonaco Editorを使用しています。

---

## ⚠️ 既知の問題 (Known Issues)

*   **Electron フォーカスの問題**: Electronのウィンドウ管理の特性上、入力フォーム（特にモーダル）でフォーカスが当たらない場合があります。
    *   *注: フォーカス再設定（blur/focusサイクル）機能を実装して、この問題を緩和しました。*
*   **ビルドの同期**: 現在、ホストがビルド/実行を行う際、ゲストが作成中（まだ保存されていない）のコードが含まれてしまい、ビルドに失敗したり競合が発生する可能性があります。

---

## 🗺️ ロードマップ (Roadmap)

My Bucket Editorは継続的に進化しています。以下の機能が追加される予定です：

- [ ] **PR (Pull Request) システム**: ゲストが変更を提案し、ホストがレビュー後に反映するシステム。
- [ ] **ドラフト (Draft) モード**: ゲストの修正がホストに即時反映されず、ローカルにのみ一時保存される機能。
- [ ] **音声/ビデオチャット**: より良いペアプログラミングのための統合コミュニケーションツール。
- [ ] **プラグインシステム**: ユーザー定義の拡張による機能追加。

---

## 🤝 コントリビュート (Contributing)

貢献はいつでも大歓迎です！Pull Requestを送ってください。

## 📄 ライセンス (License)

このプロジェクトは [MIT License](LICENSE) の下でライセンスされています。
