import * as tmp from "tmp-promise";
import { ScriptedFlushable } from "../../src/internal/common/Flushable";
import { RepoRef } from "../../src/operations/common/RepoId";
import { LocalProject } from "../../src/project/local/LocalProject";
import { NodeFsLocalProject } from "../../src/project/local/NodeFsLocalProject";

tmp.setGracefulCleanup();

export function tempProject(id: RepoRef = {
    owner: "dummyOwner",
    repo: "dummyRepo",
    url: "",
}): LocalProject & ScriptedFlushable<LocalProject> {
    const dir = tmp.dirSync({ unsafeCleanup: true });
    return new NodeFsLocalProject(id, dir.name,
        () => Promise.resolve()) as any as LocalProject & ScriptedFlushable<LocalProject>; // could delete the dir in release function
}
