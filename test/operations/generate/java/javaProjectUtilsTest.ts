import "mocha";

import * as assert from "power-assert";
import { movePackage } from "../../../../src/operations/generate/java/javaProjectUtils";
import { InMemoryProject } from "../../../../src/project/mem/InMemoryProject";

describe("javaProjectUtils", () => {

    it("should not refactor on no match", done => {
        const t = new InMemoryProject();
        t.addFileSync("src/main/java/Foo.java", "public class Foo {}");
        movePackage(t, "com.foo", "com.bar")
            .then(_ => {
                const found = t.findFileSync("src/main/java/Foo.java");
                assert(found.getContentSync() === "public class Foo {}");
                done();
            }).catch(done);
    });

    it("should refactor on simple match", done => {
        const t = new InMemoryProject();
        t.addFileSync("src/main/java/com/foo/Foo.java", "package com.foo;\npublic class Foo {}");
        movePackage(t, "com.foo", "com.bar")
            .then(_ => {
                const found = t.findFileSync("src/main/java/com/bar/Foo.java");
                assert(found.getContentSync() === "package com.bar;\npublic class Foo {}");
                done();
            }).catch(done);
    });

    it("should refactor on deeper match", done => {
        const t = new InMemoryProject();
        t.addFileSync("src/main/java/com/foo/bar/Foo.java", "package com.foo.bar;\npublic class Foo {}");
        movePackage(t, "com.foo.bar", "com.something.else")
            .then(_ => {
                const found = t.findFileSync("src/main/java/com/something/else/Foo.java");
                assert(found);
                assert(found.getContentSync() === "package com.something.else;\npublic class Foo {}");
                done();
            }).catch(done);
    });

    it("should not work on Kotlin by default", done => {
        const t = new InMemoryProject();
        t.addFileSync("src/main/kotlin/com/foo/bar/Foo.kt", "package com.foo.bar\npublic class Foo {}");
        movePackage(t, "com.foo.bar", "com.something.else")
            .then(_ => {
                const found = t.findFileSync("src/main/java/com/something/else/Foo.kt");
                assert(!found);
                done();
            }).catch(done);
    });

    it("should work on Kotlin with correct glob pattern", done => {
        const t = new InMemoryProject();
        t.addFileSync("src/main/kotlin/com/foo/bar/Foo.kt", "package com.foo.bar\npublic class Foo {}");
        movePackage(t, "com.foo.bar", "com.something.else", "**/*.kt")
            .then(_ => {
                const found = t.findFileSync("src/main/kotlin/com/something/else/Foo.kt");
                assert(found);
                assert(found.getContentSync() === "package com.something.else\npublic class Foo {}");
                done();
            }).catch(done);
    });

});
