// [유저 핸들러] 게스트 접속 승인/거절 관련 IPC 처리
import { ipcMain } from 'electron'
import { projectUsers } from '../server'
import { addApprovedUser, loadApprovedUsers, removeApprovedUser } from '../utils/userStore'

export function registerUserHandlers(): void {
    // 호스트가 승인 버튼을 눌렀을 때
    ipcMain.handle('user:approve', async (_, { port, email }: { port: number, email: string }) => {
        const users = projectUsers.get(port)
        if (!users) return { success: false, message: '⛔ 서버가 없습니다.' }
    
        const targetUser = users.find(u => u.email === email)
        if (targetUser) {
            targetUser.status = 'approved'
            await addApprovedUser(port, email, targetUser.password)
            return { success: true, message: '✅ 승인 성공' }
        }
        return { success: false, message: '⛔ 유저가 없습니다.' }
    })

    // 호스트가 거절 버튼을 눌렀을 때
    ipcMain.handle('user:reject', async (_, { port, email }: { port: number, email: string }) => {
        const users = projectUsers.get(port)
        if (!users) return { success: false, message: '⛔ 서버가 없습니다.' }
    
        const targetUser = users.find(u => u.email === email)
        if (targetUser) {
            targetUser.status = 'rejected'
            return { success: true, message: '❌ 거절 성공' }
        }
        return { success: false, message: '⛔ 유저가 없습니다.' }
    })

    // 대기 중인 유저 목록 조회 (포트별)
    ipcMain.handle('user:pending:list', async (_, port: number) => {
        const users = projectUsers.get(port) || []
        return users.filter(u => u.status === 'pending').map(u => ({
            email: u.email,
            status: u.status
        }))
    })

    // 승인된 유저 목록 조회 (포트별)
    ipcMain.handle('user:list', async (_, port: number) => {
        return await loadApprovedUsers(port)
    })

    // 승인된 유저 삭제 (포트별)
    ipcMain.handle('user:remove', async (_, { port, email }: { port: number, email: string }) => {
        await removeApprovedUser(port, email)
        return { success: true, message: '✅ 유저 삭제 성공' }
    })
}
