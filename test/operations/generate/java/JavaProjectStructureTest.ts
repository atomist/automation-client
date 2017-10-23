import "mocha";
import * as assert from "power-assert";
import { JavaProjectStructure } from "../../../../src/operations/generate/java/JavaProjectStructure";
import { InMemoryProject } from "../../../../src/project/mem/InMemoryProject";

describe("JavaProjectStructure", () => {

    it("infer not a spring project", done => {
        const p = InMemoryProject.of();
        JavaProjectStructure.infer(p).then(structure => {
            assert(structure === null);
            done();
        }).catch(done);
    });

    it("should not be fooled by foo.java.txt", done => {
        const p = InMemoryProject.of(
            {
                path: "src/main/com/smashing/pumpkins/Gish.java.txt",
                content: javaSource,
            },
        );
        JavaProjectStructure.infer(p).then(structure => {
            assert(structure === null);
            done();
        }).catch(done);
    });

    it("infer application package and class when present", done => {
        const p = InMemoryProject.of(
            {
                path: "src/main/java/com/smashing/pumpkins/Gish.java",
                content: javaSource,
            },
        );
        JavaProjectStructure.infer(p).then(structure => {
            assert(structure.applicationPackage === "com.smashing.pumpkins");
            done();
        }).catch(done);
    });

});

const javaSource =
    `package com.smashing.pumpkins;

public class Gish {

    public static void main(String[] args) {
        System.out.print("2. Siva");
    }
}
`;
