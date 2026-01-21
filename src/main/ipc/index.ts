// [IPC 핸들러 통합] 모든 IPC 핸들러를 한 번에 등록하는 진입점 모듈
import { registerDialogHandlers } from "./dialog.handler";
import { registerUserHandlers } from "./user.handler";
import { registerServerHandlers } from "./server.handler";
import { registerProjectHandlers } from "./project.handler";
import { registerFileHandlers } from "./file.handler";
import { registerWindowHandlers } from "./window.handler";

export function registerAllHandlers(): void {
    registerDialogHandlers()
    registerUserHandlers()
    registerServerHandlers()
    registerProjectHandlers()
    registerFileHandlers()
    registerWindowHandlers()
}
