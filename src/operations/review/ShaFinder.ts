
import { CommandHandler } from "../../decorators";
import { Project } from "../../project/Project";
import { RepoId } from "../common/RepoId";
import { ProjectReviewer } from "./ProjectReviewer";
import { ReviewerSupport } from "./ReviewerSupport";
import { clean, ProjectReview, ReviewResult } from "./ReviewResult";

@CommandHandler("Look for shas")
export class ShaFinder extends ReviewerSupport<ProjectReview> {

    public raiseIssues = false;

    protected projectReviewer(): ProjectReviewer<ProjectReview> {
        return (id: RepoId, p: Project) => {
            console.log("ShaFinder reviewing " + JSON.stringify(id));
            return Promise.resolve(clean(id));
        };
    }
}
