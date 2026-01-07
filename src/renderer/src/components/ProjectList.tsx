// [프로젝트 리스트] 프로젝트 목록을 렌더링하는 컨테이너 컴포넌트
import { Project } from '../types'
import ProjectItem from './ProjectItem'

interface Props {
    projects: Project[]
    activeProjectIds: number[]
    onToggleServer: (project: Project) => void
    onOpenEditor: (project: Project) => void
    onDeleteProject: (project: Project) => void
}

export default function ProjectList({ projects, activeProjectIds, onToggleServer, onOpenEditor, onDeleteProject }: Props) {
    return (
        <div className="list-container">
            {projects.map(project => (
                <ProjectItem
                    key={project.id}
                    project={project}
                    isActive={activeProjectIds.includes(project.id)}
                    onToggleServer={() => onToggleServer(project)}
                    onOpenEditor={() => onOpenEditor(project)}
                    onDeleteProject={() => onDeleteProject(project)}
                />
            ))}
        </div>
    )
}