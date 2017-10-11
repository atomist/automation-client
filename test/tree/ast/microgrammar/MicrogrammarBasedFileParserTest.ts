import "mocha";
import * as assert from "power-assert";

import { Microgrammar } from "@atomist/microgrammar/Microgrammar";
import { Integer } from "@atomist/microgrammar/Primitives";
import { TreeNode } from "@atomist/tree-path/TreeNode";
import { TreeVisitor, visit } from "@atomist/tree-path/visitor";
import { InMemoryFile } from "../../../../src/project/mem/InMemoryFile";
import { MicrogrammarBasedFileParser } from "../../../../src/tree/ast/microgrammar/MicrogrammarBasedFileParser";

interface Person {
    name: string;
    age: number;
}

describe("MicrogrammarBasedFileParser", () => {

    it("should parse a file", done => {
        const f = new InMemoryFile("Thing", "Tom:16 Mary:25");
        const mg = Microgrammar.fromString<Person>("${name}:${age}", {
            age: Integer,
        });
        new MicrogrammarBasedFileParser("people", "person", mg)
            .toAst(f)
            .then(root => {
                console.log(JSON.stringify(root, null, 2));
                assert(root.$name === "people");
                assert(root.$children.length === 2);
                const tom = root.$children[0] as TreeNode;
                // console.log(JSON.stringify(tom));
                assert(tom.$name === "person");
                assert(tom.$children.length === 2);
                done();
            }).catch(done);
    });

    it("should parse a file and allow scalar navigation via property", done => {
        const f = new InMemoryFile("Thing", "Tom:16 Mary:25");
        const mg = Microgrammar.fromString<Person>("${name}:${age}", {
            age: Integer,
        });
        new MicrogrammarBasedFileParser("people", "person", mg)
            .toAst(f)
            .then(root => {
                // console.log(JSON.stringify(root, null, 2));
                assert(root.$name === "people");
                assert(root.$children.length === 2);
                const tom = root.$children[0] as Person & TreeNode;
                assert(tom.$name === "person");
                assert(tom.name === "Tom", "Name=" + tom.name);
                done();
            }).catch(done);
    });

    it("should parse a file and allow array navigation via property", done => {
        const f = new InMemoryFile("Thing", "Tom:16 Mary:25");
        const mg = Microgrammar.fromString<Person>("${name}:${age}", {
            age: Integer,
        });
        new MicrogrammarBasedFileParser("people", "person", mg)
            .toAst(f)
            .then(root => {
                console.log(JSON.stringify(root, null, 2));
                assert(root.$name === "people");
                // Check the array property
                const tom = (root as any).persons[0] as Person & TreeNode;
                assert(tom.$name === "person");
                assert(tom.name === "Tom", "Name=" + tom.name);
                const mary = (root as any).persons[1] as Person & TreeNode;
                assert(mary.$name === "person");
                assert(mary.name === "Mary", "Name=" + mary.name);
                done();
            }).catch(done);
    });

    it("should parse a file and keep positions", done => {
        const f = new InMemoryFile("Thing", "Tom:16 Mary:25");
        const mg = Microgrammar.fromString<Person>("${name}:${age}", {
            age: Integer,
        });
        new MicrogrammarBasedFileParser("people", "person", mg)
            .toAst(f)
            .then(root => {
                assert(root.$name === "people");
                let minOffset = -1;
                let terminalCount = 0;
                const v: TreeVisitor = tn => {
                    console.log(tn.$name + "=" + tn.$value + ",offset=" + tn.$offset);
                    if (tn.$name !== "people") {
                        assert(tn.$offset !== undefined, `No offset on node with name ${tn.$name}`);
                        assert(tn.$offset >= minOffset, `Must have position for ${JSON.stringify(tn)}`);
                        if (!!tn.$value) {
                            ++terminalCount;
                            // It's a terminal
                            assert(f.getContentSync().substr(tn.$offset, tn.$value.length) === tn.$value,
                                `Unable to validate content for ${JSON.stringify(tn)}`);
                        }
                        minOffset = tn.$offset;
                    }
                    return true;
                };
                visit(root, v);
                assert(terminalCount > 0);
                done();
            }).catch(done);
    });

});
