import "mocha";
import * as assert from "power-assert";

import { Microgrammar } from "@atomist/microgrammar/Microgrammar";
import { Integer } from "@atomist/microgrammar/Primitives";
import { AllFiles } from "../../../../src/project/fileGlobs";
import { InMemoryProject } from "../../../../src/project/mem/InMemoryProject";
import { findByExpression, findFileMatches, findMatches } from "../../../../src/tree/ast/astUtils";
import { DefaultFileParserRegistry } from "../../../../src/tree/ast/FileParserRegistry";
import { MicrogrammarBasedFileParser } from "../../../../src/tree/ast/microgrammar/MicrogrammarBasedFileParser";

interface Person {
    name: string;
    age: number;
}

describe("microgrammar integration and path expression", () => {

    it("should get into AST", done => {
        const mg = Microgrammar.fromString<Person>("${name}:${age}", {
            age: Integer,
        });
        const fpr = new DefaultFileParserRegistry().addParser(
            new MicrogrammarBasedFileParser("people", "person", mg));
        const p = InMemoryProject.of(
            {path: "Thing", content: "Tom:16 Mary:25"});
        findMatches(p, fpr, AllFiles, "/people/person/name")
            .then(matches => {
                assert(matches.length === 2);
                assert(matches[0].$value === "Tom");
                assert(matches[1].$value === "Mary");
                done();
            }).catch(done);
    });

    it("retains AST in file matches", done => {
        const mg = Microgrammar.fromString<Person>("${name}:${age}", {
            age: Integer,
        });
        const fpr = new DefaultFileParserRegistry().addParser(
            new MicrogrammarBasedFileParser("people", "person", mg));
        const p = InMemoryProject.of(
            {path: "Thing", content: "Tom:16 Mary:25"});
        findFileMatches(p, fpr, AllFiles, "/people/person/name")
            .then(matches => {
                assert(matches.length === 1);
                assert(matches[0].file.path === "Thing");
                assert(matches[0].matches[0].$value === "Tom");
                assert(matches[0].matches[1].$value === "Mary");
                assert(matches[0].fileNode.$children.length === 1);
                assert(matches[0].fileNode.$children[0].$name === "people");
                done();
            }).catch(done);
    });

    it("should get into AST and update single terminal", done => {
        const mg = Microgrammar.fromString<Person>("${name}:${age}", {
            age: Integer,
        });
        const fpr = new DefaultFileParserRegistry().addParser(
            new MicrogrammarBasedFileParser("people", "person", mg));
        const p = InMemoryProject.of(
            {path: "Thing", content: "Tom:16 Mary:25"});
        findMatches(p, fpr, AllFiles, "/people/person/name")
            .then(matches => {
                assert(matches.length === 2);
                assert(matches[0].$value === "Tom");
                matches[1].$value = "Mark";
                p.flush()
                    .then(_ => {
                        assert(p.findFileSync("Thing").getContentSync() === "Tom:16 Mark:25");
                        done();
                    });
            }).catch(done);
    });

    it("should get into AST and update two terminals", done => {
        const mg = Microgrammar.fromString<Person>("${name}:${age}", {
            age: Integer,
        });
        const fpr = new DefaultFileParserRegistry().addParser(
            new MicrogrammarBasedFileParser("people", "person", mg));
        const p = InMemoryProject.of(
            {path: "Thing", content: "Tom:16 Mary:25"});
        findMatches(p, fpr, AllFiles, "/people/person/name")
            .then(matches => {
                assert(matches.length === 2);
                assert(matches[0].$value === "Tom");
                matches[0].$value = "Jose";
                matches[1].$value = "Mark";
                p.flush()
                    .then(_ => {
                        assert(p.findFileSync("Thing").getContentSync() === "Jose:16 Mark:25");
                        done();
                    });
            }).catch(done);
    });

    it("should get into AST and update single non-terminal", done => {
        const mg = Microgrammar.fromString<Person>("${name}:${age}", {
            age: Integer,
        });
        const fpr = new DefaultFileParserRegistry().addParser(
            new MicrogrammarBasedFileParser("people", "person", mg));
        const firstPerson = "Tom:16";
        const content = firstPerson + " Mary:25";
        const p = InMemoryProject.of(
            {path: "Thing", content});
        findMatches(p, fpr, AllFiles, "/people/person")
            .then(matches => {
                assert(matches.length === 2);
                assert(matches[0].$value === firstPerson, `[${matches[0].$value}]`);
                const secondPerson = "Abigail:44";
                matches[0].$value = secondPerson;
                p.flush()
                    .then(_ => {
                        const f = p.findFileSync("Thing");
                        assert(f.getContentSync() === content.replace(firstPerson, secondPerson));
                        done();
                    });
            }).catch(done);
    });

    it("should get into AST and add content after non-terminal", done => {
        const mg = Microgrammar.fromString<Person>("${name}:${age}", {
            age: Integer,
        });
        const fpr = new DefaultFileParserRegistry().addParser(
            new MicrogrammarBasedFileParser("people", "person", mg));
        const firstPerson = "Tom:16";
        const content = firstPerson + " Mary:25";
        const p = InMemoryProject.of(
            {path: "Thing", content});
        findMatches(p, fpr, AllFiles, "/people/person")
            .then(matches => {
                assert(matches.length === 2);
                assert(matches[0].$value === firstPerson, `[${matches[0].$value}]`);
                const newContent = "this is junk";
                matches[0].append(newContent);
                p.flush()
                    .then(_ => {
                        const f = p.findFileSync("Thing");
                        assert(f.getContentSync() === content.replace(firstPerson, firstPerson + newContent));
                        done();
                    });
            }).catch(done);
    });

    it("should get into AST and add content before non-terminal", done => {
        const mg = Microgrammar.fromString<Person>("${name}:${age}", {
            age: Integer,
        });
        const fpr = new DefaultFileParserRegistry().addParser(
            new MicrogrammarBasedFileParser("people", "person", mg));
        const firstPerson = "Tom:16";
        const secondPerson = "Mary:25";
        const content = firstPerson +  " " + secondPerson;
        const p = InMemoryProject.of(
            {path: "Thing", content});
        findMatches(p, fpr, AllFiles, "/people/person")
            .then(matches => {
                assert(matches.length === 2);
                const newContent = "this is junk";
                matches[1].prepend(newContent);
                p.flush()
                    .then(_ => {
                        const f = p.findFileSync("Thing");
                        assert(f.getContentSync() === firstPerson + " " + newContent + secondPerson);
                        done();
                    });
            }).catch(done);
    });

    it("should allow predicate on file", done => {
        const mg = Microgrammar.fromString<Person>("${name}:${age}", {
            age: Integer,
        });
        const fpr = new DefaultFileParserRegistry().addParser(
            new MicrogrammarBasedFileParser("people", "person", mg));
        const p = InMemoryProject.of(
            {path: "Thing1", content: "Tom:16 Mary:25"},
            {path: "Thing2", content: "George:16 Kathy:25"},
        );
        findMatches(p, fpr, AllFiles, ".Thing1/people/person/name")
            .then(matches => {
                assert(matches.length === 2);
                assert(matches[0].$value === "Tom");
                assert(matches[1].$value === "Mary");
                done();
            }).catch(done);
    });

    it("handles multiple updates to same property");

    it("execute unified expression and update single terminal", done => {
        const mg = Microgrammar.fromString<Person>("${name}:${age}", {
            age: Integer,
        });
        const fpr = new DefaultFileParserRegistry().addParser(
            new MicrogrammarBasedFileParser("people", "person", mg));
        const p = InMemoryProject.of(
            {path: "Thing1", content: "Tom:16 Mary:25"},
            {path: "Thing2", content: "George:16 Kathy:25"});
        findByExpression(p, fpr, "Thing1::/people/person/name")
            .then(matches => {
                assert(matches.length === 2);
                assert(matches[0].$value === "Tom");
                matches[1].$value = "Mark";
                p.flush()
                    .then(_ => {
                        assert(p.findFileSync("Thing1").getContentSync() === "Tom:16 Mark:25");
                        done();
                    });
            }).catch(done);
    });

});
