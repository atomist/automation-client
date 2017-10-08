import "mocha";
import * as assert from "power-assert";

import { Microgrammar } from "@atomist/microgrammar/Microgrammar";
import { Integer } from "@atomist/microgrammar/Primitives";
import { AllFiles } from "../../../../src/project/fileGlobs";
import { InMemoryProject } from "../../../../src/project/mem/InMemoryProject";
import { findMatches } from "../../../../src/tree/ast/astUtils";
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
        // new MicrogrammarBasedFileParser("people", "person", mg)
        const p = InMemoryProject.of(
            {path: "Thing", content: "Tom:16 Mary:25"});
        findMatches(p, AllFiles, fpr, "/people/person/name")
            .then(matches => {
                assert(matches.length === 2);
                assert(matches[0].$value === "Tom");
                assert(matches[1].$value === "Mary");
                done();
            }).catch(done);
    });

    it("should get into AST and update single terminal", done => {
        const mg = Microgrammar.fromString<Person>("${name}:${age}", {
            age: Integer,
        });
        const fpr = new DefaultFileParserRegistry().addParser(
            new MicrogrammarBasedFileParser("people", "person", mg));
        // new MicrogrammarBasedFileParser("people", "person", mg)
        const p = InMemoryProject.of(
            {path: "Thing", content: "Tom:16 Mary:25"});
        findMatches(p, AllFiles, fpr, "/people/person/name")
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
        // new MicrogrammarBasedFileParser("people", "person", mg)
        const p = InMemoryProject.of(
            {path: "Thing", content: "Tom:16 Mary:25"});
        findMatches(p, AllFiles, fpr, "/people/person/name")
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
        // new MicrogrammarBasedFileParser("people", "person", mg)
        const firstPerson = "Tom:16";
        const content = firstPerson + " Mary:25";
        const p = InMemoryProject.of(
            {path: "Thing", content });
        findMatches(p, AllFiles, fpr, "/people/person")
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

});
