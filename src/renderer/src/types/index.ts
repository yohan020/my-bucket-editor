// [타입 정의] Renderer에서 사용하는 공통 인터페이스 (Project, ViewState)
export interface Project {
    id: number,
    name: string,
    path: string,
    port: number,
    lastUsed: string
}

export interface FileNode {
    name: string,
    path: string,
    isDirectory: boolean,
    children?: FileNode[]
}

export type ViewState = 'MODE_SELECT' |'LOGIN' | 'DASHBOARD' | 'CREATE_PROJECT' | 'EDITOR' | 'GUEST_CONNECT' | 'GUEST_EDITOR'