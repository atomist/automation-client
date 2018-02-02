import * as GitHubApi from "@octokit/rest";
import * as inquirer from "inquirer";
import * as stringify from "json-stringify-safe";
import * as os from "os";

import {
    getUserConfig,
    UserConfigFile,
    writeUserConfig,
} from "../configuration";

const github = new GitHubApi();

function createGitHubToken(user: string, password: string, mfa?: string): Promise<string> {
    github.authenticate({
        type: "basic",
        username: user,
        password,
    });
    const host = os.hostname();
    const params: GitHubApi.AuthorizationCreateParams = {
        scopes: ["read:org", "repo"],
        note: `Atomist API on ${host}`,
        note_url: "http://www.atomist.com/",
    };
    if (mfa) {
        (params as any).headers = { "X-GitHub-OTP": mfa };
    }
    return github.authorization.create(params).then(res => {
        if (res.data && res.data.token) {
            return res.data.token;
        }
        throw new Error(`GitHub API returned successful but there is no token`);
    });
}

function badSlackTeamMessage(teamId: string): string {
    return `The Slack team ID you entered should start with 'T' but does not: ${teamId}`;
}

export function cliAtomistConfig(argv: any): Promise<number> {

    const argSlackTeamId: string = argv["slack-team"];
    const argGitHubUser: string = argv["github-user"];
    const argGitHubPassword: string = argv["github-password"];
    const argGitHubMfaToken: string = argv["github-mfa-token"];

    const userConfig = getUserConfig();

    if (!userConfig.teamIds) {
        userConfig.teamIds = [];
    }
    if (userConfig.token && userConfig.teamIds.length > 0 && !argSlackTeamId) {
        console.log(`Existing configuration is valid and no team supplied, exiting`);
        return Promise.resolve(0);
    }
    if (argSlackTeamId) {
        if (argSlackTeamId.indexOf("T") !== 0) {
            console.warn(badSlackTeamMessage(argSlackTeamId));
        } else if (!userConfig.teamIds.includes(argSlackTeamId)) {
            userConfig.teamIds.push(argSlackTeamId);
        }
    }

    const questions: inquirer.Questions = [];
    if (userConfig.teamIds.length < 1) {
        questions.push({
            type: "input",
            name: "teamId",
            message: "Slack Team ID",
            validate: value => {
                if (value.indexOf("T") !== 0) {
                    return badSlackTeamMessage(value);
                }
                return true;
            },
        });
    }
    if (!userConfig.token) {
        if (!argGitHubUser) {
            questions.push({
                type: "input",
                name: "user",
                message: "GitHub Username",
                validate: value => {
                    if (!/^[-.A-Za-z0-9]+$/.test(value)) {
                        return `The GitHub username you entered contains invalid characters: ${value}`;
                    }
                    return true;
                },
            });
        }
        if (!argGitHubPassword) {
            questions.push({
                type: "password",
                name: "password",
                message: "GitHub Password",
                validate: value => {
                    if (value.length < 1) {
                        return `The GitHub password you entered is empty`;
                    }
                    return true;
                },
            });
        }
        if (!argGitHubMfaToken) {
            questions.push({
                type: "input",
                name: "mfa",
                message: "GitHub 2FA Code",
                when: answers => {
                    const user = (argGitHubUser) ? argGitHubUser : answers.user;
                    const password = (argGitHubPassword) ? argGitHubPassword : answers.password;
                    return createGitHubToken(user, password)
                        .then(token => {
                            userConfig.token = token;
                            return false;
                        })
                        .catch(err => {
                            if (err.code === 401 && err.message) {
                                const msg = JSON.parse(err.message);
                                const mfaErr = "Must specify two-factor authentication OTP code.";
                                if ((msg.message as string).indexOf(mfaErr) > -1) {
                                    return true;
                                }
                            }
                            throw err;
                        });
                },
                validate: (value, answers) => {
                    if (!/^\d{6}$/.test(value)) {
                        return `The GitHub 2FA you entered is invalid, it should be six digits: ${value}`;
                    }
                    return true;
                },
            } as any as inquirer.Question);
        }
    }

    if (questions.length > 0) {
        console.log(`
As part of the initial Atomist configuration, we need to create a
GitHub personal access token for you that will be used to authenticate
with the Atomist API.  The personal access token will have "read:org"
scope, be labeled as being for the "Atomist API", and will be written
to a file on your local machine.  Atomist does not retain the token
nor your GitHub username and password.
`);
    }

    return inquirer.prompt(questions)
        .then(answers => {
            if (answers.teamId) {
                userConfig.teamIds.push(answers.teamId);
            }

            if (!userConfig.token) {
                const user = (argGitHubUser) ? argGitHubUser : answers.user;
                const password = (argGitHubPassword) ? argGitHubPassword : answers.password;
                const mfa = (argGitHubMfaToken) ? argGitHubMfaToken : answers.mfa;
                return createGitHubToken(user, password, mfa)
                    .then(token => {
                        userConfig.token = token;
                    });
            }
        })
        .then(() => writeUserConfig(userConfig))
        .then(() => {
            console.info(`Successfully created Atomist user configuration`);
            return 0;
        }, err => {
            console.error(`Failed to create user config: ${stringify(err)}`);
            return 1;
        });
}
