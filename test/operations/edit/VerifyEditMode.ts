import { HandlerContext } from "../../../src/HandlerContext";
import { CustomExecutionEditMode } from "../../../src/operations/edit/editModes";
import {
    EditResult,
    ProjectEditor,
} from "../../../src/operations/edit/projectEditor";
import { Project } from "../../../src/project/Project";

/**
 * EditMode implementation that allows verification of the
 * resulting state of the project
 */
export class VerifyEditMode implements CustomExecutionEditMode {

    public message = "foo";

    constructor(private assertions: (p: Project) => void) {
    }

    public edit<P>(p: Project, action: ProjectEditor<P>, context: HandlerContext, parameters: P): Promise<EditResult> {
        return action(p, context, parameters)
            .then(er => {
                this.assertions(p);
                return er;
            });
    }
}
