import { HandlerContext } from "../../../lib/HandlerContext";
import { CustomExecutionEditMode } from "../../../lib/operations/edit/editModes";
import {
    EditResult,
    ProjectEditor,
} from "../../../lib/operations/edit/projectEditor";
import { Project } from "../../../lib/project/Project";

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
