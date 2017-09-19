import { Configuration } from "../src/configuration";
import { JavaSeed } from "../src/operations/generate/java/JavaSeed";
import { SpringBootSeed } from "../src/operations/generate/java/SpringBootSeed";
import { UniversalSeed } from "../src/operations/generate/UniversalSeed";
import { ShaFinder } from "../src/operations/review/ShaFinder";
import { HelloWorld } from "./command/HelloWorld";
import { SpringBootVersionReviewer } from "./command/SpringBootVersionReviewer";
import { HelloIngestor } from "./event/HelloIngestor";
import { HelloIssue } from "./event/HelloIssue";
import { AlwaysOkEventHandler } from "./internal/invoker/TestHandlers";

export const GitHubToken = process.env.GITHUB_TOKEN;

export const configuration: Configuration = {
    name: "@atomist/automation-node-tests",
    version: "0.0.4",
    teamId: "T1L0VDKJP",
    commands: [
        () => new ShaFinder(),
        // () => new SpringBootVersionReviewer(),
        () => new HelloWorld(),
        // () => new UniversalSeed(),
        // () => new JavaSeed(),
        // () => new SpringBootSeed(),
    ],
    events: [
        () => new HelloIssue(),
        // () => new AlwaysOkEventHandler(),
    ],
    ingestors: [
        () => new HelloIngestor(),
    ],
    token: GitHubToken,
};
