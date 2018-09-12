import {
    configureLogging,
    NoLogging,
} from "../src/util/logger";

before(() => {
    configureLogging(NoLogging);
});
