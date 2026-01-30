
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { app } from 'electron';

// 기본 백업 경로 (문서 폴더 내 MyBucketBackups)
let backupBasePath = path.join(app.getPath('documents'), 'MyBucketBackups');

export const getBackupPath = (): string => {
  if (!fs.existsSync(backupBasePath)) {
    fs.mkdirSync(backupBasePath, { recursive: true });
  }
  return backupBasePath;
};

export const setBackupPath = (newPath: string): void => {
  backupBasePath = newPath;
  if (!fs.existsSync(backupBasePath)) {
    fs.mkdirSync(backupBasePath, { recursive: true });
  }
};

export const createBackup = async (projectPath: string): Promise<string> => {
  try {
    const projectName = path.basename(projectPath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `${projectName}_backup_${timestamp}.zip`;
    const outputPath = path.join(getBackupPath(), projectName, backupName);
    
    // 프로젝트별 백업 폴더 생성
    const projectBackupDir = path.dirname(outputPath);
    if (!fs.existsSync(projectBackupDir)) {
      fs.mkdirSync(projectBackupDir, { recursive: true });
    }

    const zip = new AdmZip();
    // 프로젝트 폴더 전체를 압축 (node_modules 제외 등은 추후 고려)
    // addLocalFolder(localPath, zipPath, filter)
    // filter가 없으면 모든 파일 포함. node_modules나 .git은 제외하는 것이 좋음.
    // AdmZip의 addLocalFolder는 필터 기능이 제한적일 수 있으므로, 직접 파일을 순회하거나
    // 단순히 제외할 폴더가 없다면 그냥 압축.
    // 여기서는 간단히 전체 압축하되 node_modules가 있다면 제외하는 로직을 추가하는 게 좋겠지만,
    // 일단 전체 압축으로 구현. (node_modules가 크면 오래 걸릴 수 있음)
    
    // 제외 패턴 처리 (간단한 구현)
    const files = fs.readdirSync(projectPath);
    files.forEach(file => {
      if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'out') return;
      
      const filePath = path.join(projectPath, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        zip.addLocalFolder(filePath, file);
      } else {
        zip.addLocalFile(filePath);
      }
    });

    zip.writeZip(outputPath);
    return outputPath;
  } catch (error) {
    console.error('Backup failed:', error);
    throw error;
  }
};

export interface BackupInfo {
  fileName: string;
  filePath: string;
  createdAt: Date;
  size: number;
}

export const listBackups = async (projectPath: string): Promise<BackupInfo[]> => {
  try {
    const projectName = path.basename(projectPath);
    const projectBackupDir = path.join(getBackupPath(), projectName);

    if (!fs.existsSync(projectBackupDir)) {
      return [];
    }

    const files = fs.readdirSync(projectBackupDir);
    const backups = files
      .filter(file => file.endsWith('.zip'))
      .map(file => {
        const filePath = path.join(projectBackupDir, file);
        const stat = fs.statSync(filePath);
        return {
          fileName: file,
          filePath,
          createdAt: stat.mtime,
          size: stat.size
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // 최신순 정렬

    return backups;
  } catch (error) {
    console.error('List backups failed:', error);
    throw error;
  }
};

export const restoreBackup = async (projectPath: string, backupFilePath: string): Promise<void> => {
  try {
    const zip = new AdmZip(backupFilePath);
    
    // [Clean Restore] 기존 파일 정리 (Clean up existing files)
    // .git, node_modules 등은 유지하고 나머지는 삭제 후 복원해야
    // 백업 이후에 생성된 파일들이 남아서 섞이는 것을 방지할 수 있음.
    const files = fs.readdirSync(projectPath);
    const preserveList = ['.git', 'node_modules', 'dist', 'out', '.vscode', '.DS_Store'];

    for (const file of files) {
      if (preserveList.includes(file)) continue;
      
      const filePath = path.join(projectPath, file);
      try {
        fs.rmSync(filePath, { recursive: true, force: true });
      } catch (rmError) {
        console.warn(`Failed to remove ${filePath} during restore preparation:`, rmError);
        // 일부 파일 삭제 실패해도 복원은 시도
      }
    }

    // 현재 프로젝트 폴더 내용을 덮어씀.
    zip.extractAllTo(projectPath, true);
  } catch (error) {
    console.error('Restore failed:', error);
    throw error;
  }
};

// 게스트 다운로드용 (버퍼 반환)
export const getProjectZipBuffer = async (projectPath: string): Promise<Buffer> => {
  try {
    const zip = new AdmZip();
    
    const files = fs.readdirSync(projectPath);
    files.forEach(file => {
      if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'out') return;
      
      const filePath = path.join(projectPath, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        zip.addLocalFolder(filePath, file);
      } else {
        zip.addLocalFile(filePath);
      }
    });

    return zip.toBuffer();
  } catch (error) {
    console.error('Get project zip buffer failed:', error);
    throw error;
  }
};

export const deleteBackup = async (backupFilePath: string): Promise<void> => {
  try {
    if (fs.existsSync(backupFilePath)) {
      fs.unlinkSync(backupFilePath);
    }
  } catch (error) {
    console.error('Delete backup failed:', error);
    throw error;
  }
};
