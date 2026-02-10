// [유저 저장소] 승인된 유저를 프로젝트(포트)별 JSON 파일에 저장/로드
import { promises as fs } from 'fs'
import { join } from 'path'
import { app } from 'electron'

interface ApprovedUser {
    email: string
    password: string
    approvedAt: string // 승인 날짜
}

// 저장 경로 : userData/approved-users-{projectId}.json (프로젝트 ID별 분리!)
const getFilePath = (projectId: number | string) => join(app.getPath('userData'), `approved-users-${projectId}.json`)

// 유저 목록 로드
export async function loadApprovedUsers(projectId: number | string): Promise<ApprovedUser[]> {
    try {
        const data = await fs.readFile(getFilePath(projectId), 'utf-8')
        return JSON.parse(data)
    } catch (error) {
        return []
    }
}

// 유저 저장
export async function saveApprovedUsers(projectId: number | string, users: ApprovedUser[]): Promise<void> {
    await fs.writeFile(getFilePath(projectId), JSON.stringify(users, null, 2))
}

// 유저 추가
export async function addApprovedUser(projectId: number | string, email: string, password: string): Promise<void> {
    const users = await loadApprovedUsers(projectId)
    if (!users.find(u => u.email === email)) {
        users.push({ email, password, approvedAt: new Date().toISOString() })
        await saveApprovedUsers(projectId, users)
    }
}

// 유저 삭제
export async function removeApprovedUser(projectId: number | string, email: string): Promise<void> {
    const users = await loadApprovedUsers(projectId)
    const filtered = users.filter(u => u.email !== email)
    await saveApprovedUsers(projectId, filtered)
}

// 유저 확인
export async function isApprovedUser(projectId: number | string, email: string, password: string): Promise<boolean> {
    const users = await loadApprovedUsers(projectId)
    return users.some(u => u.email === email && u.password === password)
}

// 유저 파일 전체 삭제 (프로젝트 삭제 시)
export async function deleteApprovedUserFile(projectId: number | string): Promise<void> {
    try {
        await fs.unlink(getFilePath(projectId))
    } catch (error) {
        // 파일이 없을 수도 있음
    }
}