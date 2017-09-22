import "mocha";

import * as assert from "power-assert";
import { JavaPackageDeclaration } from "../../../src/operations/generate/java/JavaGrammars";
import { JavaFiles } from "../../../src/operations/generate/java/javaProjectUtils";
import { InMemoryFile } from "../../../src/project/mem/InMemoryFile";
import { InMemoryProject } from "../../../src/project/mem/InMemoryProject";
import { doWithFileMatches, findFileMatches, Match } from "../../../src/project/util/parseUtils";

describe("parseUtils", () => {

    it("gathers matches from files", done => {
        const t = new InMemoryProject("name");
        t.addFileSync("src/main/java/com/foo/bar/Thing.java",
            "package com.foo.bar;\npublic class Thing {}");
        t.addFileSync("src/main/java/com/foo/baz/Thing2.java",
            "package com.foo.baz;\npublic class Thing2 {}");
        findFileMatches<{ name: string }>(t, JavaFiles, JavaPackageDeclaration)
            .then(matches => {
                assert(matches.length === 2);
                assert.deepEqual(matches.map(m => m.file.path), t.filesSync.map(m => m.path));
                matches[0].matches.forEach(m => {
                    assert(m.$offset !== undefined);
                });
                done();
            }).catch(done);
    });

    it("updates matches from files", done => {
        const oldPackage = "com.foo.bar";
        const t = new InMemoryProject("name");
        const initialContent = `package ${oldPackage};\npublic class Thing {}`;
        const f = new InMemoryFile("src/main/java/com/foo/bar/Thing.java", initialContent);
        t.addFileSync(f.path, f.getContentSync());
        findFileMatches<{ name: string }>(t, JavaFiles, JavaPackageDeclaration)
            .then(fileMatches => {
                assert(fileMatches.length === 1);
                assert(fileMatches[0].file.path === f.path);
                assert(fileMatches[0].matches[0].name === oldPackage);
                fileMatches[0].makeUpdatable();
                const m: Match<{ name: string }> = fileMatches[0].matches[0];

                assert(m.name === oldPackage, `Expected [${oldPackage}] got [${m.name}]`);
                // Add x to package names. Yes, this makes no sense in Java
                // but it's not meant to be domain meaningful
                m.name = m.name + "x";
                assert(m.name);

                assert(m.name === oldPackage + "x");

                // Check file persistence
                assert(fileMatches[0].file.getContentSync() === initialContent);
                return t
                    .flush()
                    .then(_ => {
                        const updatedFile = t.findFileSync(f.path);
                        assert(updatedFile.getContentSync() === initialContent.replace(oldPackage, oldPackage + "x"),
                            `Content is [${updatedFile.getContentSync()}]`);
                        done();
                    });
            }).catch(done);
    });

    it("updates matches from files using callback", done => {
        const oldPackage = "com.foo.bar";
        const t = new InMemoryProject("name");
        const initialContent = `package ${oldPackage};\npublic class Thing {}`;
        const f = new InMemoryFile("src/main/java/com/foo/bar/Thing.java", initialContent);
        t.addFileSync(f.path, f.getContentSync());
        doWithFileMatches<{ name: string }>(t, JavaFiles, JavaPackageDeclaration, fh => {
            assert(fh.file.path === f.path);
            assert(fh.matches[0].name === oldPackage);
            const m: Match<{ name: string }> = fh.matches[0];

            assert(m.name === oldPackage, `Expected [${oldPackage}] got [${m.name}]`);
            // Add x to package names. Yes, this makes no sense in Java
            // but it's not meant to be domain meaningful
            m.name = m.name + "x";
            assert(m.name);
            assert(m.name === oldPackage + "x");
        }).run()
            .then(_ => {
                // Check file persistence
                const updatedFile = t.findFileSync(f.path);
                assert(updatedFile.getContentSync() === initialContent.replace(oldPackage, oldPackage + "x"),
                    `Content is [${updatedFile.getContentSync()}]`);
                done();
            }).catch(done);
    });

    it("updates matches from files using callback and defer", done => {
        const oldPackage = "com.foo.bar";
        const t = new InMemoryProject("name");
        const initialContent = `package ${oldPackage};\npublic class Thing {}`;
        const f = new InMemoryFile("src/main/java/com/foo/bar/Thing.java", initialContent);
        t.addFileSync(f.path, f.getContentSync());
        assert(!t.dirty);
        doWithFileMatches<{ name: string }>(t, JavaFiles, JavaPackageDeclaration, fh => {
            assert(fh.file.path === f.path);
            assert(fh.matches[0].name === oldPackage);
            fh.makeUpdatable();
            const m: Match<{ name: string }> = fh.matches[0];
            assert(m.name === oldPackage, `Expected [${oldPackage}] got [${m.name}]`);
            // Add x to package names. Yes, this makes no sense in Java
            // but it's not meant to be domain meaningful
            m.name = m.name + "x";
            assert(m.name);
            assert(m.name === oldPackage + "x");
            assert(fh.file.dirty, "File should be dirty");
        }).defer();
        assert(t.dirty);
        t.flush().then(_ => {
            // Check file persistence
            // assert(!t.dirty, "Unexpected actions were " + (t as any).actions.map(a => a.toString()).join(","));

            const updatedFile = t.findFileSync(f.path);
            assert(updatedFile.getContentSync() === initialContent.replace(oldPackage, oldPackage + "x"),
                `Content is [${updatedFile.getContentSync()}]`);
            done();
        }).catch(done);
    });

});
