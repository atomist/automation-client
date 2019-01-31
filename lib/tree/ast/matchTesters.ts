import { Grammar } from "@atomist/microgrammar";
import { PatternMatch } from "@atomist/microgrammar/lib/PatternMatch";
import { MatchTesterMaker } from "./astUtils";

/**
 * Exclude matches that are within a match of the given microgrammar
 * @param {Grammar<any>} mg
 * @return {MatchTesterMaker}
 */
export function notWithin(mg: Grammar<any>): MatchTesterMaker {
    return async file => {
        const content = await file.getContent();
        const matches: PatternMatch[] = mg.findMatches(content);
        return n => !matches.some(m => {
            const mEndoffset = m.$offset + m.$matched.length;
            const nEndoffset = n.$offset + n.$value.length;
            return m.$offset <= n.$offset && mEndoffset >= nEndoffset;
        });
    };
}
