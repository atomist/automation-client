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

import { ActionResult } from "../../action/ActionResult";
import { Configurable } from "../../project/git/Configurable";
import { isBasicAuthCredentials } from "./BasicAuthCredentials";
import { isGitlabPrivateTokenCredentials } from "./GitlabPrivateTokenCredentials";
import {
	isTokenCredentials,
	ProjectOperationCredentials,
} from "./ProjectOperationCredentials";
import {
	ProviderType,
	PullRequestReviewer,
	RemoteRepoRef,
} from "./RepoId";

/**
 * Superclass for RemoteRepoRef implementations.
 * Handles parsing remote base
 *
 * This should ultimately move down to automation-client-ts and replace AbstractRepoRef.
 */
export abstract class AbstractRemoteRepoRef implements RemoteRepoRef {

	/** URL scheme from applied to both API and remote bases. */
	public readonly scheme: "http://" | "https://";

	/** API URL without the scheme or trailing '/'. */
	public readonly apiBase: string;

	public readonly abstract kind: string;

	/** Git remote URL not including scheme or trailing '/' */
	public readonly remoteBase: string;

	/**
	 * Construct a new RemoteRepoRef
	 * @param {ProviderType} providerType
	 * @param {string} rawRemote remote url, like for cloning or linking into the repo. Should start with a scheme.
	 *                           May have a trailing slash, which will be stripped
	 * @param rawApiBase API base url. Should start with a scheme. May have a trailing slash, which will be stripped.
	 * @param {string} owner
	 * @param {string} repo
	 * @param {string} sha
	 * @param {string} path
	 */
	protected constructor(public readonly providerType: ProviderType,
	                      rawRemote: string,
	                      rawApiBase: string,
	                      public readonly owner: string,
	                      public readonly repo: string,
	                      public readonly sha: string,
	                      public readonly path?: string,
	                      public branch?: string) {
		const [remoteScheme, remoteBase] = splitSchemeFromUrl(rawRemote);
		const [apiScheme, apiBase] = splitSchemeFromUrl(rawApiBase);
		if (apiScheme !== remoteScheme) { // that's confusing, don't handle it
			throw new Error(`Scheme is different between remoteBase ${rawRemote} and apiBase ${rawApiBase}`);
		}
		this.apiBase = apiBase;
		this.scheme = remoteScheme;
		this.remoteBase = remoteBase;
	}

	get url(): string {
		return `${this.scheme}${this.remoteBase}/${this.owner}/${this.repo}`;
	}

	public cloneUrl(creds: ProjectOperationCredentials): string {
		if (!!creds && isBasicAuthCredentials(creds)) {
			return `${this.scheme}${encodeURIComponent(creds.username)}:${encodeURIComponent(creds.password)}@` +
				`${this.remoteBase}/${this.pathComponent}.git`;
		}
		if (!!creds && isGitlabPrivateTokenCredentials(creds)) {
			return `${this.scheme}gitlab-ci-token:${creds.privateToken}@` +
				`${this.remoteBase}/${this.pathComponent}.git`;
		}
		if (!!creds && isTokenCredentials(creds)) {
			const token = creds.token;
			// GitHub App tokens start with v1. and are expected in the password field
			if (!!token && (token.startsWith("v1.") ||
                token.startsWith("ghu_") ||
				token.startsWith("ghs_") ||
				token.startsWith("ghr_"))) {
				return `${this.scheme}atomist:${token}@${this.remoteBase}/${this.pathComponent}.git`;
			} else {
				return `${this.scheme}${token}:x-oauth-basic@${this.remoteBase}/${this.pathComponent}.git`;
			}
		}
		return `${this.scheme}${this.remoteBase}/${this.pathComponent}.git`;
	}

	get pathComponent(): string {
		return this.owner + "/" + this.repo;
	}

	public abstract createRemote(creds: ProjectOperationCredentials, description: string, visibility: string): Promise<ActionResult<this>>;

	public abstract setUserConfig(credentials: ProjectOperationCredentials, project: Configurable): Promise<ActionResult<any>>;

	public abstract raisePullRequest(creds: ProjectOperationCredentials,
	                                 title: string,
	                                 body: string,
	                                 head: string,
	                                 base: string,
	                                 reviewers?: PullRequestReviewer[]): Promise<ActionResult<this>>;

	public abstract deleteRemote(creds: ProjectOperationCredentials): Promise<ActionResult<this>>;
}

function splitSchemeFromUrl(urlWithSchemeAndPossibleTrailingSlash: string): ["http://" | "https://", string] {
	if (!urlWithSchemeAndPossibleTrailingSlash.startsWith("http")) {
		throw new Error(`This URL needs to start with http or https: '${urlWithSchemeAndPossibleTrailingSlash}'`);
	}
	const scheme = urlWithSchemeAndPossibleTrailingSlash.startsWith("http://") ? "http://" : "https://";
	const base = urlWithSchemeAndPossibleTrailingSlash.substr(scheme.length).replace(/\/$/, "");
	return [scheme, base];
}
