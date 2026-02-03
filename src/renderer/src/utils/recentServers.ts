// [최근 서버 관리] localStorage를 사용하여 최근 접속 서버 목록 관리

const STORAGE_KEY = 'recentServers'
const MAX_SERVERS = 4

export interface RecentServer {
    address: string
    lastConnected: number // timestamp
}

/**
 * 최근 접속 서버 목록 가져오기
 */
export function getRecentServers(): RecentServer[] {
    try {
        const data = localStorage.getItem(STORAGE_KEY)
        if (!data) return []
        return JSON.parse(data) as RecentServer[]
    } catch {
        return []
    }
}

/**
 * 최근 접속 서버 추가 (중복 시 업데이트, 최대 4개 유지)
 */
export function addRecentServer(address: string): void {
    const servers = getRecentServers()
    
    // 이미 존재하면 제거 (나중에 맨 앞에 추가하기 위함)
    const filtered = servers.filter(s => s.address !== address)
    
    // 맨 앞에 추가
    filtered.unshift({
        address,
        lastConnected: Date.now()
    })
    
    // 최대 개수 유지
    const trimmed = filtered.slice(0, MAX_SERVERS)
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
}

/**
 * 최근 접속 서버 삭제
 */
export function removeRecentServer(address: string): void {
    const servers = getRecentServers()
    const filtered = servers.filter(s => s.address !== address)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}

/**
 * 상대적 시간 표시 (예: "3분 전", "2일 전")
 */
export function formatRelativeTime(timestamp: number, t: (key: string) => string): string {
    const now = Date.now()
    const diff = now - timestamp
    
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (minutes < 1) return t('time.justNow')
    if (minutes < 60) return t('time.minutesAgo').replace('{n}', String(minutes))
    if (hours < 24) return t('time.hoursAgo').replace('{n}', String(hours))
    return t('time.daysAgo').replace('{n}', String(days))
}
