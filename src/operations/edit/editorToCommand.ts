
import { HandleCommand } from "../../HandleCommand";
import { HandlerContext } from "../../HandlerContext";
import { commandHandlerFrom, OnCommand, ParametersConstructor } from "../../onCommand";
import { SimpleRepoId } from "../common/RepoId";
import { BaseEditorParameters } from "./BaseEditorParameters";
import { editAll, editOne } from "./editAll";
import { EditMode, PullRequest } from "./editModes";
import { AnyProjectEditor } from "./projectEditor";

/**
 * Create a handle function that edits one or many repos, following BaseEditorParameters
 * @param {AnyProjectEditor} pe
 * @param {ParametersConstructor<PARAMS>} factory
 * @param {string} name
 * @param {string} description
 * @param {EditMode} em
 * @param {string | string[]} intent
 * @param {string | string[]} tags
 * @return {HandleCommand}
 */
export function editorHandler<PARAMS>(pe: AnyProjectEditor,
                                      factory: ParametersConstructor<PARAMS>,
                                      name: string, description: string = name,
                                      em: EditMode = new PullRequest(name, description),
                                      intent?: string | string[], tags?: string | string[]): HandleCommand {
    return commandHandlerFrom(handleEditOneOrMany(pe, em), factory, name, description, intent, tags);
}

/**
 * If owner and repo are required, edit just one repo. Otherwise edit all repos
 * in the present team
 */
function handleEditOneOrMany<PARAMS extends BaseEditorParameters>(pe: AnyProjectEditor, em: EditMode): OnCommand<PARAMS> {
    return (ctx: HandlerContext, parameters: PARAMS) => {
        const credentials = {token: parameters.githubToken};
        if (!!parameters.owner && !!parameters.repo) {
            return editOne(ctx, credentials, pe, em, new SimpleRepoId(parameters.owner, parameters.repo));
        }
        return editAll(ctx, credentials, pe, em);
    };
}
