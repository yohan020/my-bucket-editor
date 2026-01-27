// [IPC 핸들러 통합] 모든 IPC 핸들러를 한 번에 등록하는 진입점 모듈
import { ipcMain } from 'electron'
import { registerDialogHandlers } from "./dialog.handler";
import { registerUserHandlers } from "./user.handler";
import { registerServerHandlers } from "./server.handler";
import { registerProjectHandlers } from "./project.handler";
import { registerFileHandlers } from "./file.handler";
import { registerWindowHandlers } from "./window.handler";
import { registerTunnelHandlers } from "./tunnel.handler";

export function registerAllHandlers(): void {
    registerDialogHandlers()
    registerUserHandlers()
    registerServerHandlers()
    registerProjectHandlers()
    registerFileHandlers()
    registerWindowHandlers()
    registerTunnelHandlers()
    
    // 클립보드 핸들러
    const { clipboard } = require('electron')
    ipcMain.handle('clipboard:write', (_, text: string) => {
        clipboard.writeText(text)
    })
}
