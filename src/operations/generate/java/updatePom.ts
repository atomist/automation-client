import { Project } from "../../../project/Project";

// TODO should take ProjectScripting
export function updatePom(project: Project,
                          artifactId: string,
                          groupId: string,
                          version: string,
                          description: string): void {
    const pom = project.findFileSync("pom.xml");
    if (pom) {
        pom
            .recordReplace(/(<artifactId>)([a-zA-Z_.0-9\-]+)(<\/artifactId>)/, "$1" + artifactId + "$3")
            .recordReplace(/(<groupId>)([a-zA-Z_.0-9\-]+)(<\/groupId>)/, "$1" + groupId + "$3")
            .recordReplace(/(<version>)([a-zA-Z_.0-9\-]+)(<\/version>)/, "$1" + version + "$3")
            .recordReplace(/(<description>)([a-zA-Z_.0-9\-]+)(<\/description>)/, "$1" + description + "$3");
    }
}
