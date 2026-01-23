// [파일 트리] 프로젝트 폴더 구조를 표시하는 사이드 컴포넌트
import { useState } from "react";
import { FileNode } from "../types";
import { getFileIconUrl, getFolderIconUrl, getFileIcon, getFolderIcon } from "../utils/fileIcons";

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
    const [imgError, setImgError] = useState(false)

    const handleClick = () => {
        if (node.isDirectory) {
            setIsOpen(!isOpen)
        } else {
            onFileClick(node.path)
        }
    }

    // 아이콘 URL
    const iconUrl = node.isDirectory
        ? getFolderIconUrl(node.name, isOpen)
        : getFileIconUrl(node.name)

    // 이모지 fallback
    const fallbackIcon = node.isDirectory
        ? getFolderIcon(isOpen)
        : getFileIcon(node.name)

    return (
        <div>
            <div
                className="tree-item"
                style={{ paddingLeft: `${depth * 16}px` }}
                onClick={handleClick}
            >
                {imgError ? (
                    <span className="tree-icon">{fallbackIcon}</span>
                ) : (
                    <img
                        src={iconUrl}
                        alt=""
                        className="tree-icon-img"
                        onError={() => setImgError(true)}
                    />
                )}
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