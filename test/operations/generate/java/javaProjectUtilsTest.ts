import "mocha";

import * as assert from "power-assert";
import { movePackage } from "../../../../src/operations/generate/java/javaProjectUtils";
import { tempProject } from "../../../project/utils";

describe("javaProjectUtils", () => {

    it("should not refactor on no match", done => {
        const t = tempProject();
        t.addFileSync("src/main/java/Foo.java", "public class Foo {}");
        movePackage(t, "com.foo", "com.bar");
        t.flush()
            .then(_ => {
                const found = t.findFileSync("src/main/java/Foo.java");
                assert(found.getContentSync() === "public class Foo {}");
                done();
            }).catch(done);
    });

    it("should refactor on simple match", done => {
        const t = tempProject();
        t.addFileSync("src/main/java/com/foo/Foo.java", "package com.foo;\npublic class Foo {}");
        movePackage(t, "com.foo", "com.bar");
        t.flush()
            .then(_ => {
                const found = t.findFileSync("src/main/java/com/bar/Foo.java");
                assert(found.getContentSync() === "package com.bar;\npublic class Foo {}");
                done();
            }).catch(done);
    });

    it("should refactor on deeper match", done => {
        const t = tempProject();
        t.addFileSync("src/main/java/com/foo/bar/Foo.java", "package com.foo.bar;\npublic class Foo {}");
        movePackage(t, "com.foo.bar", "com.something.else");
        t.flush()
            .then(_ => {
                const found = t.findFileSync("src/main/java/com/something/else/Foo.java");
                assert(found);
                assert(found.getContentSync() === "package com.something.else;\npublic class Foo {}");
                done();
            }).catch(done);
    });

});
