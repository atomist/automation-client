import {
    Integer,
    Microgrammar,
    takeUntil,
} from "@atomist/microgrammar";
import { TreeNode } from "@atomist/tree-path";
import * as assert from "power-assert";
import { AllFiles } from "../../../../lib/project/fileGlobs";
import { InMemoryProject } from "../../../../lib/project/mem/InMemoryProject";
import {
    fileMatches,
    matches,
    matchIterator,
} from "../../../../lib/tree/ast/astUtils";
import { MatchResult } from "../../../../lib/tree/ast/FileHits";
import { DefaultFileParserRegistry } from "../../../../lib/tree/ast/FileParserRegistry";
import { notWithin } from "../../../../lib/tree/ast/matchTesters";
import { MicrogrammarBasedFileParser } from "../../../../lib/tree/ast/microgrammar/MicrogrammarBasedFileParser";

interface Person {
    name: string;
    age: number;
}

const nameAndAgeTerms = {
    name: takeUntil(":"),
    age: Integer,
};

/* tslint:disable:no-invalid-template-strings */

describe("microgrammar integration and path expression", () => {

    it("should get into AST", async () => {
        const mg = Microgrammar.fromString<Person>("${name}:${age}", nameAndAgeTerms);
        const fpr = new DefaultFileParserRegistry().addParser(new MicrogrammarBasedFileParser("people", "person", mg));
        const p = InMemoryProject.of({ path: "Thing", content: "Tom:16 Mary:25" });
        const ms = await matches(p, { parseWith: fpr, globPatterns: AllFiles, pathExpression: "/people/person/name" });
        assert(ms.length === 2);
        assert(ms[0].$value === "Tom");
        assert(ms[1].$value === "Mary");
    });

    it("should get into AST with strong typing", async () => {
        const mg = Microgrammar.fromString<Person>("${name}:${age}", nameAndAgeTerms);
        const fpr = new DefaultFileParserRegistry().addParser(new MicrogrammarBasedFileParser("people", "person", mg));
        const p = InMemoryProject.of({ path: "Thing", content: "Tom:16 Mary:25" });
        const ms = await matches<Person>(p, { parseWith: fpr, globPatterns: AllFiles, pathExpression: "/people/person" });
        assert.strictEqual(ms.length, 2);
        assert.strictEqual(ms[0].name, "Tom");
        assert.strictEqual(ms[0].$value, "Tom:16");
    });

    it("should get into AST with strong typing and conversion", async () => {
        const mg = Microgrammar.fromString<Person>("${name}:${age}", nameAndAgeTerms);

        // This type is correct here
        const m = mg.firstMatch("Tom:16");
        assert.strictEqual(m.age, 16);

        const fpr = new DefaultFileParserRegistry().addParser(
            new MicrogrammarBasedFileParser("people", "person", mg));
        const p = InMemoryProject.of({ path: "Thing", content: "Tom:16 Mary:25" });
        const ms = await matches<Person>(p, { parseWith: fpr, globPatterns: AllFiles, pathExpression: "/people/person" });
        assert.strictEqual(ms.length, 2);
        assert.strictEqual(ms[0].name, "Tom");
        assert.strictEqual(ms[0].age, 16);
        assert.strictEqual(ms[0].$value, "Tom:16");
    });

    it("exposes source locations", async () => {
        const mg = Microgrammar.fromString<Person>("${name}:${age}", nameAndAgeTerms);
        const fpr = new DefaultFileParserRegistry().addParser(new MicrogrammarBasedFileParser("people", "person", mg));
        const p = InMemoryProject.of({ path: "Thing", content: "Tom:16 Mary:25" });
        const ms = await matches(p, { parseWith: fpr, globPatterns: AllFiles, pathExpression: "/people/person/name" });
        assert(ms.length === 2);
        assert(ms[0].$value === "Tom");
        assert(ms[1].$value === "Mary");
        ms.forEach(m => {
            assert(!!m.sourceLocation);
            assert(m.sourceLocation.path === "Thing");
            assert(m.sourceLocation.offset === m.$offset);
        });
    });

    it("retains AST in file matches", async () => {
        const mg = Microgrammar.fromString<Person>("${name}:${age}", nameAndAgeTerms);
        const fpr = new DefaultFileParserRegistry().addParser(new MicrogrammarBasedFileParser("people", "person", mg));
        const p = InMemoryProject.of({ path: "Thing", content: "Tom:16 Mary:25" });
        const ms = await fileMatches(p, { parseWith: fpr, globPatterns: AllFiles, pathExpression: "/people/person/name" });
        assert(ms.length === 1);
        assert(ms[0].file.path === "Thing");
        assert(ms[0].matches[0].$value === "Tom");
        assert(ms[0].matches[1].$value === "Mary");
        assert(ms[0].fileNode.$children.length === 1);
        assert(ms[0].fileNode.$children[0].$name === "people");
    });

    it("enable within check using path expression", async () => {
        const mg = Microgrammar.fromString<Person>("${name}:${age}", nameAndAgeTerms);
        const file = Microgrammar.fromDefinitions<{ first: Person, second: Person }>({
            first: mg,
            second: mg,
        });
        const fpr = new DefaultFileParserRegistry().addParser(new MicrogrammarBasedFileParser("people", "pair", file));
        const p = InMemoryProject.of({ path: "Thing", content: "Tom:16 Mary:25" });
        const ms = await fileMatches(p, {
            parseWith: fpr,
            globPatterns: AllFiles,
            pathExpression: "/people/pair//name[?notWithinSecond]",
            functionRegistry: { notWithinSecond: n => !within(n, "second") },
        });
        assert.strictEqual(ms.length, 1);
        assert(ms[0].file.path === "Thing");
        assert.strictEqual(ms[0].matches.length, 1);
        assert(ms[0].matches[0].$value === "Tom");
        assert(ms[0].fileNode.$children.length === 1);
        assert(ms[0].fileNode.$children[0].$name === "people");
    });

    function within(n: TreeNode, nodeName: string): boolean {
        if (!n.$parent) {
            return false;
        }
        if (n.$parent.$name === nodeName) {
            return true;
        }
        return within(n.$parent, nodeName);
    }

    it("should get into AST and update single terminal", async () => {
        const mg = Microgrammar.fromString<Person>("${name}:${age}", nameAndAgeTerms);
        const fpr = new DefaultFileParserRegistry().addParser(new MicrogrammarBasedFileParser("people", "person", mg));
        const p = InMemoryProject.of({ path: "Thing", content: "Tom:16 Mary:25" });
        const ms = await matches(p, { parseWith: fpr, globPatterns: AllFiles, pathExpression: "/people/person/name" });
        assert(ms.length === 2);
        assert(ms[0].$value === "Tom");
        ms[1].$value = "Mark";
        await p.flush();
        assert(p.findFileSync("Thing").getContentSync() === "Tom:16 Mark:25");
    });

    it("should get into AST and update two terminals", async () => {
        const mg = Microgrammar.fromString<Person>("${name}:${age}", nameAndAgeTerms);
        const fpr = new DefaultFileParserRegistry().addParser(new MicrogrammarBasedFileParser("people", "person", mg));
        const p = InMemoryProject.of({ path: "Thing", content: "Tom:16 Mary:25" });
        const ms = await matches(p, { parseWith: fpr, globPatterns: AllFiles, pathExpression: "/people/person/name" });
        assert(ms.length === 2);
        assert(ms[0].$value === "Tom");
        ms[0].$value = "Jose";
        ms[1].$value = "Mark";
        await p.flush();
        assert(p.findFileSync("Thing").getContentSync() === "Jose:16 Mark:25");
    });

    it("should get into AST and update single non-terminal", async () => {
        const mg = Microgrammar.fromString<Person>("${name}:${age}", nameAndAgeTerms);
        const fpr = new DefaultFileParserRegistry().addParser(new MicrogrammarBasedFileParser("people", "person", mg));
        const firstPerson = "Tom:16";
        const content = firstPerson + " Mary:25";
        const p = InMemoryProject.of({ path: "Thing", content });
        const ms = await matches(p, { parseWith: fpr, globPatterns: AllFiles, pathExpression: "/people/person" });
        assert(ms.length === 2);
        assert(ms[0].$value === firstPerson, `[${ms[0].$value}]`);
        const secondPerson = "Abigail:44";
        ms[0].$value = secondPerson;
        await p.flush();
        const f = p.findFileSync("Thing");
        assert(f.getContentSync() === content.replace(firstPerson, secondPerson));
    });

    it("should get into AST and add content after non-terminal", async () => {
        const mg = Microgrammar.fromString<Person>("${name}:${age}", nameAndAgeTerms);
        const fpr = new DefaultFileParserRegistry().addParser(new MicrogrammarBasedFileParser("people", "person", mg));
        const firstPerson = "Tom:16";
        const content = firstPerson + " Mary:25";
        const p = InMemoryProject.of({ path: "Thing", content });
        const ms = await matches(p, { parseWith: fpr, globPatterns: AllFiles, pathExpression: "/people/person" });
        assert(ms.length === 2);
        assert(ms[0].$value === firstPerson, `[${ms[0].$value}]`);
        const newContent = "this is junk";
        ms[0].append(newContent);
        await p.flush();
        const f = p.findFileSync("Thing");
        assert(f.getContentSync() === content.replace(firstPerson, firstPerson + newContent));
    });

    it("should get into AST and add content before non-terminal", async () => {
        const mg = Microgrammar.fromString<Person>("${name}:${age}", nameAndAgeTerms);
        const fpr = new DefaultFileParserRegistry().addParser(new MicrogrammarBasedFileParser("people", "person", mg));
        const firstPerson = "Tom:16";
        const secondPerson = "Mary:25";
        const content = firstPerson + " " + secondPerson;
        const p = InMemoryProject.of({ path: "Thing", content });
        const ms = await matches(p, { parseWith: fpr, globPatterns: AllFiles, pathExpression: "/people/person" });
        assert(ms.length === 2);
        const newContent = "this is junk";
        ms[1].prepend(newContent);
        await p.flush();
        const f = p.findFileSync("Thing");
        assert(f.getContentSync() === firstPerson + " " + newContent + secondPerson);
    });

    it("should allow predicate on file", async () => {
        const mg = Microgrammar.fromString<Person>("${name}:${age}", nameAndAgeTerms);
        const fpr = new DefaultFileParserRegistry().addParser(new MicrogrammarBasedFileParser("people", "person", mg));
        const p = InMemoryProject.of(
            { path: "Thing1", content: "Tom:16 Mary:25" },
            { path: "Thing2", content: "George:16 Kathy:25" },
        );
        const ms = await matches(p, { parseWith: fpr, globPatterns: AllFiles, pathExpression: ".Thing1/people/person/name" });
        assert(ms.length === 2);
        assert(ms[0].$value === "Tom");
        assert(ms[1].$value === "Mary");
    });

    it("should veto with MatchTester", async () => {
        const mg = Microgrammar.fromString<Person>("${name}:${age}", nameAndAgeTerms);
        const file = Microgrammar.fromDefinitions<{ first: Person, second: Person }>({
            first: mg,
            second: mg,
        });
        const parseWith = new MicrogrammarBasedFileParser("people", "pair", file);
        const p = InMemoryProject.of(
            { path: "Thing1", content: "Tom:16 Mary:25" },
            { path: "Thing2", content: "George:16 Kathy:25" },
        );
        const it = matchIterator(p, {
            parseWith,
            globPatterns: AllFiles,
            pathExpression: "//pair//second/name",
            testWith: async () => () => false,
        });
        const ms: MatchResult[] = [];
        for await (const match of it) {
            ms.push(match);
        }
        assert.strictEqual(ms.length, 0);
    });

    it("should veto every second with MatchTester", async () => {
        const mg = Microgrammar.fromString<Person>("${name}:${age}", nameAndAgeTerms);
        const file = Microgrammar.fromDefinitions<{ first: Person, second: Person }>({
            first: mg,
            second: mg,
        });
        const parseWith = new MicrogrammarBasedFileParser("people", "pair", file);
        const p = InMemoryProject.of(
            { path: "Thing1", content: "Tom:16 Mary:25" },
            { path: "Thing2", content: "George:16 Kathy:25" },
        );
        let count = 0;
        const it = matchIterator(p, {
            parseWith,
            globPatterns: AllFiles,
            pathExpression: "//pair//name",
            testWith: async () => () => count++ % 2 === 0,
        });
        const ms: MatchResult[] = [];
        for await (const match of it) {
            ms.push(match);
        }
        assert.strictEqual(ms.length, 2);
    });

    it("should exclude with notWithin MatchTester", async () => {
        const mg = Microgrammar.fromString<Person>("${name}:${age}", nameAndAgeTerms);
        const file = Microgrammar.fromDefinitions<{ first: Person, second: Person }>({
            first: mg,
            second: mg,
        });
        const parseWith = new MicrogrammarBasedFileParser("people", "pair", file);
        const p = InMemoryProject.of(
            { path: "Thing1", content: "Tom:16 Mary:25" },
            { path: "Thing2", content: "George:16 Kathy:25" },
        );
        const it = matchIterator(p, {
            parseWith,
            globPatterns: AllFiles,
            pathExpression: "//pair//name",
            testWith: notWithin(Microgrammar.fromDefinitions({
                badName: /[A-Za-z]+:25/,
            })),
        });
        const ms: MatchResult[] = [];
        for await (const match of it) {
            ms.push(match);
        }
        assert.strictEqual(ms.length, 2);
        assert.strictEqual(ms[0].$value, "Tom");
        assert.strictEqual(ms[1].$value, "George");
    });

    it("should not exclude with irrelevant notWithin MatchTester", async () => {
        const mg = Microgrammar.fromString<Person>("${name}:${age}", nameAndAgeTerms);
        const file = Microgrammar.fromDefinitions<{ first: Person, second: Person }>({
            first: mg,
            second: mg,
        });
        const parseWith = new MicrogrammarBasedFileParser("people", "pair", file);
        const p = InMemoryProject.of(
            { path: "Thing1", content: "Tom:16 Mary:25" },
            { path: "Thing2", content: "George:16 Kathy:25" },
        );
        const it = matchIterator(p, {
            parseWith,
            globPatterns: AllFiles,
            pathExpression: "//pair//name",
            testWith: notWithin(Microgrammar.fromDefinitions({
                badName: /[0-9][A-Za-z]+:25/, // Does not match
            })),
        });
        const ms: MatchResult[] = [];
        for await (const match of it) {
            ms.push(match);
        }
        assert.strictEqual(ms.length, 4);
    });

    it("should allow typing", async () => {
        const mg = Microgrammar.fromString<Person>("${name}:${age}", nameAndAgeTerms);
        const file = Microgrammar.fromDefinitions<{ first: Person, second: Person }>({
            first: mg,
            second: mg,
        });
        const parseWith = new MicrogrammarBasedFileParser("people", "pair", file);
        const p = InMemoryProject.of(
            { path: "Thing1", content: "Tom:16 Mary:25" },
            { path: "Thing2", content: "George:16 Kathy:25" },
        );
        const it = matchIterator<Person>(p, {
            parseWith,
            globPatterns: AllFiles,
            pathExpression: "//pair/first",
        });
        const people: Person[] = [];
        for await (const match of it) {
            people.push(match);
        }
        assert.strictEqual(people.length, 2);
    });

    it("handles multiple updates to same property");

});
