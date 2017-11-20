import { LocalProject } from "../../src/project/local/LocalProject";

import * as tmp from "tmp-promise";
import { RepoRef } from "../../src/operations/common/RepoId";
import { NodeFsLocalProject } from "../../src/project/local/NodeFsLocalProject";

export function tempProject(id?: RepoRef): LocalProject {
    const dir = tmp.dirSync();
    return new NodeFsLocalProject(id, dir.name, () => Promise.resolve()); // could delete the dir in release function
}
