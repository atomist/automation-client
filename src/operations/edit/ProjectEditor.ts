import { Project } from "../../project/Project";

/**
 * Modifies the project, returns information about the modification.
 */
export type ProjectEditor<ER extends EditResult> = (p: Project) => Promise<ER>;

/**
 * Result of editing a project. More information may be added by instances.
 */
export interface EditResult {

    /**
     * Whether or not this project was edited
     */
    edited: boolean;
}
