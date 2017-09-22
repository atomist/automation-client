import { LocalProject } from "../../src/project/local/LocalProject";

import * as tmp from "tmp";
import { NodeFsLocalProject } from "../../src/project/local/NodeFsLocalProject";

export function tempProject(): LocalProject {
    const dir = tmp.dirSync();
    return new NodeFsLocalProject("temp", dir.name);
}
