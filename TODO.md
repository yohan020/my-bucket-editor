# 📋 Bucket Editor - 개발 Todo 리스트

## ✅ 완료된 기능

- [x] 관리자 로그인 (로컬 인증)
- [x] 프로젝트 CRUD (`projects.json`) + 삭제 기능
- [x] 폴더 경로 선택 다이얼로그
- [x] 멀티 서버 실행/중지 (포트별 관리)
- [x] 게스트 로그인 API (`/api/login`)
- [x] 화이트리스트 승인 시스템 (pending/approved/rejected)
- [x] 호스트에게 접속 요청 알림 (IPC)
- [x] SSR 방식 게스트 로그인 페이지
- [x] 코드 모듈화 및 분리
- [x] Host 에디터 (Monaco Editor + 파일 트리)
- [x] 파일 시스템 연동 (읽기/쓰기/스캔)
- [x] Guest 에디터 페이지 (SSR + Socket.io)
- [x] 사이드바 리사이즈 기능
- [x] JWT 토큰 인증 (토큰 발급, 쿠키 저장, 검증 미들웨어)
- [x] 사용자 영구 저장 (프로젝트별 `approved-users-{port}.json`)
- [x] 재접속 시 자동 승인 처리
- [x] 프로젝트 삭제 시 유저 목록도 삭제
- [x] 사용자 관리 UI (유저 목록 + 삭제 기능)

---

## 🚧 다음 단계

### 1️⃣ 실시간 동시 편집 (Yjs) ⬅️ 다음!

- [ ] Yjs 설치 (`yjs`, `y-monaco`, `y-websocket`)
- [ ] Socket.io ↔ Yjs WebSocket Provider 연결
- [ ] CRDT 문서 동기화 구현
- [ ] 다른 유저 커서 위치 공유

---

## 🔮 추후 고려 기능

- [ ] 채팅 기능 (Socket.io)
- [ ] 터미널 공유
- [ ] 프로젝트 설정 변경 (포트, 이름)
- [ ] 보안 강화 (비밀번호 해싱, HTTPS)
- [ ] 빌드 & 배포 자동화
