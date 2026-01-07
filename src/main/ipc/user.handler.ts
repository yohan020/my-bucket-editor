// [유저 핸들러] 게스트 접속 승인/거절 관련 IPC 처리
import { ipcMain } from 'electron'
import { projectUsers } from '../server'

export function registerUserHandlers(): void {
    // 호스트가 승인/거절 버튼을 눌렀을 때 처리하는 핸들러
    ipcMain.handle('user:approve', async (_, {port, email, allow}) => {
        const users = projectUsers.get(port)
        if (!users) return {success: false, message: '⛔ 서버가 없습니다.'}
    
        const targetUser = users.find(u => u.email === email)
        if (targetUser) {
          targetUser.status = allow ? 'approved' : 'rejected'
          return {success: true, message: '✅ 승인/거절 성공'}
        }
        return {success: false, message: '⛔ 유저가 없습니다.'}
    })
}
