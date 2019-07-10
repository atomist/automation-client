import {
    Integer,
    Microgrammar,
    takeUntil,
} from "@atomist/microgrammar";
import {
    TreeNode,
    TreeVisitor,
    visit,
} from "@atomist/tree-path";
import * as assert from "power-assert";
import { InMemoryFile } from "../../../../lib/project/mem/InMemoryFile";
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

describe("MicrogrammarBasedFileParser", () => {

    it("should parse a file", done => {
        const f = new InMemoryFile("Thing", "Tom:16 Mary:25");
        const mg = Microgrammar.fromString<Person>("${name}:${age}", nameAndAgeTerms);
        new MicrogrammarBasedFileParser("people", "person", mg)
            .toAst(f)
            .then(root => {
                assert(root.$name === "people");
                assert(root.$children.length === 2);
                const tom = root.$children[0];
                assert(tom.$name === "person");
                assert(tom.$children.length === 2);
                done();
            }).catch(done);
    });

    it("should parse a file and allow scalar navigation via property", done => {
        const f = new InMemoryFile("Thing", "Tom:16 Mary:25");
        const mg = Microgrammar.fromString<Person>("${name}:${age}", nameAndAgeTerms);
        new MicrogrammarBasedFileParser("people", "person", mg)
            .toAst(f)
            .then(root => {
                // console.log(stringify(root, null, 2));
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
        const mg = Microgrammar.fromString<Person>("${name}:${age}", nameAndAgeTerms);
        new MicrogrammarBasedFileParser("people", "person", mg)
            .toAst(f)
            .then(root => {
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

    interface KidFact {
        birthYear: number;
        food: string;
    }

    interface Kid {
        name: string;
        fact: KidFact;
    }

    it("should parse a file and allow array navigation via property with a nested grammar", done => {
        const f = new InMemoryFile("Family", "Linda:[2007, mushrooms] Evelyn:[2005, sugar]");
        const mg = Microgrammar.fromString<Kid>("${name}:${fact}", {
            name: takeUntil(":"),
            fact: Microgrammar.fromString<KidFact>("[${birthYear},${food}]", {
                birthYear: Integer,
                food: takeUntil("]"),
            }),
        });
        new MicrogrammarBasedFileParser("family", "kid", mg)
            .toAst(f)
            .then(root => {
                // Check the array property
                const linda = (root as any).kids[0] as Kid & TreeNode;
                assert(linda.name === "Linda", "Name=" + linda.name);
                const evelyn = (root as any).kids[1] as Kid & TreeNode;
                assert(evelyn.name === "Evelyn", "Name=" + evelyn.name);
                // this Integer-matcher should be converting it to a number automatically. microgrammar#34
                assert(+evelyn.fact.birthYear === 2005, "birth year " + evelyn.fact.birthYear);
                assert(evelyn.fact.food === "sugar");
                done();
            }).catch(done);
    });

    it("should parse a file and keep positions", done => {
        const f = new InMemoryFile("Thing", "Tom:16 Mary:25");
        const mg = Microgrammar.fromString<Person>("${name}:${age}", nameAndAgeTerms);
        new MicrogrammarBasedFileParser("people", "person", mg)
            .toAst(f)
            .then(root => {
                assert(root.$name === "people");
                let minOffset = -1;
                let terminalCount = 0;
                const v: TreeVisitor = tn => {
                    if (tn.$name !== "people") {
                        assert(tn.$offset !== undefined, `No offset on node with name ${tn.$name}`);
                        assert(tn.$offset >= minOffset, `Must have position for ${tn.$name}`);
                        if (!!tn.$value) {
                            ++terminalCount;
                            // It's a terminal
                            assert(f.getContentSync().substr(tn.$offset, tn.$value.length) === tn.$value,
                                `Unable to validate content for ${tn.$name}`);
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
