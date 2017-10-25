import { LocalProject } from "../../src/project/local/LocalProject";

import * as tmp from "tmp-promise";
import { RepoId } from "../../src/operations/common/RepoId";
import { NodeFsLocalProject } from "../../src/project/local/NodeFsLocalProject";

export function tempProject(id?: RepoId): LocalProject {
    const dir = tmp.dirSync();
    return new NodeFsLocalProject(id, dir.name);
}
