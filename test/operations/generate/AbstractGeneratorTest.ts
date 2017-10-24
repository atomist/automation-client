import "mocha";
import * as assert from "power-assert";

import { AbstractGenerator } from "../../../src/operations/generate/AbstractGenerator";
import { HandlerContext } from "../../../src/HandlerContext";
import { ProjectEditor, toEditor } from "../../../src/operations/edit/projectEditor";
import { Project } from "../../../src/project/Project";
import { InMemoryProject } from "../../../src/project/mem/InMemoryProject";
import { ActionResult, successOn } from "../../../src/action/ActionResult";

class CustomStartSeed extends AbstractGenerator {

    constructor(private pe: ProjectEditor, private start: Project) {
        super();
    }

    public startingPoint(ctx: HandlerContext, params: this): Promise<Project> {
        return Promise.resolve(this.start);
    }

    public projectEditor(ctx: HandlerContext, params: this): ProjectEditor<this> {
        return this.pe;
    }

    protected initAndSetRemote(p: Project, params: this): Promise<ActionResult<Project>> {
        return Promise.resolve(successOn(p));
    }
}

const AddThingEditor: ProjectEditor = toEditor(p => p.addFile("Thing", "Thing1"));

describe("AbstractGenerator", () => {

    it("should not modify seed", done => {
        const start = InMemoryProject.of({ path: "a", content: "a"});
        const generator = new CustomStartSeed(AddThingEditor, start);
        generator.handle(null, generator)
            .then(er => {
                assert(er.code === 0);
                assert(start.findFileSync("a"));
                assert(!start.findFileSync("Thing"));
                done();
            }).catch(done);
    });

});
