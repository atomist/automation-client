
import "mocha";
import * as assert from "power-assert";
import { SpringBootSeed } from "../../../../src/operations/generate/java/SpringBootSeed";
import { Project } from "../../../../src/project/Project";
import { GishPath, GishProject } from "./SpringBootProjectStructureTest";

describe("SpringBootSeed", () => {

    it("edits project and verifies package", done => {
        edit(GishProject).then(p => {
            done();
        }).catch(done);
    });

    function edit(project: Project): Promise<Project> {
        const sbs = new SpringBootSeed();
        sbs.serviceClassName = "MyCustom";
        sbs.groupId = "atomist";
        sbs.rootPackage = "com.the.smiths";
        return sbs.manipulate(project)
            .then(p => {
                assert(!p.findFileSync(GishPath));
                const f = p.findFileSync("src/main/java/com/the/smiths/MyCustom.java");
                assert(f);
                const content = f.getContentSync();
                assert(content.includes("class MyCustom"));
                return p;
            });
    }

});
