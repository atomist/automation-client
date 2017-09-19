import { HandleCommand } from "../../HandleCommand";
import { HandlerContext } from "../../HandlerContext";
import { raiseIssue } from "../../internal/util/gitHub";
import { logger } from "../../internal/util/logger";
import { LocalOrRemoteRepoOperation } from "../common/LocalOrRemoteRepoOperation";
import { RepoId } from "../common/RepoId";
import { ProjectReviewer } from "./ProjectReviewer";
import { ProjectReview, ReviewResult } from "./ReviewResult";

/**
 * Support for reviewing multiple projects
 * Subclasses should have @CommandHandler annotation
 */
export abstract class ReviewerSupport<D extends ProjectReview>
    extends LocalOrRemoteRepoOperation
    implements HandleCommand {

    /**
     * Should we raise issues for review comments?
     * Can implement as a parameter if necessary
     */
    abstract get raiseIssues(): boolean;

    public handle(context: HandlerContext): Promise<ReviewResult<D>> {
        const load = this.repoLoader();
        // Save us from "this"
        const projectReviewer: ProjectReviewer<D> = this.projectReviewer();

        const repoIdPromises: Promise<RepoId[]> = this.repoFinder()(context);
        const projectReviews: Promise<Array<Promise<D>>> = repoIdPromises
            .then(repos => repos.map(id => {
                if (this.repoFilter(id)) {
                    logger.info("Attempting to review %s", JSON.stringify(id));
                    return load(id)
                        .then(p => {
                            return projectReviewer(id, p);
                        })
                        .then(review => {
                            // Don't attempt to raise issues when reviewing a local repo
                            if (!this.local && review && this.raiseIssues &&
                                review.comments && review.comments.length > 0) {
                                return raiseIssue(this.githubToken,
                                    review.repoId, {
                                        title: "Outdated Spring Boot version",
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
            }));

        return projectReviews
            .then(bootVersions =>
                Promise.all(bootVersions)
                    .then(values => {
                        return {
                            code: 0,
                            projectsReviewed: values.length,
                            projectReviews: values.filter(v => !!v),
                        };
                    }));
    }

    /**
     * Invoked after parameters have been populated.
     */
    protected abstract projectReviewer(): ProjectReviewer<D>;

}
