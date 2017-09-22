import { Project } from "../../project/Project";
import { RepoId } from "../common/RepoId";

/**
 * Modifies the given project, returning information about the modification.
 */
export type ProjectEditor<ER extends EditResult> =
    (id: RepoId, p: Project) => Promise<ER>;

/**
 * Result of editing a project. More information may be added by instances.
 */
export interface EditResult {

    /**
     * Whether or not this project was edited
     */
    edited: boolean;
}
