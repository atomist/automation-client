import { CommandHandler, Parameter, Tags } from "../../src/decorators";
import { ProjectReviewer } from "../../src/operations/review/ProjectReviewer";
import { ReviewerSupport } from "../../src/operations/review/ReviewerSupport";
import { clean, ProjectReview } from "../../src/operations/review/ReviewResult";

/**
 * Note this is NOT a realistic version check: We're not testing the
 * mechanics of reviewers so we just search file content rather than use
 * something more sophisticated such as a microgrammar
 */
@CommandHandler("Reviewer that flags old versions of Spring Boot", "review spring boot version")
@Tags("atomist", "spring")
export class SpringBootVersionReviewer extends ReviewerSupport<ProjectReview> {

    @Parameter({
        displayName: "Desired Spring Boot version",
        description: "The desired Spring Boot version across these repos",
        pattern: /^.+$/,
        validInput: "Semantic version",
        required: false,
    })
    public desiredBootVersion: string = "1.5.6.RELEASE";

    @Parameter({
        displayName: "Raise issues",
        description: "Whether to raise issues",
        pattern: /^.+$/,
        validInput: "true or false",
        required: false,
    })
    public raiseIssues: boolean = false;

    protected projectReviewer(): ProjectReviewer<ProjectReview> {
        return (id, p) => {
            const pom = p.findFileSync("pom.xml");
            if (!pom) {
                return Promise.resolve(undefined);
            } else {
                // This is naive
                const outDated = pom.getContentSync().includes("spring")
                    && pom.getContentSync().includes(this.desiredBootVersion);
                if (outDated) {
                    return Promise.resolve({
                        repoId: id,
                        comments: [
                            {
                                severity: "info",
                                comment: "Old version of Spring Boot",
                            },
                        ],
                    });
                } else {
                    return Promise.resolve(clean(id));
                }
            }
        };
    }

    // protected repoFilter(user: string, repo: string): Promise<boolean> {
    //     return hasFile(this.githubToken, user, repo, "pom.xml");
    // }
}
