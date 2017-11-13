import { Project } from "../Project";
import { toPromise } from "../util/projectUtils";

export function copyFiles<P extends Project = Project>(from: Project, to: P): Promise<P> {
    return toPromise(from.streamFiles())
        .then(files =>
            Promise.all(
                files.map(f =>
                    f.getContent().then(content => to.addFile(f.path, content))),
            ),
        ).then(() => to);
}
