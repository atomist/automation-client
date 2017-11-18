import "mocha";
import * as assert from "power-assert";
import { JavaProjectStructure } from "../../../../src/operations/generate/java/JavaProjectStructure";
import { InMemoryProject } from "../../../../src/project/mem/InMemoryProject";

describe("JavaProjectStructure", () => {

    it("infer not a Java project", done => {
        const p = InMemoryProject.of();
        JavaProjectStructure.infer(p).then(structure => {
            assert(!structure);
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
            assert(!structure);
            done();
        }).catch(done);
    });

    it("infer application package when uniquely present", done => {
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

    it("not infer application package when confusing parallels present", done => {
        const p = InMemoryProject.of(
            {
                path: "src/main/java/com/smashing/pumpkins/Gish.java",
                content: javaSource,
            },
            {
                path: "src/main/java/org/thing/Thing.java",
                content: "package org.thing; public class Thing {}",
            },
        );
        JavaProjectStructure.infer(p).then(structure => {
            assert(!structure);
            done();
        }).catch(done);
    });

    it("infers shortest application package when valid parallels present", done => {
        const p = InMemoryProject.of(
            {
                path: "src/main/java/com/bands/smashing/pumpkins/Gish.java",
                content: "package com.bands.smashing.pumpkins; public class Gish {}",
            },
            {
                path: "src/main/java/com/bands/nirvana/Thing.java",
                content: "package com.bands.nirvana; public class Thing {}",
            },
        );
        JavaProjectStructure.infer(p).then(structure => {
            assert(!!structure);
            assert(structure.applicationPackage === "com.bands", structure.applicationPackage);
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
