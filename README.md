# 🪣 My Bucket Editor

> **Electron & React 기반의 안전한 실시간 협업 코드 에디터**

My Bucket Editor는 개발자들이 자신의 로컬 폴더를 안전하게 호스팅하며 실시간으로 코드를 협업할 수 있도록 지원하는 강력한 데스크탑 애플리케이션입니다. 네이티브 앱의 성능과 클라우드 협업 도구의 유연성을 결합했습니다.

[**JAPANESE README**](https://github.com/yohan020/my-bucket-editor/blob/main/README_JP.md)

---

## 📸 스크린샷
> **메인 화면**
> 
> <img width="600" height="400" alt="image" src="https://github.com/user-attachments/assets/d6966551-975d-496c-b22d-9d24b635c451" />


> **설정 화면**
>
> <img width="600" height="400" alt="image" src="https://github.com/user-attachments/assets/d97e7ab9-d315-42c1-a15f-6abb50d657e4" />


> **에디터 인터페이스**
>
> <img width="600" height="400" alt="image" src="https://github.com/user-attachments/assets/f2e244c6-8523-440d-9b2d-1d8ee5badbdc" />


---

## ✨ 핵심 기능

### 🚀 실시간 협업 (Real-time Collaboration)
- **호스트 & 게스트 모드**: 간편하게 내 프로젝트를 호스팅하거나 친구의 세션에 참여하세요.
- **CRDT 기반 동기화**: [Yjs](https://github.com/yjs/yjs)를 사용하여 충돌 없는 완벽한 실시간 동기화를 제공합니다.
- **Monaco Editor**: VS Code와 유사한 에디팅 경험(구문 강조, 자동 완성 등)을 제공합니다.

### 🔒 강력한 보안 (Enhanced Security)
- **2단계 인증 (2FA)**: TOTP(Google Authenticator, Authy 등)를 통해 세션을 안전하게 보호합니다.
- **게스트 관리**: 호스트가 게스트의 접속 요청을 직접 승인하거나 거절할 수 있습니다.
- **보안 터널링**: **cloudflare**, **ngrok** 및 **localtunnel**을 내장하여 로컬 서버를 외부와 안전하게 공유합니다.

### 🛠️ 개발자 도구
- **터미널 통합**: 에디터 내부에서 바로 명령어를 실행할 수 있습니다.
- **파일 시스템 접근**: 로컬 파일 시스템에 대한 완전한 접근 권한(호스트)을 제공합니다.
- **자동 백업**: 데이터 손실 방지를 위해 프로젝트 상태를 자동으로 백업합니다.

---

## 🏁 시작하기 (Getting Started)

### 필수 요구사항
- Node.js (v16 이상 권장)
- npm 또는 yarn

### 설치 방법

1. **저장소 클론 (Clone)**
   ```bash
   git clone https://github.com/yourusername/my-bucket-editor.git
   cd my-bucket-editor
   ```

2. **의존성 설치**
   ```bash
   npm install
   ```

3. **애플리케이션 실행 (개발 모드)**
   ```bash
   npm run dev
   ```

4. **프로덕션 빌드**
   ```bash
   npm run build:win  # 윈도우용
   npm run build:mac  # 맥용
   ```

---

## 🏗️ 기술 스택 (Tech Stack)

- **Core**: [Electron](https://www.electronjs.org/), [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Editor**: [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- **Collaboration**: [Yjs](https://github.com/yjs/yjs), [Socket.io](https://socket.io/)
- **Security**: `speakeasy` (TOTP), `qrcode`
- **Tunneling**: `ngrok`, `localtunnel`

---

## 🏆 My Bucket Editor만의 장점

*   **로컬 우선 (Local-First)**: 코드는 내 컴퓨터에 안전하게 저장됩니다. 공유하고 싶을 때만 공유하세요.
*   **보안 중심 설계**: 2FA와 세밀한 게스트 관리 기능으로 무단 접근을 원천 차단합니다.
*   **익숙한 경험**: VS Code 사용 경험이 있다면 누구나 쉽게 적응할 수 있는 Monaco Editor를 사용합니다.

---

## ⚠️ 알려진 문제 (Known Issues)

*   **Electron 포커스 이슈**: Electron의 윈도우 관리 특성상, 입력창(특히 모달)에서 포커스가 잡히지 않는 경우가 있습니다.
    *   *참고: 포커스 재설정(blur/focus 사이클) 기능을 구현하여 이 문제를 완화했습니다.*
*   **빌드 동기화**: 현재 호스트가 빌드/실행을 할 때, 게스트가 작성 중인(아직 저장되지 않은) 코드가 포함되어 빌드에 실패하거나 충돌이 발생할 수 있습니다.

---

## 🗺️ 로드맵 (Roadmap)

My Bucket Editor는 계속 발전하고 있습니다. 다음 기능들이 추가될 예정입니다:

- [ ] **PR(Pull Request) 시스템**: 게스트가 변경 사항을 제안하고, 호스트가 검토 후 반영하는 시스템.
- [ ] **초안(Draft) 모드**: 게스트의 수정 사항이 호스트에게 즉시 반영되지 않고 로컬에만 임시 저장되는 기능.
- [ ] **음성/화상 채팅**: 더 나은 페어 프로그래밍을 위한 통합 커뮤니케이션 도구.
- [ ] **플러그인 시스템**: 사용자 정의 확장을 통한 기능 추가.

---

## 🤝 기여하기 (Contributing)

기여는 언제나 환영합니다! Pull Request를 보내주세요.

## 📄 라이선스 (License)

이 프로젝트는 [MIT License](LICENSE)를 따릅니다.
