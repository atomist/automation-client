import { Parameter } from "../../decorators";
import { HandleCommand } from "../../HandleCommand";
import { HandlerContext } from "../../HandlerContext";
import { raiseIssue } from "../../internal/util/gitHub";
import { logger } from "../../internal/util/logger";
import { LocalOrRemoteRepoOperation } from "../common/LocalOrRemoteRepoOperation";
import { RepoId } from "../common/RepoId";
import { ProjectReviewer } from "./projectReviewer";
import { ProjectReview, ReviewResult } from "./ReviewResult";

/**
 * Support for reviewing multiple projects
 * Subclasses should have @CommandHandler annotation
 */
export abstract class ReviewerCommandSupport<RR extends ReviewResult<PR> = ReviewResult<PR>,
    PR extends ProjectReview = ProjectReview>
    extends LocalOrRemoteRepoOperation
    implements HandleCommand {

    @Parameter({
        displayName: "Raise issues",
        description: "Whether to raise issues for review comments",
        pattern: /^(?:true|false)$/,
        validInput: "Boolean",
        required: false,
        type: "boolean",
    })
    public raiseIssues: boolean = false;

    public handle(context: HandlerContext): Promise<RR> {
        const load = this.repoLoader();
        // Save us from "this"
        const projectReviewer: ProjectReviewer<PR> = this.projectReviewer(context);

        const repoIdPromises: Promise<RepoId[]> = this.repoFinder()(context);
        const projectReviews: Promise<Array<Promise<PR>>> = repoIdPromises
            .then(repos => repos.map(id => {
                return Promise.resolve(this.repoFilter(id))
                    .then(relevant => {
                        if (relevant) {
                            logger.info("Attempting to review %s", JSON.stringify(id));
                            return load(id)
                                .then(p => {
                                    return projectReviewer(p, context);
                                })
                                .then(review => {
                                    // Don't attempt to raise issues when reviewing a local repo
                                    if (!this.local && review && this.raiseIssues &&
                                        review.comments && review.comments.length > 0) {
                                        return raiseIssue(this.githubToken,
                                            review.repoId, {
                                                title: "Atomist review comments",
                                                body: review.comments.map(c => c.comment).join("\n"),
                                            })
                                            .then(_ => review);
                                    }
                                    return review;
                                });
                        } else {
                            // We don't care about this project. It's ineligible for review
                            return undefined;
                        }
                    });
            }));

        return projectReviews
            .then(reviews =>
                Promise.all(reviews)
                    .then(values => {
                        const rr = {
                            code: 0,
                            projectsReviewed: values.length,
                            projectReviews: values.filter(v => !!v),
                        };
                        return this.enrich(rr, context);
                    }));
    }

    /**
     * Invoked after parameters have been populated in the context of
     * a particular operation.
     */
    public abstract projectReviewer(context: HandlerContext): ProjectReviewer<PR>;

    /**
     * Subclasses can override this method to enrich the returned ReviewResult:
     * For example to add aggregate calculations
     * @param {ReviewResult<D extends ProjectReview>} reviewResult
     */
    protected enrich(reviewResult: ReviewResult<PR>, context: HandlerContext): RR {
        return reviewResult as RR;
    }

}
