import "mocha";

import * as assert from "power-assert";
import { CommandHandlerMetadata } from "../../../src/internal/metadata/metadata";
import { metadataFromInstance } from "../../../src/internal/metadata/metadataReading";
import { JavaSeed } from "../../../src/operations/generate/java/JavaSeed";
import { SpringBootSeed } from "../../../src/operations/generate/java/SpringBootSeed";
import { UniversalSeed } from "../../../src/operations/generate/UniversalSeed";
import { GitProject } from "../../../src/project/git/GitProject";
import { InMemoryFile } from "../../../src/project/mem/InMemoryFile";
import { InMemoryProject } from "../../../src/project/mem/InMemoryProject";
import { Project } from "../../../src/project/Project";

class TestableSeed extends UniversalSeed {

    constructor(private verifier: (p: Project) => void) {
        super();
    }

    protected push(gp: GitProject): Promise<any> {
        this.verifier(gp);
        return Promise.resolve(this);
    }
}

function testableSeed(verifier: (p: Project) => void) {
    const s = new TestableSeed(verifier);
    s.targetRepo = "whatever";
    s.targetOwner = "whatever";
    return s;
}

describe("UniversalSeed", () => {

    function validateUniversalSeedMetadata(md: CommandHandlerMetadata) {
        assert(md.parameters.some(p => p.name === "sourceOwner"));
        assert(md.parameters.some(p => p.name === "sourceRepo"));
        // assert(md.parameters.some(p=> p.name === "targetOwner"));
        assert(md.parameters.some(p => p.name === "targetRepo"));
        assert(md.parameters.some(p => p.name === "visibility"));
        assert(md.parameters.some(p => p.name === "sourceBranch"));
        assert(md.secrets.some(s => s.name === "githubToken"));
    }

    function validateJavaSeedMetadata(md: CommandHandlerMetadata) {
        validateUniversalSeedMetadata(md);
        assert(md.parameters.some(p => p.name === "artifactId"));
        assert(md.parameters.some(p => p.name === "groupId"));
        assert(md.parameters.some(p => p.name === "rootPackage"));
    }

    it("exposes correct metadata", () => {
        const umd = new UniversalSeed();
        const md = metadataFromInstance(umd) as CommandHandlerMetadata;
        validateUniversalSeedMetadata(md);
    });

    it("supports metadata inheritance: one level", () => {
        const umd = new JavaSeed();
        const md = metadataFromInstance(umd) as CommandHandlerMetadata;
        validateJavaSeedMetadata(md);
    });

    it("supports metadata inheritance: two levels", () => {
        const umd = new SpringBootSeed();
        const md = metadataFromInstance(umd) as CommandHandlerMetadata;
        validateJavaSeedMetadata(md);
    });

    it("copies regular files", done => {
        const files = [
            new InMemoryFile("a", "a"),
            new InMemoryFile("b", "a"),
            new InMemoryFile("c/d/e.txt", "a"),
        ];
        const project = InMemoryProject.of(...files);
        class SpecialSeed extends UniversalSeed {

            protected populateInternal(p: Project): void {
                p.recordAddFile("Thing", "1");
            }
        }
        const seed = new SpecialSeed();
        seed.populate(project)
            .then(_ => {
                assert(project.fileCount === files.length + 1,
                    `Expected ${files.length + 1}, got ${ project.fileCount}`);
                done();
            }).catch(done);
    });

});
