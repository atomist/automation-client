import { NodeFsLocalProject } from "../../project/local/NodeFsLocalProject";
import { EditResult, ProjectEditor } from "./ProjectEditor";

export function editDirectory<ER extends EditResult>(baseDir: string,
                                                     editor: ProjectEditor<ER>): Promise<ER> {
    const p = new NodeFsLocalProject("name", baseDir);
    return editor(p);
}
