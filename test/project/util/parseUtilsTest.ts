import "mocha";

import { Microgrammar } from "@atomist/microgrammar/Microgrammar";
import { Integer } from "@atomist/microgrammar/Primitives";
import * as assert from "power-assert";
import { JavaPackageDeclaration } from "../../../src/operations/generate/java/JavaGrammars";
import { JavaFiles } from "../../../src/operations/generate/java/javaProjectUtils";
import { AllFiles } from "../../../src/project/FileGlobs";
import { InMemoryFile } from "../../../src/project/mem/InMemoryFile";
import { InMemoryProject } from "../../../src/project/mem/InMemoryProject";
import { Project } from "../../../src/project/Project";
import {
    DefaultOpts,
    doWithFileMatches, doWithUniqueMatch, findFileMatches, findMatches,
    Match,
} from "../../../src/project/util/parseUtils";
import { tempProject } from "../utils";

describe("parseUtils", () => {

    it("gathers matches without files", done => {
        const t = new InMemoryProject("name");
        t.addFileSync("src/main/java/com/foo/bar/Thing.java",
            "package com.foo.bar;\npublic class Thing {}");
        t.addFileSync("src/main/java/com/foo/baz/Thing2.java",
            "package com.foo.baz;\npublic class Thing2 {}");
        findMatches<{ name: string }>(t, JavaFiles, JavaPackageDeclaration)
            .then(matches => {
                assert(matches.length === 2);
                matches.forEach(m => {
                    assert(m.$offset !== undefined);
                });
                done();
            }).catch(done);
    });

    it("gathers no matches without files", done => {
        const t = new InMemoryProject("name");
        findMatches<{ name: string }>(t, JavaFiles, JavaPackageDeclaration)
            .then(matches => {
                assert(matches.length === 0);
                done();
            }).catch(done);
    });

    it("gathers no matches without matches in files", done => {
        const t = new InMemoryProject("name");
        t.addFileSync("src/main/java/com/foo/bar/Thing.java",
            "package com.foo.bar;\npublic class Thing {}");
        t.addFileSync("src/main/java/com/foo/baz/Thing2.java",
            "package com.foo.baz;\npublic class Thing2 {}");
        findMatches<{ name: string }>(t, JavaFiles, Microgrammar.fromString("this won't match"))
            .then(matches => {
                assert(matches.length === 0);
                done();
            }).catch(done);
    });

    it("gathers matches from files", done => {
        const t = new InMemoryProject("name");
        t.addFileSync("src/main/java/com/foo/bar/Thing.java",
            "package com.foo.bar;\npublic class Thing {}");
        t.addFileSync("src/main/java/com/foo/baz/Thing2.java",
            "package com.foo.baz;\npublic class Thing2 {}");
        findFileMatches<{ name: string }>(t, JavaFiles, JavaPackageDeclaration)
            .then(fileMatches => {
                assert(fileMatches.length === 2);
                assert.deepEqual(fileMatches.map(m => m.file.path), t.filesSync.map(m => m.path));
                fileMatches[0].matches.forEach(m => {
                    assert(m.$offset !== undefined);
                });
                done();
            }).catch(done);
    });

    it("gathers matches from files with transform", done => {
        interface Person { name: string; age: number; }
        const mg = Microgrammar.fromString <Person>(
            "${name}:${age}",
            {
                name: /[a-z]+/,
                age: Integer,
            });
        const t = InMemoryProject.of(
            {path: "thing", content: "tony:50"});
        findFileMatches<Person>(t, AllFiles, mg, {
            ...DefaultOpts,
            contentTransformer: content => content.replace("tony", "gordon"),
        })
            .then(fileMatches => {
                assert(fileMatches.length === 1);
                assert(fileMatches[0].matches[0].name === "gordon");
                assert(fileMatches[0].matches[0].age === 50);
                done();
            }).catch(done);
    });

    it("updates matches from files: in memory", done => {
        updateMatchesFromFiles(new InMemoryProject(""), done);
    });

    it("updates matches from files: on disk", done => {
        updateMatchesFromFiles(tempProject(), done);
    });

    function updateMatchesFromFiles(p: Project, done) {
        const oldPackage = "com.foo.bar";
        const initialContent = `package ${oldPackage};\npublic class Thing {}`;
        const f = new InMemoryFile("src/main/java/com/foo/bar/Thing.java", initialContent);
        p.addFileSync(f.path, f.getContentSync());
        findFileMatches<{ name: string }>(p, JavaFiles, JavaPackageDeclaration)
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
                return p
                    .flush()
                    .then(_ => {
                        const updatedFile = p.findFileSync(f.path);
                        assert(updatedFile.getContentSync() === initialContent.replace(oldPackage, oldPackage + "x"),
                            `Content is [${updatedFile.getContentSync()}]`);
                        done();
                    });
            }).catch(done);
    }

    it("updates matches from files using callback", done => {
        const oldPackage = "com.foo.bar";
        const t = tempProject();
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

    function updateUniqueMatchFromFilesUsingCallback(p: Project, done) {
        const oldPackage = "com.foo.bar";
        const initialContent = `package ${oldPackage};\npublic class Thing {}`;
        const f = new InMemoryFile("src/main/java/com/foo/bar/Thing.java", initialContent);
        p.addFileSync(f.path, f.getContentSync());
        doWithUniqueMatch<{ name: string }>(p, JavaFiles, JavaPackageDeclaration, m => {
            assert(m.name === oldPackage, `Expected [${oldPackage}] got [${m.name}]`);
            // Add x to package names. Yes, this makes no sense in Java
            // but it's not meant to be domain meaningful
            m.name = m.name + "x";
            assert(m.name);
            assert(m.name === oldPackage + "x");
        }).run()
            .then(_ => {
                // Check file persistence
                const updatedFile = p.findFileSync(f.path);
                assert(updatedFile.getContentSync() === initialContent.replace(oldPackage, oldPackage + "x"),
                    `Content is [${updatedFile.getContentSync()}]`);
                done();
            }).catch(done);
    }

    it("updates unique match from files using callback: in memory", done =>
        updateUniqueMatchFromFilesUsingCallback(new InMemoryProject(""), done),
    );

    it("updates unique match from files using callback: on disk", done =>
        updateUniqueMatchFromFilesUsingCallback(tempProject(), done),
    );

    it("updates unique match from files using callback: fail with zero", done => {
        const t = new InMemoryProject("name");
        const initialContent = `public class Thing {}`;
        const f = new InMemoryFile("src/main/java/Thing.java", initialContent);
        t.addFileSync(f.path, f.getContentSync());
        doWithUniqueMatch<{ name: string }>(t, JavaFiles, JavaPackageDeclaration, m => {
            throw new Error("Should not be invoked");
        }).run()
            .catch(err => {
                // Check file persistence
                const updatedFile = t.findFileSync(f.path);
                assert(updatedFile.getContentSync() === initialContent);
                done();
            });
    });

    it("updates unique match from files using callback: fail with 2", done => {
        const t = tempProject();
        const initialContent1 = `package com.foo.bar;\npublic class Thing1 {}`;
        const initialContent2 = `package com.foo.bar;\npublic class Thing2 {}`;
        const f1 = new InMemoryFile("src/main/java/com/foo/bar/Thing1.java", initialContent1);
        const f2 = new InMemoryFile("src/main/java/com/foo/bar/Thing2.java", initialContent2);

        t.addFileSync(f1.path, f1.getContentSync());
        t.addFileSync(f2.path, f2.getContentSync());
        doWithUniqueMatch<{ name: string }>(t, JavaFiles, JavaPackageDeclaration, m => {
            // Doesn't matter
        }).run()
            .catch(err => {
                // Check file persistence
                console.log(err);
                const updatedFile = t.findFileSync(f1.path);
                assert(updatedFile.getContentSync() === initialContent1);
                done();
            });
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

    it("updates nested matches from files using callback", done => {
        const t = new InMemoryProject("name");
        const initialContent = `tom:61 alice:27`;
        const f = new InMemoryFile("People", initialContent);
        t.addFileSync(f.path, f.getContentSync());
        doWithFileMatches<Entry>(t, "People", nestedGrammar, fh => {
            assert(fh.file.path === f.path);
            assert(fh.matches.length === 2);
            const m = fh.matches[0];
            assert(m.person.name === "tom");
            assert(m.person.age === 61);
            // Add x to package names. Yes, this makes no sense in Java
            // but it's not meant to be domain meaningful
            m.person.name = "teriko";
            assert(m.person.name);
            assert(m.person.name === "teriko");
            fh.matches[1].person.name = "andy";
        }).run()
            .then(_ => {
                // Check file persistence
                const updatedFile = t.findFileSync(f.path);
                assert(updatedFile.getContentSync() ===
                    initialContent
                        .replace("tom", "teriko")
                        .replace("alice", "andy"),
                    `Content is [${updatedFile.getContentSync()}]`);
                done();
            }).catch(done);
    });

});

const nestedGrammar = Microgrammar.fromDefinitions<Entry>({
    person: {
        name: /[a-z]+/,
        _colon: ":",
        age: Integer,
    },
});

interface Entry {
    person: {
        name: string;
        age: number;
    };
}
