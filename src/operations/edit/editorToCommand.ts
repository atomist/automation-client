import { HandleCommand } from "../../HandleCommand";
import { HandlerContext } from "../../HandlerContext";
import { commandHandlerFrom, OnCommand, ParametersConstructor } from "../../onCommand";
import { CommandDetails } from "../CommandDetails";
import { RepoFilter } from "../common/repoFilter";
import { BaseEditorParameters } from "./BaseEditorParameters";
import { editAll, editOne } from "./editAll";
import { EditMode, isEditMode, PullRequest } from "./editModes";
import { AnyProjectEditor } from "./projectEditor";

/**
 * Either directly return an EditMode or a factory to return one from the context
 */
export type EditModeOrFactory<PARAMS> = EditMode | ((p: PARAMS) => EditMode);

/**
 * Further details of an editor to allow selective customization
 */
export interface EditorCommandDetails<PARAMS = any> extends CommandDetails<PARAMS> {

    editMode: EditModeOrFactory<PARAMS>;
    repoFilter?: RepoFilter;
}

function defaultDetails(name: string): EditorCommandDetails {
    return {
        description: name,
        editMode: new PullRequest(name, name),
    };
}

/**
 * Create a handle function that edits one or many repos, following BaseEditorParameters
 * @param pe function returning a project editor instance appropriate for the parameters
 * @param {ParametersConstructor<PARAMS>} factory
 * @param {string} name
 * @param {string} details object allowing customization beyond reasonable defaults
 * @return {HandleCommand}
 */
export function editorHandler<PARAMS extends BaseEditorParameters>(pe: (params: PARAMS) => AnyProjectEditor,
                                                                   factory: ParametersConstructor<PARAMS>,
                                                                   name: string,
                                                                   details: Partial<EditorCommandDetails> = {}): HandleCommand {
    const detailsToUse: EditorCommandDetails = {
        ...defaultDetails(name),
        ...details,
    };
    return commandHandlerFrom(handleEditOneOrMany(pe, detailsToUse),
        factory, name,
        detailsToUse.description, detailsToUse.intent, detailsToUse.tags);
}

/**
 * If owner and repo are required, edit just one repo. Otherwise edit all repos
 * in the present team
 */
function handleEditOneOrMany<PARAMS extends BaseEditorParameters>(pe: (params: PARAMS) => AnyProjectEditor,
                                                                  details: EditorCommandDetails): OnCommand<PARAMS> {
    return (ctx: HandlerContext, parameters: PARAMS) => {
        const credentials = {token: parameters.githubToken};
        if (!!parameters.owner && !!parameters.repo) {
            return editOne(ctx, credentials,
                pe(parameters),
                editModeFor(details.editMode, parameters),
                parameters,
                parameters,
                !!details.repoLoader ? details.repoLoader(parameters) : undefined);
        }
        return editAll(ctx, credentials, pe(parameters), details.editMode, parameters,
            details.repoFinder, details.repoFilter,
            !!details.repoLoader ? details.repoLoader(parameters) : undefined);
    };
}

function editModeFor<PARAMS>(emf: EditModeOrFactory<PARAMS>, p: PARAMS): EditMode {
    return isEditMode(emf) ?
        emf :
        emf(p);
}
