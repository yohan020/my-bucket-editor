// [유저 핸들러] 게스트 접속 승인/거절 관련 IPC 처리
import { ipcMain } from 'electron'
import { servers, projectUsers } from '../server'
import { addApprovedUser, loadApprovedUsers, removeApprovedUser } from '../utils/userStore'

import { ServerInstance } from '../types' // Import ServerInstance

export function registerUserHandlers(): void {
    // 호스트가 승인 버튼을 눌렀을 때
    ipcMain.handle('user:approve', async (_, { projectId, email }: { projectId: number, email: string }) => {
        // 1. 실행 중인 서버 찾기 (Socket 알림용)
        let server: ServerInstance | null = null
        for (const s of servers.values()) {
            if (Number(s.projectId) === Number(projectId)) {
                server = s
                break
            }
        }

        // 2. 메모리 상의 대기 유저 목록 확인 (서버가 켜져있을 때만 가능)
        if (server) {
            const users = projectUsers.get(Number(projectId))
            if (users) {
                const targetUser = users.find(u => u.email === email)
                if (targetUser) {
                    targetUser.status = 'approved'
                }
            }
        }

        // 3. 영구 저장소 업데이트 (서버 꺼져있어도 가능)
        // 비밀번호는 pending 상태일 때 메모리에만 있음. 
        // 서버 꺼져있을 때 승인은 불가능할 수 있음 (비밀번호를 모르니까).
        // 하지만 'pending' 목록 자체가 서버 메모리에만 있으므로, 
        // 서버가 꺼져있으면 'Pending User' 목록 자체가 안 보임.
        // 따라서 'Approve' 액션은 서버가 켜져있을 때만 호출될 것임.
        // 혹시 모르니 방어 로직.
        
        if (server) {
            const users = projectUsers.get(Number(projectId))
            const targetUser = users?.find(u => u.email === email)
            if (targetUser) {
                await addApprovedUser(projectId, email, targetUser.password)
                // [Socket Update] 승인된 유저 목록 갱신 알림
                server.io.emit('users:approved', (await loadApprovedUsers(projectId)).map(u => ({ email: u.email })))
                return { success: true, message: '✅ 승인 성공' }
            }
            return { success: false, message: '⛔ 대기 중인 유저를 찾을 수 없습니다.' }
        } else {
             return { success: false, message: '⛔ 서버가 실행 중이 아니어서 승인할 수 없습니다.' }
        }
    })

    // 호스트가 거절 버튼을 눌렀을 때
    ipcMain.handle('user:reject', async (_, { projectId, email }: { projectId: number, email: string }) => {
        // 서버가 켜져있어야 대기 목록이 보임 -> 서버 찾기
        for (const s of servers.values()) {
            if (Number(s.projectId) === Number(projectId)) {
                const users = projectUsers.get(Number(projectId))
                if (users) {
                    const targetUser = users.find(u => u.email === email)
                    if (targetUser) {
                        targetUser.status = 'rejected'
                        return { success: true, message: '❌ 거절 성공' }
                    }
                }
            }
        }
        return { success: false, message: '⛔ 서버가 실행 중이 아니거나 유저가 없습니다.' }
    })

    // 대기 중인 유저 목록 조회
    ipcMain.handle('user:pending:list', async (_, projectId: number) => {
        // 메모리 상의 데이터이므로 서버가 켜져있을 때만 유효
        const users = projectUsers.get(Number(projectId)) || []
        return users.filter(u => u.status === 'pending').map(u => ({
            email: u.email,
            status: u.status
        }))
    })

    // 승인된 유저 목록 조회 (영구 저장소)
    ipcMain.handle('user:list', async (_, projectId: number) => {
        // 서버 상태와 무관하게 조회 가능
        return await loadApprovedUsers(Number(projectId))
    })

    // 승인된 유저 삭제
    ipcMain.handle('user:remove', async (_, { projectId, email }: { projectId: number, email: string }) => {
        await removeApprovedUser(Number(projectId), email)

        // 실행 중인 서버가 있다면 알림 전송
        for (const s of servers.values()) {
            if (Number(s.projectId) === Number(projectId)) {
                s.io.emit('users:approved', (await loadApprovedUsers(Number(projectId))).map(u => ({ email: u.email })))
                break
            }
        }
        
        return { success: true, message: '✅ 유저 삭제 성공' }
    })
}
