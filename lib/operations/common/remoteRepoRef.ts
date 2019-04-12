/*
 * Copyright © 2019 Atomist, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { BitBucketRepoRef } from "./BitBucketRepoRef";
import { BitBucketServerRepoRef } from "./BitBucketServerRepoRef";
import { GitHubRepoRef } from "./GitHubRepoRef";
import { GitlabRepoRef } from "./GitlabRepoRef";
import {
    ProviderType,
    RemoteRepoRef,
} from "./RepoId";

/**
 * Generic set of parameters to create a RemoteRepoRef.
 */
export interface RemoteRepoRefFromParams {
    /** Repository owner, i.e., user or organization */
    owner: string;
    /** SCM provider */
    providerType: ProviderType;
    /** Repository name */
    repo: string;

    /** SCM provider root API URL */
    apiUrl?: string;
    /** Branch to check out, if not specified default branch is checked out */
    branch?: string;
    /** Path within repository to checkout */
    path?: string;
    /** SCM provider root remote cloning URL */
    remoteUrl?: string;
    /** Git SHA to checkout, if omitted the HEAD of the branch is checked out */
    sha?: string;

    /**
     * Is the repository under a BitBucket Server project?  This
     * property is ignored for all other SCM providers.
     */
    isProject?: boolean;
}

/**
 * Create the appropriate remote repo ref given the params.
 *
 * @param params properties of remote repo ref
 * @return appropriate remote repo ref object
 */
export function remoteRepoRefFrom(id: RemoteRepoRefFromParams): RemoteRepoRef {
    switch (id.providerType) {
        case ProviderType.bitbucket_cloud:
            return new BitBucketRepoRef(id.owner, id.repo, id.sha, id.apiUrl, id.path, id.branch, id.remoteUrl);
        // tslint:disable-next-line:deprecation
        case ProviderType.bitbucket:
        case ProviderType.bitbucket_server:
            return new BitBucketServerRepoRef(id.remoteUrl, id.owner, id.repo, id.isProject, id.sha, id.path, id.branch, id.apiUrl);
        case ProviderType.github_com:
        case ProviderType.ghe:
            return new GitHubRepoRef(id.owner, id.repo, id.sha, id.apiUrl, id.path, id.branch, id.remoteUrl);
        case ProviderType.gitlab_com:
        case ProviderType.gitlab_enterprise:
            return GitlabRepoRef.from({ ...id, rawApiBase: id.apiUrl, gitlabRemoteUrl: id.remoteUrl });
        default:
            throw new Error(`SCM provider type '${id.providerType}' did not match any known provider`);
    }
}
