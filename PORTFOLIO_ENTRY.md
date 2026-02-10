> ## 5. 💻 My Bucket Editor (Team Project / Personal Project)
> ElectronとReactベースのリアルタイム共同コードエディタ
> - **開発期間**：2026.01 ~ 2026.02
> - **役割**： 個人開発。Electronのプロセス間通信(IPC)設計、Yjsを用いたCRDT同期ロジックの実装、Monaco Editorの統合、セキュリティ機能(2FA)の実装
> - **仕様** <br>
>    **Desktop App**
>    - **Language** : TypeScript, React, HTML/CSS
>    - **Skill** : Electron, Yjs (CRDT), Monaco Editor, Socket.io, Node.js, Cloudflare Tunnel, localtunnel
> 
>    **対応機能**<br>
>    - リアルタイムコード同期（Yjs + WebSockets）
>    - ホスト・ゲスト接続システム（ngrok, Cloudflare Tunnel, localtunnelを用いたセキュアトンネリング）
>    - 2要素認証（TOTP）によるセキュリティ強化
>    - 統合ターミナルおよびファイルシステムアクセス
>    - Monaco Editorによるシンタックスハイライト・自動補完
>    - 自動バックアップシステム
>
> - **主な技術的工夫** :
>   - **CRDT(Yjs)によるコンフリクトフリーな同期**：中央サーバーレスでP2Pに近い形態でのデータ整合性を維持し、ネットワーク遅延に強い編集体験を実現
>   - **Electron Window Focus問題の解決**：`blur/focus`サイクルを用いたフォーカス復元ロジック（`refocusWindow`）を独自実装し、ネイティブダイアログ後の入力不可問題を解決
>   - **セキュアなトンネリング統合**：`ngrok`に加え、`Cloudflare Tunnel`と`localtunnel`を統合し、ユーザー環境に応じた柔軟かつセキュアな外部公開オプションを提供
>   - **堅牢なプロセス間通信**：Main/Rendererプロセス間のIPC通信を型安全（Type-safe）に設計し、保守性を向上
> - [My Bucket EditorのReadme](https://github.com/yourusername/my-bucket-editor)
