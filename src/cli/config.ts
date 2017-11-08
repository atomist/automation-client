#!/usr/bin/env node

import * as child_process from "child_process";
import * as fs from "fs-extra";
import * as GitHubApi from "github";
import * as inquirer from "inquirer";
import * as os from "os";
import * as p from "path";
import * as process from "process";

import { UserConfigFile, writeUserConfig } from "../configuration";
import { LoggingConfig } from "../internal/util/logger";

LoggingConfig.format = "cli";
const github = new GitHubApi();

function createGitHubToken(user: string, password: string, mfa?: string): Promise<string> {
    github.authenticate({
        type: "basic",
        username: user,
        password,
    });
    const host = os.hostname();
    const params: GitHubApi.AuthorizationCreateParams = {
        scopes: ["read:org"],
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

function atomistConfig(argv: string[]) {

    if (fs.existsSync(UserConfigFile)) {
        console.warn(`User configuration file, ${UserConfigFile}, already exists, exiting`);
        process.exit(0);
    }

    let gitHubToken: string;
    let slackTeamId: string;
    const questions: inquirer.Questions = [];
    if (process.argv.length < 3) {
        questions.push({
            type: "input",
            name: "teamId",
            message: "Slack Team ID",
            validate: value => {
                if (value.indexOf("T") !== 0) {
                    return `The Slack team ID you entered should start with 'T' but does not: ${value}`;
                }
                return true;
            },
        });
    } else {
        slackTeamId = process.argv[2];
    }
    questions.push(
        {
            type: "input",
            name: "user",
            message: "GitHub Username",
            validate: value => {
                if (!/^[-.A-Za-z0-9]+$/.test(value)) {
                    return `The GitHub username you entered contains invalid characters: ${value}`;
                }
                return true;
            },
        },
        {
            type: "password",
            name: "password",
            message: "GitHub Password",
            validate: value => {
                if (value.length < 1) {
                    return `The GitHub password you entered is empty`;
                }
                return true;
            },
        },
        {
            type: "input",
            name: "mfa",
            message: "GitHub 2FA Code",
            when: answers => {
                return createGitHubToken(answers.user, answers.password)
                    .then(token => {
                        gitHubToken = token;
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
        } as any as inquirer.Question,
    );

    console.log(`
As part of the initial Atomist configuration, we need to create a
GitHub personal access token for you that will be used to authenticate
with the Atomist API.  The personal access token will have "read:org"
scope, be labeled as being for the "Atomist API", and will be written
to a file on your local machine.  Atomist does not record the token
nor your GitHub username and password.
`);
    inquirer.prompt(questions).then(answers => {
        if (!slackTeamId) {
            slackTeamId = answers.teamId;
        }

        if (!gitHubToken) {
            if (answers.mfa) {
                return createGitHubToken(answers.user, answers.password, answers.mfa)
                    .then(token => {
                        return writeUserConfig({
                            token,
                            teamIds: [slackTeamId],
                        });
                    })
                    .catch(reason => {
                        console.error(`failed to create user config: ${JSON.stringify(reason)}`);
                        process.exit(1);
                    });
            } else {
                console.error(`Failed to generate GitHub token with provided credentials`);
                process.exit(1);
            }
        }
        return writeUserConfig({
            token: gitHubToken,
            teamIds: [slackTeamId],
        });
    }).then(() => {
        console.info(`Successfully created Atomist user configuration`);
        process.exit(0);
    }).catch(err => {
        console.error(`Failed to create user config: ${JSON.stringify(err)}`);
        process.exit(1);
    });
}

atomistConfig(process.argv);
