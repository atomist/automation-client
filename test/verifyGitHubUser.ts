import axios from "axios";
import { exit } from "shelljs";
import { GitHubBase } from "../src/project/git/GitProject";
import { GitHubToken } from "./atomist.config";

const GitHubUserWhoCanRunTheTests = "atomist-travisorg";

const config = {
    headers: {
        Authorization: `token ${GitHubToken}`,
    },
};

axios.get(`${GitHubBase}/user`, config)
    .then(response => {
        if (response.data.login !== GitHubUserWhoCanRunTheTests) {
            console.error("To run these tests, set GITHUB_TOKEN to a token for atomist-travisorg");
            process.exit(1);
        }
    })
    .catch(error => {
        console.error("Could not connect to GitHub: " + error.message);
        process.exit(1);
    })
    ;
