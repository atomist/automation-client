import "mocha";
import * as assert from "power-assert";

import { ActionResult, successOn } from "../../../src/action/ActionResult";
import { HandlerContext } from "../../../src/HandlerContext";
import { ProjectOperationCredentials } from "../../../src/operations/common/ProjectOperationCredentials";
import { AnyProjectEditor, SimpleProjectEditor } from "../../../src/operations/edit/projectEditor";
import { AbstractGenerator } from "../../../src/operations/generate/AbstractGenerator";
import { ProjectPersister } from "../../../src/operations/generate/generatorUtils";
import { InMemoryProject } from "../../../src/project/mem/InMemoryProject";
import { Project } from "../../../src/project/Project";

class CustomStartSeed extends AbstractGenerator {

    public created: Project;

    constructor(private pe: AnyProjectEditor, private start: Project) {
        super();
    }

    public startingPoint(ctx: HandlerContext, params: this): Promise<Project> {
        return Promise.resolve(this.start);
    }

    public projectEditor(ctx: HandlerContext, params: this) {
        return this.pe;
    }

    protected initAndSetRemote(p: Project, params: this): Promise<ActionResult<Project>> {
        this.created = p;
        return Promise.resolve(successOn(p));
    }

    protected persister() {
        return (p: Project) => {
            this.created = p;
            return Promise.resolve(successOn(p));
        };
    }
}

const AddThingEditor: SimpleProjectEditor = p => p.addFile("Thing", "Thing1");

describe("AbstractGenerator", () => {

    it("should add file to result", done => {
        const start = InMemoryProject.of({path: "a", content: "a"});
        const generator = new CustomStartSeed(AddThingEditor, start);
        generator.handle(null, generator)
            .then(er => {
                assert(er.code === 0);
                assert(start.findFileSync("a"));
                assert(generator.created.findFileSync("a"));
                assert(generator.created.findFileSync("Thing"));
                done();
            }).catch(done);
    });

    it.skip("should add file to result but not modify seed", done => {
        const start = InMemoryProject.of({path: "a", content: "a"});
        const generator = new CustomStartSeed(AddThingEditor, start);
        generator.handle(null, generator)
            .then(er => {
                assert(er.code === 0);
                assert(start.findFileSync("a"));
                assert(generator.created.findFileSync("a"));
                assert(generator.created.findFileSync("Thing"));
                assert(!start.findFileSync("Thing"));
                done();
            }).catch(done);
    });

});
