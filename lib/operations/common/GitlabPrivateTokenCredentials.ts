import { ProjectOperationCredentials } from "./ProjectOperationCredentials";

export interface GitlabPrivateTokenCredentials extends ProjectOperationCredentials {
    privateToken: string;
}

export function isGitlabPrivateTokenCredentials(poc: ProjectOperationCredentials): poc is GitlabPrivateTokenCredentials {
    const q = poc as GitlabPrivateTokenCredentials;
    return q.privateToken !== undefined;
}
