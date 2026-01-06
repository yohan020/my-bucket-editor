# 📋 Bucket Editor - 개발 Todo 리스트

## ✅ 완료된 기능

- [x] 관리자 로그인 (로컬 인증)
- [x] 프로젝트 CRUD (`projects.json`)
- [x] 폴더 경로 선택 다이얼로그
- [x] 멀티 서버 실행/중지 (포트별 관리)
- [x] 게스트 로그인 API (`/api/login`)
- [x] 화이트리스트 승인 시스템 (pending/approved/rejected)
- [x] 호스트에게 접속 요청 알림 (IPC)
- [x] SSR 방식 게스트 로그인 페이지
- [x] 코드 모듈화 및 분리

---

## 🚧 다음 단계

### 1️⃣ Editor 화면 구현

- [x] Monaco Editor 설치 (`@monaco-editor/react`)
- [x] Guest용 React 앱 생성 (로그인 후 IDE 화면)
- [-] Express에서 Guest 앱 정적 파일 서빙
- [-] JWT 토큰 인증 (승인된 유저만 에디터 접근)
- [-] **Host(관리자) 에디터 진입** - 대시보드에서 프로젝트 클릭 시 에디터 화면으로 이동

### 2️⃣ 파일 트리 동기화

- [ ] `fs` 모듈로 프로젝트 폴더 구조 스캔
- [ ] 파일/폴더를 계층 구조 JSON으로 변환
- [ ] Socket.io로 Guest에게 파일 트리 전송
- [ ] 사이드바 파일 탐색기 UI 컴포넌트

### 3️⃣ 파일 내용 동기화

- [ ] 파일 열기 API (클릭 시 내용 전송)
- [ ] 파일 저장 API (수정 → Host 로컬 저장)
- [ ] Monaco Editor에 파일 내용 바인딩

### 4️⃣ 실시간 동시 편집 (Yjs)

- [ ] Yjs 설치 (`yjs`, `y-monaco`, `y-websocket`)
- [ ] Socket.io ↔ Yjs WebSocket Provider 연결
- [ ] CRDT 문서 동기화 구현
- [ ] 다른 유저 커서 위치 공유

### 5️⃣ 사용자 영구 저장

- [ ] 승인된 유저 `approved-users.json` 저장
- [ ] 서버 시작 시 저장된 유저 목록 로드
- [ ] 재접속 시 자동 승인 처리

---

## 🔮 추후 고려 기능

- [ ] 채팅 기능 (Socket.io)
- [ ] 터미널 공유
- [ ] 프로젝트 설정 변경 (포트, 이름)
- [ ] 보안 강화 (비밀번호 해싱, HTTPS)
- [ ] 빌드 & 배포 자동화
