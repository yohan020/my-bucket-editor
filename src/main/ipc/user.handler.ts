// [유저 핸들러] 게스트 접속 승인/거절 관련 IPC 처리
import { ipcMain } from 'electron'
import { servers, projectUsers } from '../server'
import { addApprovedUser, loadApprovedUsers, removeApprovedUser } from '../utils/userStore'

export function registerUserHandlers(): void {
    // 호스트가 승인 버튼을 눌렀을 때
    ipcMain.handle('user:approve', async (_, { port, email }: { port: number, email: string }) => {
        const server = servers.get(port)
        if (!server) return { success: false, message: '⛔ 서버가 없습니다.' }
        
        const projectId = Number(server.projectId)
        const users = projectUsers.get(projectId)
        if (!users) return { success: false, message: '⛔ 유저 데이터가 없습니다.' }
    
        const targetUser = users.find(u => u.email === email)
        if (targetUser) {
            targetUser.status = 'approved'
            await addApprovedUser(projectId, email, targetUser.password)
            
            // [Socket Update] 승인된 유저 목록 갱신 알림
            server.io.emit('users:approved', (await loadApprovedUsers(projectId)).map(u => ({ email: u.email })))
            
            return { success: true, message: '✅ 승인 성공' }
        }
        return { success: false, message: '⛔ 유저가 없습니다.' }
    })

    // 호스트가 거절 버튼을 눌렀을 때
    ipcMain.handle('user:reject', async (_, { port, email }: { port: number, email: string }) => {
        const server = servers.get(port)
        if (!server) return { success: false, message: '⛔ 서버가 없습니다.' }
        
        const projectId = Number(server.projectId)
        const users = projectUsers.get(projectId)
        if (!users) return { success: false, message: '⛔ 유저 데이터가 없습니다.' }
    
        const targetUser = users.find(u => u.email === email)
        if (targetUser) {
            targetUser.status = 'rejected'
            return { success: true, message: '❌ 거절 성공' }
        }
        return { success: false, message: '⛔ 유저가 없습니다.' }
    })

    // 대기 중인 유저 목록 조회 (포트별 -> 프로젝트ID별)
    ipcMain.handle('user:pending:list', async (_, port: number) => {
        const server = servers.get(port)
        if (!server) return []

        const projectId = Number(server.projectId)
        const users = projectUsers.get(projectId) || []
        return users.filter(u => u.status === 'pending').map(u => ({
            email: u.email,
            status: u.status
        }))
    })

    // 승인된 유저 목록 조회 (포트별 -> 프로젝트ID별)
    ipcMain.handle('user:list', async (_, port: number) => {
        const server = servers.get(port)
        if (!server) return [] // 서버 없음
        
        const projectId = Number(server.projectId)
        return await loadApprovedUsers(projectId)
    })

    // 승인된 유저 삭제 (포트별 -> 프로젝트ID별)
    ipcMain.handle('user:remove', async (_, { port, email }: { port: number, email: string }) => {
        const server = servers.get(port)
        if (!server) return { success: false, message: '⛔ 서버가 없습니다.' }

        const projectId = Number(server.projectId)
        await removeApprovedUser(projectId, email)
        
        // [Socket Update] 목록 갱신 알림
        server.io.emit('users:approved', (await loadApprovedUsers(projectId)).map(u => ({ email: u.email })))

        return { success: true, message: '✅ 유저 삭제 성공' }
    })
}
