// [게스트 페이지] 게스트가 브라우저로 접속 시 보이는 SSR 로그인 HTML 페이지

import { Router } from 'express'

export function createGuestRouter(): Router {
    const router = Router()

    router.get('/', (_req, res) => {
        res.send(`
          <!DOCTYPE html>
          <html lang="ko">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bucket Login</title>
            <style>
              /* 스타일은 그대로 유지하거나 더 예쁘게 꾸미세요 */
              body { background-color: #1e1e1e; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; }
              .box { background: #252526; padding: 40px; border-radius: 8px; width: 300px; text-align: center; }
              input { width: 100%; padding: 10px; margin: 10px 0; border-radius: 4px; border: 1px solid #555; background: #333; color: white; }
              button { width: 100%; padding: 10px; background: #0e639c; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
              button:hover { background: #1177bb; }
            </style>
          </head>
          <body>
            <div class="box">
              <h2>🔒 프로젝트 접속</h2>
              <p>아이디와 비밀번호를 입력하세요.<br>(처음이면 자동으로 승인 요청됩니다)</p>
              <input type="text" id="email" placeholder="이메일 / 닉네임">
              <input type="password" id="password" placeholder="비밀번호">
              <button onclick="login()">접속 / 승인요청</button>
            </div>
            <script>
              async function login() {
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                if(!email || !password) return alert('모두 입력해주세요.');

                try {
                  const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email, password })
                  });
                  const data = await res.json();
                  
                  if (data.success) {
                    // 토큰을 쿠키에 저장
                    document.cookie = 'token=' + data.token + '; path=/';
                    alert('🎉 환영합니다! 에디터로 이동합니다.');
                    document.body.innerHTML = '<h1>🚧 에디터 로딩중...</h1>'; 
                    window.location.href = '/editor';
                  } else {
                    alert(data.message); // "대기중입니다" 또는 "요청 보냈습니다" 메시지 출력
                  }
                } catch (e) { alert('서버 오류'); }
              }
            </script>
          </body>
          </html>
        `)
    })

    return router
}