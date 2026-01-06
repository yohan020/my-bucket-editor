// [프로젝트 훅] 프로젝트 CRUD 및 서버 토글 로직을 관리하는 커스텀 훅
import { useState, useEffect } from 'react'
import { Project } from '../types'

export function useProjects() {
    const [projects, setProjects] = useState<Project[]>([])
    const [activeProjectIds, setActiveProjectIds] = useState<number[]>([])
    

    const loadProjects = async () => {
        const saved = await window.api.getProjects()
        setProjects(saved)
    }

    useEffect(() => {
        loadProjects()
    }, [])

    const createProject = async (project: Project) => {
        await window.api.createProject(project)
        await loadProjects()
    }

    const toggleServer = async (project: Project) => {
        if (activeProjectIds.includes(project.id)) {
            const stopped = await window.api.stopServer(project.port)
            if (stopped) {
                setActiveProjectIds(prev => prev.filter(id => id !== project.id))
                return { stopped: true }
            }
            return { error: '서버 종료 실패' }
        } else {
            const result = await window.api.startServer(project.port, project.path)
            if (result.success) {
                setActiveProjectIds(prev => [...prev, project.id])
                return { started: true, port: project.port }
            }
            return { error: result.message }
        }
    }

    return {
        projects,
        activeProjectIds,
        createProject,
        toggleServer
    }
}