// [커서 스타일] y-monaco 커서에 사용자 이름 라벨을 동적으로 표시
import { Awareness } from 'y-protocols/awareness'

let styleElement: HTMLStyleElement | null = null

/**
 * Awareness 상태로부터 동적 커서 스타일 CSS를 생성하고 주입
<<<<<<< HEAD
 * y-monaco는 yRemoteSelectionHead-{clientID} 형식의 클래스를 사용
=======
>>>>>>> 90c295c0de34b60b1e7111656a115529f48338e3
 */
export function updateCursorStyles(awareness: Awareness): void {
    const states = awareness.getStates()
    
    let css = ''
    
    states.forEach((state, clientId) => {
        const user = state.user as { name?: string; color?: string } | undefined
        if (user && user.name && user.color && clientId !== awareness.clientID) {
<<<<<<< HEAD
            // 각 사용자별 CSS 규칙 생성 (y-monaco 클래스 형식)
            css += `
                .yRemoteSelectionHead-${clientId} {
                    border-color: ${user.color} !important;
                    border-left-width: 2px !important;
                }
                .yRemoteSelectionHead-${clientId}::after {
                    content: "${user.name}";
                    position: absolute;
                    top: -18px;
                    left: 0;
                    background: ${user.color};
                    color: white;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 11px;
                    font-weight: 500;
                    white-space: nowrap;
                    pointer-events: none;
                    z-index: 100;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                }
                .yRemoteSelection-${clientId} {
=======
            // 각 사용자별 CSS 규칙 생성
            css += `
                .yRemoteSelectionHead[data-client-id="${clientId}"] {
                    border-color: ${user.color} !important;
                }
                .yRemoteSelectionHead[data-client-id="${clientId}"]::after {
                    content: "${user.name}";
                    background: ${user.color} !important;
                }
                .yRemoteSelection[data-client-id="${clientId}"] {
>>>>>>> 90c295c0de34b60b1e7111656a115529f48338e3
                    background-color: ${user.color}33 !important;
                }
            `
        }
    })
    
    // 기존 스타일 제거 후 새로 주입
    if (!styleElement) {
        styleElement = document.createElement('style')
        styleElement.id = 'yjs-cursor-styles'
        document.head.appendChild(styleElement)
    }
    styleElement.textContent = css
}

/**
 * 컴포넌트 언마운트 시 스타일 정리
 */
export function cleanupCursorStyles(): void {
    if (styleElement) {
        styleElement.remove()
        styleElement = null
    }
}
<<<<<<< HEAD

=======
>>>>>>> 90c295c0de34b60b1e7111656a115529f48338e3
