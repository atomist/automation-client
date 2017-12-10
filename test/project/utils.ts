import { LocalProject } from "../../src/project/local/LocalProject";

import * as tmp from "tmp-promise";
import { RepoRef } from "../../src/operations/common/RepoId";
import { NodeFsLocalProject } from "../../src/project/local/NodeFsLocalProject";

tmp.setGracefulCleanup();

export function tempProject(id: RepoRef = { owner: "dummyOwner", repo: "dummyRepo" }): LocalProject {
    const dir = tmp.dirSync({ unsafeCleanup: true });
    return new NodeFsLocalProject(id, dir.name, () => Promise.resolve()); // could delete the dir in release function
}
