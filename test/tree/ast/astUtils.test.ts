import { toPathExpression } from "@atomist/tree-path";
import "mocha";
import * as assert from "power-assert";
import { InMemoryFile } from "../../../lib/project/mem/InMemoryFile";
import { InMemoryProject } from "../../../lib/project/mem/InMemoryProject";
import {
    findMatches,
    gatherFromMatches,
    literalValues,
    matchIterator,
    zapAllMatches,
} from "../../../lib/tree/ast/astUtils";
import { MatchResult, ZapTrailingWhitespace } from "../../../lib/tree/ast/FileHits";
import { TypeScriptES6FileParser } from "../../../lib/tree/ast/typescript/TypeScriptFileParser";

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
                { check: n => n.$value.includes("x") })
                .then(matches => {
                    assert.equal(matches.length, 2);
                    assert(!!matches[0].sourceLocation);
                    assert.equal(matches[0].sourceLocation.offset, matches[0].$offset);
                    assert(matches[0].sourceLocation.lineFrom1 > 0);
                    assert.deepEqual(matches.map(m => m.$value), ["x", "xylophone"]);
                    done();
                }).catch(done);
        });

        it("runs custom check with generator style", async () => {
            const f = new InMemoryFile("src/test.ts",
                "const x: number = 10; const y = 13; const xylophone = 3;");
            const p = InMemoryProject.of(f);
            const matches = matchIterator(p,
                {
                    parseWith: TypeScriptES6FileParser,
                    globPatterns: "src/**/*.ts",
                    pathExpression: "//VariableDeclaration[?check]/Identifier",
                    functionRegistry: { check: n => n.$value.includes("x") },
                });
            let i = 0;
            for await (const match of matches) {
                if (i === 0) {
                    assert(!!match.sourceLocation);
                    assert.equal(match.sourceLocation.offset, match.$offset);
                    assert(match.sourceLocation.lineFrom1 > 0);
                    assert.strictEqual(match.$value, "x");
                }
                if (i === 1) {
                    assert.strictEqual(match.$value, "xylophone");
                }
                ++i;
            }
            assert.strictEqual(i, 2);
        });

    });

    describe("gatherFromMatches", () => {

        it("should save simple", done => {
            const f = new InMemoryFile("src/test.ts",
                "const x: number = 10; const y = 13; const xylophone = 3;");
            const p = InMemoryProject.of(f);
            gatherFromMatches<number>(p,
                TypeScriptES6FileParser,
                "src/**/*.ts",
                "//VariableDeclaration[?check]/Identifier",
                m => m.$value.length,
                { check: n => n.$value.includes("x") })
                .then(matches => {
                    assert.equal(matches.length, 2);
                    assert.deepEqual(matches, ["x".length, "xylophone".length]);
                    done();
                }).catch(done);
        });

        it("matchIterator: save simple", async () => {
            const f = new InMemoryFile("src/test.ts",
                "const x: number = 10; const y = 13; const xylophone = 3;");
            const p = InMemoryProject.of(f);
            const it = matchIterator(p,
                {
                    parseWith: TypeScriptES6FileParser,
                    globPatterns: "src/**/*.ts",
                    pathExpression: "//VariableDeclaration[?check]/Identifier",
                    functionRegistry: { check: n => n.$value.includes("x") },
                });
            const matches: string[] = [];
            for await (const match of it) {
                matches.push(match.$value);
            }
            assert.equal(matches.length, 2);
            assert.deepEqual(matches, ["x", "xylophone"]);
        });

        it("matchIterator: save simple and jump out", async () => {
            const f = new InMemoryFile("src/test.ts",
                "const x: number = 10; const y = 13; const xylophone = 3;");
            const p = InMemoryProject.of(f);
            let filterInvocations = 0;
            const it = matchIterator(p,
                {
                    parseWith: TypeScriptES6FileParser,
                    globPatterns: "src/**/*.ts",
                    pathExpression: "//VariableDeclaration[?check]/Identifier",
                    functionRegistry: { check: n => n.$value.includes("x") },
                    fileFilter: async () => { ++filterInvocations; return true; },
                });
            const matches: string[] = [];
            for await (const match of it) {
                matches.push(match.$value);
                if (matches.length > 0) {
                    break;
                }
            }
            assert.equal(filterInvocations, 1);
            assert.equal(matches.length, 1);
            assert.deepEqual(matches, ["x"]);
        });

        it("should suppress undefined", done => {
            const f = new InMemoryFile("src/test.ts",
                "const x: number = 10; const y = 13; const xylophone = 3;");
            const p = InMemoryProject.of(f);
            gatherFromMatches<number>(p,
                TypeScriptES6FileParser,
                "src/**/*.ts",
                "//VariableDeclaration[?check]/Identifier",
                m => m.$value.length <= 1 ? undefined : m.$value.length,
                { check: n => n.$value.includes("x") })
                .then(matches => {
                    assert.equal(matches.length, 1);
                    assert.deepEqual(matches, ["xylophone".length]);
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

        it("should zap simple with globs array", done => {
            const f = new InMemoryFile("src/test.ts", "const x: number = 10;");
            const p = InMemoryProject.of(f);
            zapAllMatches(p, TypeScriptES6FileParser,
                ["src/**/*.ts", "src/never/match/*"],
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
                { replaceAfter: { after: /\s*/, replacement: " " } })
                .then(() => {
                    const f2 = p.findFileSync(f.path);
                    assert.equal(f2.getContentSync(), "const x = 10;");
                    done();
                }).catch(done);
        });

    });

    describe("literalValues", () => {

        it("should return none", () => {
            const pex = toPathExpression("//foo");
            assert.strictEqual(literalValues(pex).length, 0);
        });

        it("should return true with nesting", () => {
            const pex = toPathExpression(`//normalClassDeclaration
                                [//annotation[@value='@SpringBootApplication']]
                                /identifier`);
            assert.deepEqual(literalValues(pex), ["@SpringBootApplication"]);
        });

        it("should return true with nesting and multiple predicates", () => {
            const pex = toPathExpression(`//normalClassDeclaration
                                [//annotation[@value='@SpringBootApplication']]
                                /identifier[@value='foo']`);
            assert.deepEqual(literalValues(pex), ["@SpringBootApplication", "foo"]);
        });

        it("should not opine on a union path expression", () => {
            const pex = toPathExpression(`//normalClassDeclaration
                                [//annotation[@value='@SpringBootApplication']]
                                /identifier[@value='foo'] | //foo`);
            assert.deepEqual(literalValues(pex), []);
        });

    });

});

describe("findMatches in action", () => {
    it("can flush this and it works", done => {
        const Before = `import { GitCommandGitProject } from "../../project/git/GitCommandGitProject";
import { GitProject } from "../../project/git/GitProject";
import {
    GitHubRepoRef,
    isGitHubRepoRef,
} from "./GitHubRepoRef";
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
}`;

        const mutableProject = InMemoryProject.of({ path: "src/gitHubRepoLoader.ts", content: Before });

        const After = `import { GitCommandGitProject } from "../../project/git/GitCommandGitProject";
import { GitProject } from "../../project/git/GitProject";
import {
    GitHubRepoRef,
    isGitHubRepoRef,
} from "./GitHubRepoRef";
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

        findMatches(mutableProject, TypeScriptES6FileParser, "**/" + "src/gitHubRepoLoader.ts",
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

            }).then(() => done(), done);

    }).timeout(20000);
});
