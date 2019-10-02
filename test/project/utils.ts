import * as tmp from "tmp-promise";
import { ScriptedFlushable } from "../../lib/internal/common/Flushable";
import { RepoRef } from "../../lib/operations/common/RepoId";
import { LocalProject } from "../../lib/project/local/LocalProject";
import { NodeFsLocalProject } from "../../lib/project/local/NodeFsLocalProject";

tmp.setGracefulCleanup();

export function tempProject(id: RepoRef = {
    owner: "dummyOwner",
    repo: "dummyRepo",
    url: "",
}): LocalProject & ScriptedFlushable<LocalProject> {
    const dir = tmp.dirSync({ unsafeCleanup: true });
    return new NodeFsLocalProject(id, dir.name, async () => dir.removeCallback()) as any as LocalProject & ScriptedFlushable<LocalProject>;
}
