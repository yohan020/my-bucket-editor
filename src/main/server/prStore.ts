// [PR Store] In-memory store for managing active Pull Requests
export interface PullRequest {
    id: string;
    filePath: string;
    guestEmail: string;
    content: string; // Proposed file content
    message: string; // Commit message / Description
    timestamp: number;
    status: 'pending' | 'approved' | 'rejected';
}

const prStore = new Map<string, PullRequest[]>(); // ProjectPath -> PR[]

export const getPRs = (projectPath: string): PullRequest[] => {
    return prStore.get(projectPath) || [];
};

export const addPR = (projectPath: string, pr: PullRequest): void => {
    const list = getPRs(projectPath);
    list.push(pr);
    prStore.set(projectPath, list);
};

export const getPR = (projectPath: string, prId: string): PullRequest | undefined => {
    const list = getPRs(projectPath);
    return list.find(p => p.id === prId);
};

export const removePR = (projectPath: string, prId: string): void => {
    const list = getPRs(projectPath);
    const newList = list.filter(p => p.id !== prId);
    prStore.set(projectPath, newList);
};

export const clearPRs = (projectPath: string): void => {
    prStore.delete(projectPath);
};
