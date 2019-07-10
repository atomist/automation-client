
import * as assert from "power-assert";
import { SimpleRepoId } from "../../../lib/operations/common/RepoId";
import {
    DefaultTaggerTags,
    Tagger,
    unifiedTagger,
} from "../../../lib/operations/tagger/Tagger";
import { InMemoryProject } from "../../../lib/project/mem/InMemoryProject";

describe("tag unification", () => {

    it("should unify one", done => {
        const rr = new SimpleRepoId("a", "b");
        const springTagger: Tagger = () => Promise.resolve(new DefaultTaggerTags(rr, ["spring"]));
        const unified: Tagger = unifiedTagger(springTagger);
        unified(InMemoryProject.from(null), null, null)
            .then(tags => {
                assert.deepEqual(tags.repoId, rr);
                assert.deepEqual(tags.tags, ["spring"]);
                done();
            }).catch(done);
    });

    it("should unify two", done => {
        const rr = new SimpleRepoId("a", "b");
        const springTagger: Tagger = () => Promise.resolve(new DefaultTaggerTags(rr, ["spring"]));
        const kotlinTagger: Tagger = () => Promise.resolve(new DefaultTaggerTags(rr, ["kotlin"]));

        const unified: Tagger = unifiedTagger(springTagger, kotlinTagger);
        unified(InMemoryProject.from(null), null, null)
            .then(tags => {
                assert.deepEqual(tags.repoId, rr);
                assert.deepEqual(tags.tags, ["spring", "kotlin"]);
                done();
            }).catch(done);
    });

});
