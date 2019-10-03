import { File } from "../File";
import { AllFiles } from "../fileGlobs";

import { Project } from "../Project";
import { gatherFromFiles } from "./projectUtils";

const Separator = "-------------------";

/**
 * Use as a diagnostic step in an editor chain.
 * No op that dumps file information to the console.
 * @param stepName identification of the step in the process we're up to
 * @param globPattern optional glob pattern to select files. Match all if not supplied
 * @param stringifier function to convert files to strings. Default uses path
 */
export function diagnosticDump(stepName: string,
                               globPattern: string = AllFiles,
                               stringifier: (f: File) => string = f => f.path): (project: Project) => Promise<Project> {
    return project => gatherFromFiles(project, globPattern, async f => f)
        .then(files =>
            // tslint:disable-next-line:no-console
            console.log(`${Separator}\nProject name ${project.name}: Step=${stepName}; Files[${globPattern}]=\n` +
                `${files.map(f => "\t" + stringifier(f)).join("\n")}\n${Separator}`))
        .then(() => project);
}
