import { Project } from "../Project";

/**
 * Pass through validating something. Used to assert invariants in editors.
 * Reject if invariant isn't satisfied.
 * @param {Project} p
 * @param {string} path
 * @param assertion to satisfy invariant
 * @param err custom error message, if supplied
 * @return {Promise<Project>}
 */
export function assertContent(p: Project, path: string,
                              assertion: (content: string) => boolean, err?: string): Promise<Project> {
    return p.findFile(path)
        .then(f => f.getContent()
            .then(content =>
                assertion(content) ?
                    Promise.resolve(p) :
                    Promise.reject(
                        err ? err : `Assertion failed about project ${p.name}: ${assertion}`),
        ),
    );
}

export function assertContentIncludes(p: Project, path: string, what: string): Promise<Project> {
    return assertContent(p, path, content => content.includes(what),
        `File at [${path}] does not contain [${what}]`);
}

export function assertFileExists(p: Project, path: string): Promise<Project> {
    return assertContent(p, path, content => true,
        `File at [${path}] does not exist`);
}
