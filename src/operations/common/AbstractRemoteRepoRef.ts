
import { ActionResult } from "../../action/ActionResult";
import { Configurable } from "../../project/git/Configurable";
import { ProjectOperationCredentials } from "./ProjectOperationCredentials";
import { RemoteRepoRef } from "./RepoId";

export abstract class AbstractRepoRef implements RemoteRepoRef {

    constructor(public remoteBase: string,
                public owner: string,
                public repo: string,
                public sha: string = "master",
                public path?: string) {
    }

    get url() {
        return `https://${this.remoteBase}/${this.owner}/${this.repo}`;
    }

    public cloneUrl(creds: ProjectOperationCredentials) {
        return `https://${creds.token}:x-oauth-basic@${this.remoteBase}/${this.pathComponent}.git`;
    }

    get pathComponent(): string {
        return this.owner + "/" + this.repo;
    }

    public abstract create(creds: ProjectOperationCredentials, description: string, visibility): Promise<ActionResult<this>>;

    public abstract setUserConfig(credentials: ProjectOperationCredentials, project: Configurable): Promise<ActionResult<any>>;

    public abstract raisePullRequest(creds: ProjectOperationCredentials,
                                     title: string, body: string, head: string, base: string): Promise<ActionResult<this>>;

}
