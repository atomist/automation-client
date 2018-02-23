import { logger } from "../../internal/util/logger";
import { ProjectAsync } from "../Project";
import { doWithFiles } from "./projectUtils";

export type JsonManipulation = (jsonObj: any) => void;

/**
 * Manipulate the contents of the given JSON file within the project,
 * using its object form and writing back using the same formatting.
 * See the manipulate function.
 * @param {P} p
 * @param {string} jsonPath JSON file path. This function will do nothing
 * without error if the file is ill-formed or not found.
 * @param {JsonManipulation} manipulation
 * @return {Promise<P extends ProjectAsync>}
 */
export function doWithJson<M, P extends ProjectAsync = ProjectAsync>(
    p: P,
    jsonPath: string,
    manipulation: JsonManipulation,
): Promise<P> {

    return doWithFiles(p, jsonPath, file => {
        return file.getContent()
            .then(content => {
                const newContent = manipulate(content, manipulation, jsonPath);
                return file.setContent(newContent)
                    .then(() => p);
            });
    });
}

const spacePossibilities = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, " ", "  ", "\t"];

/**
 * Update the object form of the given JSON content and write
 * it back with minimal changes
 * @param {string} jsonIn
 * @param {(jsonObj: any) => Object} manipulation
 * @return {string}
 */
export function manipulate(jsonIn: string, manipulation: JsonManipulation, context: string = ""): string {
    if (!jsonIn) {
        return jsonIn;
    }

    try {
        const obj = JSON.parse(jsonIn);

        let space: number | string = 2;
        for (const sp of spacePossibilities) {
            const maybe = JSON.stringify(obj, null, sp);
            if (jsonIn === maybe) {
                logger.debug(`Definitely inferred space as [${sp}]`);
                space = sp;
                break;
            }
        }

        logger.debug(`Inferred space is [${space}]`);

        manipulation(obj);
        return JSON.stringify(obj, null, space);
    } catch (e) {
        logger.warn("Syntax error parsing supposed JSON (%s). Context:[%s]. Alleged JSON:\n%s", e, context, jsonIn);
        return jsonIn;
    }
}
