// [유저 저장소] 승인된 유저를 프로젝트(포트)별 JSON 파일에 저장/로드
import { promises as fs } from 'fs'
import { join } from 'path'
import { app } from 'electron'

interface ApprovedUser {
    email: string
    password: string
    approvedAt: string // 승인 날짜
}

// 저장 경로 : userData/approved-users-{port}.json (프로젝트별 분리!)
const getFilePath = (port: number) => join(app.getPath('userData'), `approved-users-${port}.json`)

// 유저 목록 로드
export async function loadApprovedUsers(port: number): Promise<ApprovedUser[]> {
    try {
        const data = await fs.readFile(getFilePath(port), 'utf-8')
        return JSON.parse(data)
    } catch (error) {
        return []
    }
}

// 유저 저장
export async function saveApprovedUsers(port: number, users: ApprovedUser[]): Promise<void> {
    await fs.writeFile(getFilePath(port), JSON.stringify(users, null, 2))
}

// 유저 추가
export async function addApprovedUser(port: number, email: string, password: string): Promise<void> {
    const users = await loadApprovedUsers(port)
    if (!users.find(u => u.email === email)) {
        users.push({ email, password, approvedAt: new Date().toISOString() })
        await saveApprovedUsers(port, users)
    }
}

// 유저 삭제
export async function removeApprovedUser(port: number, email: string): Promise<void> {
    const users = await loadApprovedUsers(port)
    const filtered = users.filter(u => u.email !== email)
    await saveApprovedUsers(port, filtered)
}

// 유저 확인
export async function isApprovedUser(port: number, email: string, password: string): Promise<boolean> {
    const users = await loadApprovedUsers(port)
    return users.some(u => u.email === email && u.password === password)
}

// 유저 파일 전체 삭제 (프로젝트 삭제 시)
export async function deleteApprovedUserFile(port: number): Promise<void> {
    try {
        await fs.unlink(getFilePath(port))
    } catch (error) {
        console.error(error)
    }
}