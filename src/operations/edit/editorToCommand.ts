import { HandleCommand } from "../../HandleCommand";
import { HandlerContext } from "../../HandlerContext";
import { commandHandlerFrom, OnCommand, ParametersConstructor } from "../../onCommand";
import { RepoFilter } from "../common/repoFilter";
import { RepoFinder } from "../common/repoFinder";
import { SimpleRepoId } from "../common/RepoId";
import { RepoLoader } from "../common/repoLoader";
import { BaseEditorParameters } from "./BaseEditorParameters";
import { editAll, editOne } from "./editAll";
import { EditMode, PullRequest } from "./editModes";
import { AnyProjectEditor } from "./projectEditor";

/**
 * Further details of an editor to allow selective customization
 */
export interface EditorCommandDetails {

    description: string;
    editMode: EditMode;
    intent?: string | string[];
    tags?: string | string[];
    repoFinder?: RepoFinder;
    repoFilter?: RepoFilter;
    repoLoader?: RepoLoader;
}

function defaultDetails(name: string): EditorCommandDetails {
    return {
        description: name,
        editMode: new PullRequest(name, name),
    };
}

/**
 * Create a handle function that edits one or many repos, following BaseEditorParameters
 * @param {AnyProjectEditor} pe
 * @param {ParametersConstructor<PARAMS>} factory
 * @param {string} name
 * @param {string} details object allowing customization beyond reasonable defaults
 * @return {HandleCommand}
 */
export function editorHandler<PARAMS>(pe: AnyProjectEditor,
                                      factory: ParametersConstructor<PARAMS>,
                                      name: string,
                                      details: Partial<EditorCommandDetails> = {}): HandleCommand {
    const detailsToUse = {
        ...defaultDetails(name),
        details,
    };
    return commandHandlerFrom(handleEditOneOrMany(pe, detailsToUse), factory, name,
        details.description, detailsToUse.intent, detailsToUse.tags);
}

/**
 * If owner and repo are required, edit just one repo. Otherwise edit all repos
 * in the present team
 */
function handleEditOneOrMany<PARAMS extends BaseEditorParameters>(pe: AnyProjectEditor,
                                                                  details: EditorCommandDetails): OnCommand<PARAMS> {
    return (ctx: HandlerContext, parameters: PARAMS) => {
        const credentials = {token: parameters.githubToken};
        if (!!parameters.owner && !!parameters.repo) {
            return editOne(ctx, credentials, pe, details.editMode,
                new SimpleRepoId(parameters.owner, parameters.repo),
                parameters, details.repoLoader);
        }
        return editAll(ctx, credentials, pe, details.editMode, parameters,
            details.repoFinder, details.repoFilter, details.repoLoader);
    };
}
