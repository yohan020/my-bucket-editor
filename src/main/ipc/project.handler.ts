// [프로젝트 핸들러] 프로젝트 목록 조회, 생성 등 CRUD 관련 IPC 처리

import { ipcMain, app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import { Project } from '../types'

export function registerProjectHandlers(): void {
    // 저장할 파일 경로 : (사용자 데이터 폴더)/projects.json
    const dbPath = join(app.getPath('userData'), 'projects.json')
    

    // 프로젝트 목록 불러오기 (Read)
    ipcMain.handle('project:list', async () => {
        try {
            const data = await fs.readFile(dbPath, 'utf-8')
            return JSON.parse(data)
        } catch (error) {
            return []
        }
    })
    
    // 프로젝트 생성 및 저장하기 (Create)
    ipcMain.handle('project:create', async (_, newProject: Project) => {
        let projects: Project[] = []
        try {
            const data = await fs.readFile(dbPath, 'utf-8')
            projects = JSON.parse(data)
        } catch (error) {
            // 파일이 없으면 새로 만듦
        }
    
        projects.push(newProject)
        await fs.writeFile(dbPath, JSON.stringify(projects, null, 2))
        return true
    })
}