// [파일 시스템 유틸] 폴더 스캔, 파일 읽기/쓰기 기능
import { promises as fs } from 'fs'
import { join, basename } from 'path'

export interface FileNode {
    name: string
    path: string
    isDirectory: boolean
    children?: FileNode[]
}

// 폴더 구조 스캔 (재귀)
export async function scanDirectory(dirPath: string): Promise<FileNode[]> {
    const items = await fs.readdir(dirPath, { withFileTypes: true})
    const nodes: FileNode[] = []

    // 숨김 파일/폴더 및 node_modules 제외
    const filtered = items.filter(item => 
        !item.name.startsWith('.') &&
        item.name !== 'node_modules' &&
        item.name !== 'out' &&
        item.name !== 'dist'
    )

    for (const item of filtered) {
        const fullPath = join(dirPath, item.name)

        if (item.isDirectory()) {
            const children = await scanDirectory(fullPath)
            nodes.push({
                name: item.name,
                path: fullPath,
                isDirectory: true,
                children
            })
        } else {
            nodes.push({
                name: item.name,
                path: fullPath,
                isDirectory: false
            })
        }
    }

    // 폴더 먼저, 그 다음 파일 (알파벳 순)
    return nodes.sort((a, b) => {
        if (a.isDirectory === b.isDirectory) {
            return a.name.localeCompare(b.name)
        }
        return a.isDirectory ? -1 : 1
    })
}

// 파일 내용 읽기
export async function readFileContent(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8')
}

// 파일 저장
export async function writeFileContent(filePath: string, content: string): Promise<void> {
    await fs.writeFile(filePath, content, 'utf-8')
}