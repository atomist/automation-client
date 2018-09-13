import { SlackMessage } from "@atomist/slack-messages";
import "mocha";
import * as assert from "power-assert";
import {
    fromListRepoFinder,
    fromListRepoLoader,
} from "../../../lib/operations/common/fromProjectList";
import { BaseEditorOrReviewerParameters } from "../../../lib/operations/common/params/BaseEditorOrReviewerParameters";
import { SimpleRepoId } from "../../../lib/operations/common/RepoId";
import { reviewerHandler } from "../../../lib/operations/review/reviewerToCommand";
import {
    DefaultReviewComment,
    ReviewResult,
} from "../../../lib/operations/review/ReviewResult";
import { InMemoryProject } from "../../../lib/project/mem/InMemoryProject";

describe("reviewerHandler", () => {

    const p = InMemoryProject.from(new SimpleRepoId("a", "b"),
        { path: "thing", content: "1" });

    const rh = reviewerHandler(() =>
        proj => Promise.resolve({
            repoId: proj.id,
            comments: [new DefaultReviewComment("warn", "category", "bad", undefined)],
        }),
        BaseEditorOrReviewerParameters, "test", {
            repoFinder: fromListRepoFinder([p]),
            repoLoader: () => fromListRepoLoader([p]),
        });

    it("should return ReviewResult structure", done => {
        const params = new BaseEditorOrReviewerParameters();
        params.targets.repo = ".*";
        (rh as any).handle(MockHandlerContext, params)
            .then(r => {
                const rr = r as ReviewResult;
                assert(!!rr);
                assert(rr.projectsReviewed === 1);
                assert(rr.projectReviews[0].comments.length === 1);
                done();
            }).catch(done);
    });

});

const MockHandlerContext = {
    messageClient: {
        respond(msg: string | SlackMessage) {
            return Promise.resolve();
        },
    },
    graphClient: {
        executeMutationFromFile(file: string, variables?: any): Promise<any> {
            return Promise.resolve({ createSlackChannel: [{ id: "stts" }] });
        },
    },
};
