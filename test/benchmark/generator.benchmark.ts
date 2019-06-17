import "mocha";
import * as assert from "power-assert";

import {
    ActionResult,
    successOn,
} from "../../lib/action/ActionResult";
import { GitHubRepoRef } from "../../lib/operations/common/GitHubRepoRef";
import { ProjectOperationCredentials } from "../../lib/operations/common/ProjectOperationCredentials";
import { RepoId } from "../../lib/operations/common/RepoId";
import {
    generate,
    ProjectPersister,
} from "../../lib/operations/generate/generatorUtils";
import { LocalProject } from "../../lib/project/local/LocalProject";
import { NodeFsLocalProject } from "../../lib/project/local/NodeFsLocalProject";
import { InMemoryProject } from "../../lib/project/mem/InMemoryProject";
import { Project } from "../../lib/project/Project";

describe("generator benchmark", () => {

    const numberOfTimesToGenerate = 500;
    const numberOfSeedProjectFiles = 50;
    const numberOfLipsumInFile = 10;

    it("should create a new GitHub repo using GenericGenerator", done => {
        const repoName = "perfTestRepo";

        const seed = constructProject(numberOfSeedProjectFiles, numberOfLipsumInFile);
        generateFromSeed(seed, repoName)
            .then(r => {
                const result = r as ActionResult<LocalProject>;
                NodeFsLocalProject.fromExistingDirectory(new GitHubRepoRef("atomist", repoName), result.target.baseDir)
                    .then(created => {
                        created.totalFileCount().then(fileCount =>
                            assert.deepEqual(fileCount, numberOfSeedProjectFiles),
                        ).then(
                            () => {
                                const generationPromises: Array<Promise<any>> = [];
                                for (let i = 1; i < numberOfTimesToGenerate; i++) {
                                    generationPromises.push(generateFromSeed(seed, repoName));
                                }
                                Promise.all(generationPromises).then(done);
                            },
                            done,
                        );
                    });
            });
    }).timeout(90000);
});

const generateFromSeed = (seed: Project, repoName: string): Promise<ActionResult<Project>> => {
    const targetRepo = new GitHubRepoRef("atomist", repoName);
    return generate(seed,
        undefined,
        {},
        p => Promise.resolve(p),
        MockProjectPersister,
        targetRepo,
    );
};

const MockProjectPersister: ProjectPersister<Project> =
    (p: Project,
     creds: ProjectOperationCredentials,
     targetId: RepoId) => {
        return Promise.resolve(successOn(p));
    };

const lipsum = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et
dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\n`;

const constructProject = (fileCount: number, lipsumCountPerFile: number): Project => {
    let fileContent: string = "";
    for (let i = 0; i < lipsumCountPerFile; i++) {
        fileContent = fileContent.concat(lipsum);
    }
    const files = [];
    for (let i = 0; i < fileCount; i++) {
        files.push({
            path: "file" + i + ".txt",
            content: fileContent,
        });
    }
    return InMemoryProject.of(...files);
};
