import { ActionResult } from "../../action/ActionResult";
import { Configurable } from "../../project/git/Configurable";
import { isBasicAuthCredentials } from "./BasicAuthCredentials";
import { isTokenCredentials, ProjectOperationCredentials } from "./ProjectOperationCredentials";
import { ProviderType, RemoteRepoRef } from "./RepoId";

export abstract class AbstractRepoRef implements RemoteRepoRef {

    public branch?: string;

    constructor(public providerType: ProviderType,
                public remoteBase: string,
                public owner: string,
                public repo: string,
                public sha: string = "master",
                public path?: string) {
    }

    get url() {
        return `https://${this.remoteBase}/${this.owner}/${this.repo}`;
    }

    public cloneUrl(creds: ProjectOperationCredentials) {
        if (isBasicAuthCredentials(creds)) {
            return `https://${encodeURIComponent(creds.username)}:${encodeURIComponent(creds.password)}@${this.remoteBase}/${this.pathComponent}.git`;
        }
        if (!isTokenCredentials(creds)) {
            throw new Error("Only token or basic auth supported");
        }
        return `https://${creds.token}:x-oauth-basic@${this.remoteBase}/${this.pathComponent}.git`;
    }

    get pathComponent(): string {
        return this.owner + "/" + this.repo;
    }

    public abstract createRemote(creds: ProjectOperationCredentials, description: string, visibility): Promise<ActionResult<this>>;

    public abstract setUserConfig(credentials: ProjectOperationCredentials, project: Configurable): Promise<ActionResult<any>>;

    public abstract raisePullRequest(creds: ProjectOperationCredentials,
                                     title: string, body: string, head: string, base: string): Promise<ActionResult<this>>;

    public abstract deleteRemote(creds: ProjectOperationCredentials): Promise<ActionResult<this>>;
}
