
import "mocha";
import { HandlerContext } from "../../../src/HandlerContext";
import { ProjectReviewer } from "../../../src/operations/review/projectReviewer";
import { ReviewerCommandSupport } from "../../../src/operations/review/ReviewerCommandSupport";

describe("ReviewerCommandSupport", () => {

    it("should compile", () => {
        class MyReviewer extends ReviewerCommandSupport {

            public projectReviewer(context: HandlerContext): ProjectReviewer {
                throw new Error("I don't care if this works so long as it compiles");
            }
        }
    });

});
