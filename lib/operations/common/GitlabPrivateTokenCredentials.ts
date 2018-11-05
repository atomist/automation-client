import { ProjectOperationCredentials } from "./ProjectOperationCredentials";

export interface GitlabPrivateTokenCredentials extends ProjectOperationCredentials {

    token: string;
}

export function isGitlabPrivateTokenCredentials(poc: ProjectOperationCredentials): poc is GitlabPrivateTokenCredentials {
    const q = poc as GitlabPrivateTokenCredentials;
    return q.token !== undefined;
}
