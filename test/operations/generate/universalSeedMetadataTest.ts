import "mocha";

import * as assert from "power-assert";
import { metadataFromInstance } from "../../../src/internal/metadata/metadataReading";
import { CommandHandlerMetadata } from "../../../src/metadata/automationMetadata";
import { UniversalSeed } from "../../../src/operations/generate/UniversalSeed";
import { InMemoryFile } from "../../../src/project/mem/InMemoryFile";
import { InMemoryProject } from "../../../src/project/mem/InMemoryProject";
import { Project } from "../../../src/project/Project";

describe("UniversalSeed metadata test", () => {

    function validateUniversalSeedMetadata(md: CommandHandlerMetadata) {
        const description = `parameters were named: ${md.parameters.map(p => p.name).join(",")}`;
        assert(md.parameters.some(p => p.name === "sourceOwner"), description );
        assert(md.parameters.some(p => p.name === "sourceRepo"), description);
        // assert(md.parameters.some(p=> p.name === "targetOwner"));
        assert(md.parameters.some(p => p.name === "targetRepo", description));
        assert(md.parameters.some(p => p.name === "visibility", description));
        assert(md.parameters.some(p => p.name === "sourceBranch", description));
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

    it("copies regular files", done => {
        const files = [
            new InMemoryFile("a", "a"),
            new InMemoryFile("b", "a"),
            new InMemoryFile("c/d/e.txt", "a"),
        ];
        const project = InMemoryProject.of(...files);
        class SpecialSeed extends UniversalSeed {

            public manipulate(p: Project): Promise<Project> {
                return p.addFile("Thing", "1");
            }
        }
        const seed = new SpecialSeed();
        seed.manipulate(project)
            .then(_ => {
                assert(project.fileCount === files.length + 1,
                    `Expected ${files.length + 1}, got ${ project.fileCount}`);
                done();
            }).catch(done);
    });

});
