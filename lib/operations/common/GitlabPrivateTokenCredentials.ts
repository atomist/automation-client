import { ProjectOperationCredentials } from "./ProjectOperationCredentials";

/**
 * Credentials that uses Gitlab private tokens
 */
export interface GitlabPrivateTokenCredentials extends ProjectOperationCredentials {
    privateToken: string;
}

export function isGitlabPrivateTokenCredentials(poc: ProjectOperationCredentials): poc is GitlabPrivateTokenCredentials {
    const q = poc as GitlabPrivateTokenCredentials;
    return q.privateToken !== undefined;
}
