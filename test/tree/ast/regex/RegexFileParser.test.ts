import { TreeNode } from "@atomist/tree-path";
import * as assert from "power-assert";
import { AllFiles } from "../../../../lib/project/fileGlobs";
import { InMemoryFile } from "../../../../lib/project/mem/InMemoryFile";
import { InMemoryProject } from "../../../../lib/project/mem/InMemoryProject";
import { findMatches } from "../../../../lib/tree/ast/astUtils";
import { RegexFileParser } from "../../../../lib/tree/ast/regex/RegexFileParser";

interface Person {
    name: string;
    age: number;
}

const personParser = new RegexFileParser({
    rootName: "people",
    matchName: "person",
    regex: /([A-z][a-z]+):([\d]+)/,
    captureGroupNames: ["name", "age"],
});

describe("RegexFileParser", () => {

    it("should parse a file", async () => {
        const f = new InMemoryFile("Thing", "Tom:16 Mary:25");
        const root = await personParser.toAst(f);
        assert(root.$name === "people");
        assert(root.$children.length === 2);
        const tom = root.$children[0] as TreeNode & Person;
        assert(tom.$name === "person");
        assert.strictEqual(tom.$value, "Tom:16");
        assert.strictEqual(tom.$children.length, 2);
        assert.strictEqual(tom.name, "Tom");
        assert.strictEqual(tom.age, "16");
    });

    it("should parse a file without capture groups", async () => {
        const personParserNoCapture = new RegexFileParser({
            rootName: "people",
            matchName: "person",
            regex: /[A-z][a-z]+:[\d]+/,
        });
        const f = new InMemoryFile("Thing", "Tom:16 Mary:25");
        const root = await personParserNoCapture.toAst(f);
        assert(root.$name === "people");
        assert(root.$children.length === 2);
        const tom = root.$children[0];
        assert(tom.$name === "person");
        assert.strictEqual(tom.$value, "Tom:16");
        assert.strictEqual(tom.$children, undefined);
    });

    it("exposes source locations", async () => {
        const content = "Tom:16 Mary:25";
        const p = InMemoryProject.of(
            { path: "Thing", content });
        const matches = await findMatches<Person>(p, personParser, AllFiles, "/people/person/name");
        assert(matches.length === 2);
        assert(matches[0].$value === "Tom");
        assert(matches[1].$value === "Mary");
        matches.forEach(m => {
            assert(!!m.sourceLocation);
            assert(m.sourceLocation.path === "Thing");
            assert(m.sourceLocation.offset === m.$offset);
            assert.notStrictEqual(m.sourceLocation.offset, undefined);
            assert(content.substring(m.sourceLocation.offset).startsWith(m.$value),
                `Offset was ${m.sourceLocation.offset} and content was '${m.$value}'`);
        });
    });

    it("exposes source locations one down", async () => {
        const content = "Tom:16 Mary:25";
        const p = InMemoryProject.of(
            { path: "Thing", content });
        const matches = await findMatches<Person>(p, personParser, AllFiles, "/people/person");
        assert(matches.length === 2);
        assert(matches[0].$value === "Tom:16");
        const tom = matches[0];
        assert.strictEqual("Tom", tom.name);
        assert.strictEqual(tom.$children[0].$offset, 0);
        assert.strictEqual(tom.$children[1].$offset, 4);
        const mary = matches[1];
        assert.strictEqual("Mary", mary.name);
        assert.strictEqual(mary.$children[0].$offset, 7);
        assert.strictEqual(mary.$children[1].$offset, 12);
        assert(matches[1].$value === "Mary:25");
        matches.forEach(m => {
            assert(!!m.sourceLocation);
            assert(m.sourceLocation.path === "Thing");
            assert(m.sourceLocation.offset === m.$offset);
            assert.notStrictEqual(m.sourceLocation.offset, undefined);
            assert(content.substring(m.sourceLocation.offset).startsWith(m.$value),
                `Offset was ${m.sourceLocation.offset} and content was '${m.$value}'`);
        });

    });

});
