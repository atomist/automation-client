import * as appRoot from "app-root-path";
import * as fs from "fs-extra";
import "mocha";
import * as assert from "power-assert";
import * as tmp from "tmp-promise";

import {
    cleanGitUrl,
    obtainGitInfo,
} from "../../../lib/internal/env/gitInfo";

describe("gitInfo", () => {

    it("verify git info", done => {
        obtainGitInfo(appRoot.path)
            .then(info => {
                assert(info.branch);
                assert(info.repository);
                assert(info.sha);
            }).then(() => done(), done);

    });

    const repo = "git@github.com:atomist/prince-automation.git";
    const gitConfig = `[core]
	repositoryformatversion = 0
	filemode = true
	bare = false
	logallrefupdates = true
	ignorecase = true
	precomposeunicode = true
[remote "origin"]
	url = ${repo}
	fetch = +refs/heads/*:refs/remotes/origin/*
[branch "master"]
	remote = origin
	merge = refs/heads/master
	pushRemote = origin
[branch "update-build"]
	pushRemote = origin
`;

    it("verify correct git info", done => {
        tmp.dir({ unsafeCleanup: true })
            .then(dir => {
                const gitDir = dir.path + "/.git";
                const gitRefsDir = gitDir + "/refs/heads";
                fs.ensureDirSync(gitRefsDir);
                fs.ensureDirSync(gitDir + "/refs/tags");
                fs.ensureDirSync(gitDir + "/objects/info");
                fs.ensureDirSync(gitDir + "/objects/pack");
                const branch = "git-info-131";
                const sha = "7629f65faaf63919041bb703962cac59a7c415bc";
                fs.writeFileSync(gitDir + "/config", gitConfig);
                fs.writeFileSync(gitDir + "/HEAD", `ref: refs/heads/${branch}\n`);
                fs.writeFileSync(`${gitRefsDir}/${branch}`, `${sha}\n`);
                return obtainGitInfo(dir.path)
                    .then(info => {
                        assert(info.branch === branch);
                        assert(info.repository === repo);
                        assert(info.sha === sha);
                    })
                    .then(() => dir.cleanup());
            }).then(() => done(), done);

    });

    it("verify correct git info for branch with /", done => {
        tmp.dir({ unsafeCleanup: true })
            .then(dir => {
                const gitDir = dir.path + "/.git";
                const gitRefsDir = gitDir + "/refs/heads";
                fs.ensureDirSync(gitRefsDir + "/nortissej");
                fs.ensureDirSync(gitDir + "/refs/tags");
                fs.ensureDirSync(gitDir + "/objects/info");
                fs.ensureDirSync(gitDir + "/objects/pack");
                const branch = "nortissej/git-info-131";
                const sha = "7629f65faaf63919041bb703962cac59a7c415bc";
                fs.writeFileSync(gitDir + "/config", gitConfig);
                fs.writeFileSync(gitDir + "/HEAD", `ref: refs/heads/${branch}\n`);
                fs.writeFileSync(`${gitRefsDir}/${branch}`, `${sha}\n`);
                return obtainGitInfo(dir.path)
                    .then(info => {
                        assert(info.branch === branch);
                        assert(info.repository === repo);
                        assert(info.sha === sha);
                    })
                    .then(() => dir.cleanup());
            }).then(() => done(), done);

    });

    it("verify correct git info for SHA checkout", done => {
        tmp.dir({ unsafeCleanup: true })
            .then(dir => {
                const gitDir = dir.path + "/.git";
                const gitRefsDir = gitDir + "/refs/heads";
                fs.ensureDirSync(gitRefsDir);
                fs.ensureDirSync(gitDir + "/refs/tags");
                fs.ensureDirSync(gitDir + "/objects/info");
                fs.ensureDirSync(gitDir + "/objects/pack");
                const sha = "7629f65faaf63919041bb703962cac59a7c415bc";
                fs.writeFileSync(gitDir + "/config", gitConfig);
                fs.writeFileSync(gitDir + "/HEAD", `${sha}\n`);
                return obtainGitInfo(dir.path)
                    .then(info => {
                        assert(info.branch === sha);
                        assert(info.repository === repo);
                        assert(info.sha === sha);
                    })
                    .then(() => dir.cleanup());
            }).then(() => done(), done);

    });

    it("verify git info empty for non-git repo path", done => {
        tmp.dir({ unsafeCleanup: true })
            .then(dir => {
                return obtainGitInfo(dir.path)
                    .then(info => {
                        assert(info.branch === "");
                        assert(info.repository === "");
                        assert(info.sha === "");
                    })
                    .then(() => dir.cleanup());
            }).then(() => done(), done);

    });

    it("clean up git url", () => {
        const url = "https://axxxxxxxxxxxx5:x-oauth-basic@github.com/atomist/github-sdm.git";
        const cleanUrl = cleanGitUrl(url);
        assert.equal(cleanUrl, "git@github.com:atomist/github-sdm.git");
    });

});
