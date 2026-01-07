// [에디터 페이지] Guest용 Monaco Editor SSR 페이지
import { Router } from 'express'
import { verifyToken } from '../utils/jwt'

export function createEditorRouter(): Router {
    const router = Router()

    // req = 브라우저가 뭘 보냈는지 읽는데 사용
    // res = 브라우저에 뭘 보낼지 결정하는데 사용
    router.get('/editor', (req, res) => {
        // 쿠키에서 토큰 추출
        const cookies = req.headers.cookie || ''
        const tokenMatch = cookies.match(/token=([^;]+)/)
        const token = tokenMatch ? tokenMatch[1] : null
        
        // 토큰 검증
        if (!token || !verifyToken(token)) {
            res.redirect('/')
            return
        }
        res.send(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bucket Editor</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #1e1e1e; color: #fff; font-family: sans-serif; height: 100vh; display: flex; flex-direction: column; }
        .header { display: flex; align-items: center; gap: 20px; padding: 10px 20px; background: #252526; border-bottom: 1px solid #333; }
        .header h2 { font-size: 1.1rem; }
        .main { display: flex; flex: 1; overflow: hidden; }
        .sidebar { width: 300px; min-width: 200px; max-width: 500px; background: #1e1e1e; border-right: 1px solid #333; overflow-y: auto; position: relative; }
        .sidebar-header { padding: 12px 16px; font-weight: bold; border-bottom: 1px solid #333; background: #252526; }
        .tree-item { display: flex; align-items: center; gap: 8px; padding: 6px 16px; cursor: pointer; }
        .tree-item:hover { background: #2a2d2e; }
        .resize-handle { position: absolute; right: 0; top: 0; width: 5px; height: 100%; background: transparent; cursor: col-resize; }
        .resize-handle:hover { background: #0e639c; }
        .editor-container { flex: 1; overflow: hidden; }
        #editor { width: 100%; height: 100%; }
        .placeholder { display: flex; justify-content: center; align-items: center; height: 100%; color: #888; }
    </style>
</head>
<body>
    <header class="header">
        <h2>📝 Bucket Editor (Guest)</h2>
        <span id="current-file" style="color: #888; font-size: 0.9rem;"></span>
    </header>
    <div class="main">
        <aside class="sidebar" id="sidebar">
            <div class="sidebar-header">📁 파일 탐색기</div>
            <div id="file-tree"></div>
            <div class="resize-handle" id="resize-handle"></div>
        </aside>
        <main class="editor-container">
            <div id="editor"></div>
        </main>
    </div>

    <!-- Socket.io -->
    <script src="/socket.io/socket.io.js"></script>
    
    <!-- Monaco Editor CDN -->
    <script src="https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js"></script>
    
    <script>
        const socket = io();
        let editor = null;
        let currentFilePath = null;

        // Monaco 에디터 초기화
        require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });
        require(['vs/editor/editor.main'], function () {
            editor = monaco.editor.create(document.getElementById('editor'), {
                value: '// 왼쪽에서 파일을 선택하세요',
                language: 'plaintext',
                theme: 'vs-dark',
                automaticLayout: true,
                minimap: { enabled: true },
                fontSize: 14,
                wordWrap: 'on'
            });

            // Ctrl+S로 저장
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, function () {
                if (currentFilePath) {
                    socket.emit('file:write', { filePath: currentFilePath, content: editor.getValue() });
                }
            });

            // 파일 트리 요청
            socket.emit('file:tree');
        });

        // 파일 트리 렌더링
        function renderTree(nodes, container, depth = 0) {
            nodes.forEach(node => {
                const div = document.createElement('div');
                div.className = 'tree-item';
                div.style.paddingLeft = (16 + depth * 16) + 'px';
                div.innerHTML = (node.isDirectory ? '📁 ' : '📄 ') + node.name;
                
                if (node.isDirectory) {
                    div.onclick = () => {
                        const children = div.nextElementSibling;
                        if (children) children.style.display = children.style.display === 'none' ? 'block' : 'none';
                    };
                    container.appendChild(div);
                    if (node.children && node.children.length > 0) {
                        const childContainer = document.createElement('div');
                        renderTree(node.children, childContainer, depth + 1);
                        container.appendChild(childContainer);
                    }
                } else {
                    div.onclick = () => socket.emit('file:read', node.path);
                    container.appendChild(div);
                }
            });
        }

        // 파일 확장자로 언어 감지
        function detectLanguage(filePath) {
            const ext = filePath.split('.').pop().toLowerCase();
            const map = { ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript', json: 'json', html: 'html', css: 'css', md: 'markdown', py: 'python' };
            return map[ext] || 'plaintext';
        }

        // Socket 이벤트 핸들러
        socket.on('file:tree:response', (data) => {
            if (data.success) {
                const container = document.getElementById('file-tree');
                container.innerHTML = '';
                renderTree(data.tree, container);
            }
        });

        socket.on('file:read:response', (data) => {
            if (data.success && editor) {
                currentFilePath = data.filePath;
                document.getElementById('current-file').textContent = data.filePath;
                monaco.editor.setModelLanguage(editor.getModel(), detectLanguage(data.filePath));
                editor.setValue(data.content);
            }
        });

        socket.on('file:write:response', (data) => {
            if (data.success) console.log('✅ 파일 저장 완료');
            else alert('저장 실패: ' + data.error);
        });

        socket.on('file:updated', (data) => {
            if (currentFilePath === data.filePath && editor) {
                editor.setValue(data.content);
            }
        });

        // 사이드바 리사이즈 기능
        const sidebar = document.getElementById('sidebar');
        const resizeHandle = document.getElementById('resize-handle');
        let isResizing = false;

        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const newWidth = e.clientX;
            if (newWidth >= 200 && newWidth <= 500) {
                sidebar.style.width = newWidth + 'px';
            }
        });

        document.addEventListener('mouseup', () => {
            isResizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        });
    </script>
</body>
</html>
        `);
    });

    return router;
}