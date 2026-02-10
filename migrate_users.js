const fs = require('fs');
const path = require('path');
const os = require('os');

const appDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'my-bucket-editor');
const projectsPath = path.join(appDataPath, 'projects.json');

try {
    const data = fs.readFileSync(projectsPath, 'utf8');
    const projects = JSON.parse(data);
    
    projects.forEach(p => {
        const oldPath = path.join(appDataPath, `approved-users-${p.port}.json`);
        const newPath = path.join(appDataPath, `approved-users-${p.id}.json`);
        
        if (fs.existsSync(oldPath)) {
            console.log(`Migrating ${oldPath} -> ${newPath}`);
            fs.renameSync(oldPath, newPath);
        } else {
             // 23002, 23003 등으로 포트가 바뀌었을 수 있으므로 확인
             // 하지만 projects.json의 포트는 13002, 13003일 것임 (이전 단계에서 바꿈)
             // 사용자가 23002로 바꿨다면 projects.json도 바뀌어 있어야 함.
             // 현재 projects.json 상태: 13002, 13003
             // 파일 상태: approved-users-23002.json, approved-users-23003.json
             // 불일치 발생 가능성!
             
             // 따라서, projects.json 업데이트 전의 포트(23002 등)를 알 길이 없음.
             // 하지만 이전 단계에서 approved-users-23002.json으로 이름을 바꿈.
             // 그리고 projects.json은 아직 13002일 수 있음 (아까 23002로 안바꿨나?)
             
             // 아, 아까 move command는 13002 -> 23002로 파일만 바꿈. 
             // projects.json은 13002로 되어있음.
             
             // Case 1: 13002 -> 23002로 파일 이동됨. projects.json은 13002.
             const forcedOldPath = path.join(appDataPath, `approved-users-23002.json`);
             if (p.port === 13002 && fs.existsSync(forcedOldPath)) {
                 console.log(`Migrating (Case 1) ${forcedOldPath} -> ${newPath}`);
                 fs.renameSync(forcedOldPath, newPath);
                 return;
             }
             
             const forcedOldPath2 = path.join(appDataPath, `approved-users-23003.json`);
              if (p.port === 13003 && fs.existsSync(forcedOldPath2)) {
                 console.log(`Migrating (Case 2) ${forcedOldPath2} -> ${newPath}`);
                 fs.renameSync(forcedOldPath2, newPath);
                 return;
             }
        }
    });
    console.log('Migration completed.');
} catch (err) {
    console.error('Error migrating users:', err);
}
