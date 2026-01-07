// [유저 핸들러] 게스트 접속 승인/거절 관련 IPC 처리
import { ipcMain } from 'electron'
import { projectUsers } from '../server'
import { addApprovedUser, loadApprovedUsers, removeApprovedUser } from '../utils/userStore'

export function registerUserHandlers(): void {
    // 호스트가 승인/거절 버튼을 눌렀을 때 처리하는 핸들러
    ipcMain.handle('user:approve', async (_, {port, email, allow}) => {
        const users = projectUsers.get(port)
        if (!users) return {success: false, message: '⛔ 서버가 없습니다.'}
    
        const targetUser = users.find(u => u.email === email)
        if (targetUser) {
          targetUser.status = allow ? 'approved' : 'rejected'
          if (allow) {
            await addApprovedUser(port, email, targetUser.password)  // port 추가!
          }
          return {success: true, message: '✅ 승인/거절 성공'}
        }
        return {success: false, message: '⛔ 유저가 없습니다.'}
    })

    // 승인된 유저 목록 조회 (포트별)
    ipcMain.handle('user:list', async (_, port: number) => {
        return await loadApprovedUsers(port)  // port 추가!
    })

    // 승인된 유저 삭제 (포트별)
    ipcMain.handle('user:remove', async (_, { port, email }: { port: number, email: string }) => {
        await removeApprovedUser(port, email)  // port 추가!
        return {success: true, message: '✅ 유저 삭제 성공'}
    })
}