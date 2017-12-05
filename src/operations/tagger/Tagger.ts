import { ActionResult } from "../../action/ActionResult";
import { HandlerContext } from "../../HandlerContext";
import { Project } from "../../project/Project";
import { EditorOrReviewerParameters } from "../common/params/BaseEditorOrReviewerParameters";
import { RepoRef } from "../common/RepoId";

import * as _ from "lodash";

export interface Tags {

    repoId: RepoRef;

    tags: string[];
}

export class DefaultTags implements Tags {

    constructor(public repoId: RepoRef, public tags: string[]) {
    }
}

export type Tagger<P extends EditorOrReviewerParameters = EditorOrReviewerParameters> =
    (p: Project, context: HandlerContext, params?: P) => Promise<Tags>;

export type TagRouter<PARAMS extends EditorOrReviewerParameters = EditorOrReviewerParameters> =
    (tags: Tags, params: PARAMS, ctx: HandlerContext) => Promise<ActionResult<Tags>>;

/**
 * Combine these taggers
 * @param t0 first tagger
 * @param {Tagger} taggers
 * @return {Tagger}
 */
export function unifiedTagger(t0: Tagger, ...taggers: Tagger[]): Tagger {
    return (p, context, params) => {
        const allTags = Promise.all(([t0].concat(taggers)).map(t => t(p, context, params)));
        return allTags.then(tags => {
            return unify(tags);
        });
    };
}

function unify(tags: Tags[]): Tags {
    const uniqueTags = _.uniq(_.flatMap(tags, t => t.tags));
    return new DefaultTags(tags[0].repoId, uniqueTags);
}
