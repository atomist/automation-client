import * as assert from "power-assert";

import "mocha";
import { InMemoryFile } from "../../../src/project/mem/InMemoryFile";
import { InMemoryProject } from "../../../src/project/mem/InMemoryProject";
import { findMatches, zapAllMatches } from "../../../src/tree/ast/astUtils";
import { ZapTrailingWhitespace } from "../../../src/tree/ast/FileHits";
import { TypeScriptES6FileParser } from "../../../src/tree/ast/typescript/TypeScriptFileParser";

describe("astUtils", () => {

    describe("function registry", () => {

        it("runs custom check", done => {
            const f = new InMemoryFile("src/test.ts",
                "const x: number = 10; const y = 13; const xylophone = 3;");
            const p = InMemoryProject.of(f);
            findMatches(p,
                TypeScriptES6FileParser,
                "src/**/*.ts",
                "//VariableDeclaration[?check]/Identifier",
                { check: n => n.$value.includes("x")})
                .then(matches => {
                    assert(matches.length === 2);
                    assert(!!matches[0].sourceLocation);
                    assert(matches[0].sourceLocation.offset === matches[0].$offset);
                    assert(matches[0].sourceLocation.lineFrom1 > 0);
                    assert.deepEqual(matches.map(m => m.$value), ["x", "xylophone"]);
                    done();
                }).catch(done);
        });

    });

    describe("zapAllMatches", () => {

        it("should zap simple", done => {
            const f = new InMemoryFile("src/test.ts", "const x: number = 10;");
            const p = InMemoryProject.of(f);
            zapAllMatches(p, TypeScriptES6FileParser,
                "src/**/*.ts",
                `//VariableDeclaration//ColonToken/following-sibling::* |
                                    //VariableDeclaration//ColonToken`)
                .then(() => {
                    const f2 = p.findFileSync(f.path);
                    assert.equal(f2.getContentSync(), "const x  = 10;");
                    done();
                }).catch(done);
        });

        it("#105: should zap match and zap following whitespace", done => {
            const f = new InMemoryFile("src/test.ts", "const x: number = 10;");
            const p = InMemoryProject.of(f);
            zapAllMatches(p, TypeScriptES6FileParser,
                "src/**/*.ts",
                `//VariableDeclaration//ColonToken/following-sibling::* |
                                    //VariableDeclaration//ColonToken`,
                ZapTrailingWhitespace)
                .then(() => {
                    const f2 = p.findFileSync(f.path);
                    assert.equal(f2.getContentSync(), "const x= 10;");
                    done();
                }).catch(done);
        });

        it("#105: should zap match and replace following whitespace", done => {
            const f = new InMemoryFile("src/test.ts", "const x: number = 10;");
            const p = InMemoryProject.of(f);
            zapAllMatches(p, TypeScriptES6FileParser,
                "src/**/*.ts",
                `//VariableDeclaration//ColonToken/following-sibling::* |
                                    //VariableDeclaration//ColonToken`,
                {replaceAfter: {after: /\s*/, replacement: " "}})
                .then(() => {
                    const f2 = p.findFileSync(f.path);
                    assert.equal(f2.getContentSync(), "const x = 10;");
                    done();
                }).catch(done);
        });

    });

});

describe("findMatches in action", () => {
    it("can flush this and it works", done => {
        const Before = `import { GitCommandGitProject } from "../../project/git/GitCommandGitProject";
import { GitProject } from "../../project/git/GitProject";
import { GitHubRepoRef, isGitHubRepoRef } from "./GitHubRepoRef";
import { ProjectOperationCredentials } from "./ProjectOperationCredentials";
import { RepoLoader } from "./repoLoader";

/**
 * Materialize from github
 * @param credentials provider token
 * @return function to materialize repos
 * @constructor
 */
export function gitHubRepoLoader(credentials: ProjectOperationCredentials): RepoLoader<GitProject> {
    return repoId => {
        // Default it if it isn't already a GitHub repo ref
        const gid = isGitHubRepoRef(repoId) ? repoId : new GitHubRepoRef(repoId.owner, repoId.repo, repoId.sha);
        return GitCommandGitProject.cloned(credentials, gid);
    };
}`

        const mutableProject = InMemoryProject.of({path: "src/gitHubRepoLoader.ts", content: Before});

        const After = `import { GitCommandGitProject } from "../../project/git/GitCommandGitProject";
import { GitProject } from "../../project/git/GitProject";
import { GitHubRepoRef, isGitHubRepoRef } from "./GitHubRepoRef";
import { ProjectOperationCredentials } from "./ProjectOperationCredentials";
import { RepoLoader } from "./repoLoader";

/**
 * Materialize from github
 * @param credentials provider token
 * @return function to materialize repos
 * @constructor
 */
export function gitHubRepoLoader(context: HandlerContext, credentials: ProjectOperationCredentials): RepoLoader<GitProject> {
    return repoId => {
        // Default it if it isn't already a GitHub repo ref
        const gid = isGitHubRepoRef(repoId) ? repoId : new GitHubRepoRef(repoId.owner, repoId.repo, repoId.sha);
        return GitCommandGitProject.cloned(credentials, gid);
    };
}`;

        return findMatches(mutableProject, TypeScriptES6FileParser, "**/" + "src/gitHubRepoLoader.ts",
            `//FunctionDeclaration[/Identifier[@value='gitHubRepoLoader']]`)
            .then(matches => {
                const enclosingFunction = matches[0];
                const newValue = enclosingFunction.$value.replace(
                    /gitHubRepoLoader\s*\(/g,
                    `gitHubRepoLoader(context: HandlerContext, `);
                enclosingFunction.$value = newValue;
            })
            .then(() => mutableProject.flush())
            .then(() => {
                const modified = mutableProject.findFileSync("src/gitHubRepoLoader.ts").getContentSync();

                assert.equal(modified, After, modified);

            }).then(() => done(), done)

    }).timeout(20000)
});
