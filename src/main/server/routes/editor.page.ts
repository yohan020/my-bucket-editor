// [에디터 페이지] Guest용 Monaco Editor SSR 페이지 - 실시간 동시 편집
import { Router } from 'express'
import { verifyToken } from '../utils/jwt'

export function createEditorRouter(): Router {
    const router = Router()

    router.get('/editor', (req, res) => {
        const cookies = req.headers.cookie || ''
        const tokenMatch = cookies.match(/token=([^;]+)/)
        const token = tokenMatch ? tokenMatch[1] : null
        
        if (!token || !verifyToken(token)) {
            res.redirect('/')
            return
        }
        res.send(`
<!DOCTYPE html>
<. lang="ko">
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
    </style>
</head>
<body>
    <header class="header">
        <h2>📝 Bucket Editor (Guest)</h2>
        <span id="current-file" style="color: #888; font-size: 0.9rem;"></span>
        <span id="sync-status" style="color: #4ec9b0; font-size: 0.8rem; margin-left: auto;">🟢 실시간 동기화</span>
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

    <script src="/socket.io/socket.io.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js"></script>
    
    <script>
        const socket = io();
        let editor = null;
        let currentFilePath = null;
        let isRemoteChange = false;  // 원격 변경인지 로컬 변경인지 구분

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

            // 로컬에서 내용 변경 시 서버로 전송
            editor.onDidChangeModelContent(() => {
                if (isRemoteChange || !currentFilePath) return;
                
                // 디바운싱 - 50ms 내에 여러 번 타이핑해도 한 번만 전송
                clearTimeout(window.changeTimeout);
                window.changeTimeout = setTimeout(() => {
                    socket.emit('file:change', { 
                        filePath: currentFilePath, 
                        content: editor.getValue() 
                    });
                }, 50);
            });

            // Ctrl+S로 저장
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, function () {
                if (currentFilePath) {
                    socket.emit('file:write', { filePath: currentFilePath });
                }
            });

            socket.emit('file:tree');
        });

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
                    div.onclick = () => {
                        // 이전 파일 room에서 나가기
                        if (currentFilePath) {
                            socket.emit('file:leave', currentFilePath);
                        }
                        socket.emit('file:read', node.path);
                    };
                    container.appendChild(div);
                }
            });
        }

        function detectLanguage(filePath) {
            const ext = filePath.split('.').pop().toLowerCase();
            const map = { ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript', json: 'json', html: 'html', css: 'css', md: 'markdown', py: 'python' };
            return map[ext] || 'plaintext';
        }

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
                
                isRemoteChange = true;
                editor.setValue(data.content || '');
                isRemoteChange = false;
            }
        });

        // 다른 클라이언트의 실시간 변경 수신
        socket.on('file:change', (data) => {
            if (data.filePath === currentFilePath && editor) {
                // 현재 커서 위치 저장
                const position = editor.getPosition();
                const scrollTop = editor.getScrollTop();
                
                isRemoteChange = true;
                editor.setValue(data.content);
                isRemoteChange = false;
                
                // 커서 위치 복원
                if (position) editor.setPosition(position);
                editor.setScrollTop(scrollTop);
            }
        });

        socket.on('file:write:response', (data) => {
            if (data.success) {
                console.log('✅ 파일 저장 완료');
                document.getElementById('sync-status').textContent = '💾 저장됨!';
                setTimeout(() => {
                    document.getElementById('sync-status').textContent = '🟢 실시간 동기화';
                }, 2000);
            } else {
                alert('저장 실패: ' + data.error);
            }
        });

        // 사이드바 리사이즈
        const sidebar = document.getElementById('sidebar');
        const resizeHandle = document.getElementById('resize-handle');
        let isResizing = false;

        resizeHandle.addEventListener('mousedown', () => {
            isResizing = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            if (e.clientX >= 200 && e.clientX <= 500) {
                sidebar.style.width = e.clientX + 'px';
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