import { Project } from "../../project/Project";
import { doWithFiles } from "../../project/util/projectUtils";

/**
 * Remove content from README specific to this project.
 *
 * @param project      project whose README should be cleaned
 * @param description  brief description of newly created project
 */
export function cleanReadMe(description: string, project: Project): Promise<Project> {
    return doWithFiles(project, "README.md", readMe => {
        readMe.recordReplace(/^#[\\s\\S]*?## Development/, `# ${project.name}
This project contains ${description}.

## Development`);
    });
}
