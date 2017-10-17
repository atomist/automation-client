import { Project, ProjectAsync } from "../../../project/Project";

import { doWithFiles } from "../../../project/util/projectUtils";

/**
 * Record change to POM. Project will subsequently need flushing
 * @param {Project} project
 * @param {string} artifactId
 * @param {string} groupId
 * @param {string} version
 * @param {string} description
 */
export function updatePom<P extends ProjectAsync>(project: P,
                                                  artifactId: string,
                                                  groupId: string,
                                                  version: string,
                                                  description: string): Promise<P> {
    return doWithFiles(project, "pom.xml", f => {
        f.recordReplace(/(<artifactId>)([a-zA-Z_.0-9\-]+)(<\/artifactId>)/, "$1" + artifactId + "$3")
            .recordReplace(/(<groupId>)([a-zA-Z_.0-9\-]+)(<\/groupId>)/, "$1" + groupId + "$3")
            .recordReplace(/(<version>)([a-zA-Z_.0-9\-]+)(<\/version>)/, "$1" + version + "$3")
            .recordReplace(/(<description>)([a-zA-Z_.0-9\-]+)(<\/description>)/, "$1" + description + "$3");
    })
        .then(files => project);
}
