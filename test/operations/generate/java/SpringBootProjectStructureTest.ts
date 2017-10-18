import "mocha";
import * as assert from "power-assert";
import { SpringBootProjectStructure } from "../../../../src/operations/generate/java/SpringBootProjectStructure";
import { InMemoryProject } from "../../../../src/project/mem/InMemoryProject";
import { Project } from "../../../../src/project/Project";

describe("SpringBootProjectStructure: Java inference", () => {

    it("infer not a spring project", done => {
        const p = InMemoryProject.of();
        SpringBootProjectStructure.inferFromJavaSource(p).then(structure => {
            assert(!structure);
            done();
        }).catch(done);
    });

    it("should not be fooled by foo.kotlin.txt", done => {
        const p = InMemoryProject.of(
            {
                path: "src/main/kotlin/com/smashing/pumpkins/Gish.kt.txt",
                content: javaSource,
            },
        );
        SpringBootProjectStructure.inferFromJavaSource(p).then(structure => {
            assert(!structure);
            done();
        }).catch(done);
    });

    it("infer application package and class when present", done => {
        SpringBootProjectStructure.inferFromJavaSource(GishProject).then(structure => {
            assert(structure.applicationPackage === "com.smashing.pumpkins");
            assert(structure.appClassFile.path === GishPath);
            done();
        }).catch(done);
    });

});

const javaSource =
    `package com.smashing.pumpkins;

@SpringBootApplication
class GishApplication {
}

`;

export const GishPath = "src/main/java/com/smashing/pumpkins/Gish.java";
export const GishProject: Project = InMemoryProject.of(
    {
        path: GishPath,
        content: javaSource,
    },
);
