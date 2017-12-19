import { ActionResult, successOn } from "../../action/ActionResult";
import { createRepo } from "../../util/gitHub";
import { ProjectOperationCredentials } from "./ProjectOperationCredentials";
import { RemoteRepoRefSupport, RepoRef } from "./RepoId";

import axios from "axios";
import { Configurable } from "../../project/git/Configurable";

export const GitHubDotComBase = "https://api.github.com";

/**
 * GitHub repo ref
 */
export class GitHubRepoRef extends RemoteRepoRefSupport {

    constructor(owner: string,
                repo: string,
                sha: string = "master",
                public apiBase = GitHubDotComBase,
                path?: string) {
        super("github.com", owner, repo, sha, path);
    }

    public create(creds: ProjectOperationCredentials, description: string, visibility): Promise<ActionResult<this>> {
        return createRepo(creds.token, this, description, visibility)
            .then(() => successOn(this));
    }

    public setUserConfig(credentials: ProjectOperationCredentials, project: Configurable): Promise<ActionResult<any>> {
        const config = {
            headers: {
                Authorization: `token ${credentials.token}`,
            },
        };

        return Promise.all([axios.get(`${this.apiBase}/user`, config),
            axios.get(`${this.apiBase}/user/emails`, config)])
            .then(results => {
                const name = results[0].data.name;
                let email = results[0].data.email;

                if (!email) {
                    email = results[1].data.find(e => e.primary === true).email;
                }

                if (name && email) {
                    return project.setUserConfig(name, email);
                } else {
                    return project.setUserConfig("Atomist Bot", "bot@atomist.com");
                }
            })
            .catch(() => project.setUserConfig("Atomist Bot", "bot@atomist.com"));
    }
}

export function isGitHubRepoRef(rr: RepoRef): rr is GitHubRepoRef {
    const maybe = rr as GitHubRepoRef;
    return maybe && !!maybe.apiBase;
}
