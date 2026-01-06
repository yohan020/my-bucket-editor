// [타입 정의] Renderer에서 사용하는 공통 인터페이스 (Project, ViewState)
export interface Project {
    id: number,
    name: string,
    path: string,
    port: number,
    lastUsed: string
}

export type ViewState = 'LOGIN' | 'DASHBOARD' | 'CREATE_PROJECT'