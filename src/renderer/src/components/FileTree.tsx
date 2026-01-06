// [파일 트리] 프로젝트 폴더 구조를 표시하는 사이드 컴포넌트
import { useState } from "react";
import { FileNode } from "../types";

interface Props {
    tree: FileNode[]
    onFileClick: (filePath: string) => void
}

interface TreeItemProps {
    node: FileNode
    depth: number
    onFileClick: (filePath: string) => void
}

function TreeItem({ node, depth, onFileClick }: TreeItemProps) {
    const [isOpen, setIsOpen] = useState(false)

    const handleClick = () => {
        if (node.isDirectory) {
            setIsOpen(!isOpen)
        } else {
            onFileClick(node.path)
        }
    }

    return (
        <div>
            <div
                className="tree-item"
                style={{ paddingLeft: `${depth * 16}px` }}
                onClick={handleClick}
            >
                <span className="tree-icon">
                    {node.isDirectory ? (isOpen ? '📂' : '📁') : '📄'}
                </span>
                <span className="tree-name">{node.name}</span>
            </div>
            {node.isDirectory && isOpen && node.children && (
                <div>
                    {node.children.map((child) => (
                        <TreeItem
                            key={child.path}
                            node={child}
                            depth={depth + 1}
                            onFileClick={onFileClick}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

export default function FileTree({ tree, onFileClick }: Props) {
    return (
        <div className="file-tree">
            {tree.map((node) => (
                <TreeItem key={node.path} node={node} depth={0} onFileClick={onFileClick} />
            ))}
        </div>
    )
}