import { ActionResult } from "../../internal/util/ActionResult";
import { Project } from "../../project/Project";
import { ProjectEditor } from "../edit/projectEditor";

export type ProjectPersister<P extends Project = Project> =
    (project: P, editor: ProjectEditor) => Promise<ActionResult<P>>;
