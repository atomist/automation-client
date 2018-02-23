import "mocha";
import * as assert from "power-assert";
import { ingester, type } from "../src/ingesters";

describe("ingesters", () => {

    it("should create simple root type with no field", () => {
        const barType = type("bar");
        const barIngester = ingester(barType).build();
        assert.deepEqual(barIngester, {
            root_type: "bar",
            types: [{
                kind: "OBJECT",
                name: "bar",
                fields: [],
            }],
        });
    });

    it("should create simple root type with one string field", () => {
        const barType = type("bar").withStringField("poo");
        const barIngester = ingester(barType).build();
        assert.deepEqual(barIngester, {
            root_type: "bar",
            types: [{
                kind: "OBJECT",
                name: "bar",
                fields: [{
                    name: "poo",
                    type: {
                        kind: "SCALAR",
                        name: "String",
                    },
                }],
            }],
        });
    });

    it("should create simple root type with two fields", () => {
        const barType = type("bar").withStringField("poo").withIntField("puu");
        const barIngester = ingester(barType).build();
        assert.deepEqual(barIngester, {
            root_type: "bar",
            types: [{
                kind: "OBJECT",
                name: "bar",
                fields: [{
                    name: "poo",
                    type: {
                        kind: "SCALAR",
                        name: "String",
                    },
                }, {
                    name: "puu",
                    type: {
                        kind: "SCALAR",
                        name: "Int",
                    },
                }],
            }],
        });
    });

    it("should create simple root type with an object field", () => {
        const fooType = type("foo").withStringField("fuu");
        const barType = type("bar").withObjectField("foo", fooType);
        const barIngester = ingester(barType).withType(fooType).build();
        assert.deepEqual(barIngester, {
            root_type: "bar",
            types: [{
                kind: "OBJECT",
                name: "bar",
                fields: [{
                    name: "foo",
                    type: {
                        kind: "OBJECT",
                        name: "foo",
                    },
                }],
            }, {
                kind: "OBJECT",
                name: "foo",
                fields: [{
                    name: "fuu",
                    type: {
                        kind: "SCALAR",
                        name: "String",
                    },
                }],
            }],
        });
    });

    it("should create root type with two fields and another type", () => {
        const fooType = type("foo").withBooleanField("fuu").withListScalarField("nums", "Int");
        const barType = type("bar").withStringField("poo")
            .withFloatField("puu").withListObjectField("foos", fooType);
        const barIngester = ingester(barType).withType(fooType).build();
        assert.deepEqual(barIngester, {
            root_type: "bar",
            types: [{
                kind: "OBJECT",
                name: "bar",
                fields: [{
                    name: "poo",
                    type: {
                        kind: "SCALAR",
                        name: "String",
                    },
                }, {
                    name: "puu",
                    type: {
                        kind: "SCALAR",
                        name: "Float",
                    },
                }, {
                    name: "foos",
                    type: {
                        kind: "LIST",
                        ofType: {
                            kind: "OBJECT",
                            name: "foo",
                        },
                    },
                }],
            }, {
                kind: "OBJECT",
                name: "foo",
                fields: [{
                    name: "fuu",
                    type: {
                        kind: "SCALAR",
                        name: "Boolean",
                    },
                }, {
                    name: "nums",
                    type: {
                        kind: "LIST",
                        ofType: {
                            kind: "SCALAR",
                            name: "Int",
                        },
                    },
                }],
            }],
        });
    });

    it("should create root type with directive", () => {
        const barType = type("bar").withStringField("poo", "test desc", ["compositeId"])
            .withFloatField("puu");
        const barIngester = ingester(barType).build();
        assert.deepEqual(barIngester, {
            root_type: "bar",
            types: [{
                kind: "OBJECT",
                name: "bar",
                fields: [{
                    name: "poo",
                    description: "test desc",
                    type: {
                        kind: "SCALAR",
                        name: "String",
                    },
                    directives: [{
                        name: "compositeId",
                    }],
                }, {
                    name: "puu",
                    type: {
                        kind: "SCALAR",
                        name: "Float",
                    },
                }],
            }],
        });
    });

    it("should create root type with argument", () => {
        const fooType = type("foo").withBooleanField("fuu").withListScalarField("nums", "Int");
        const barType = type("bar").withStringField("poo")
            .withFloatField("puu").withListObjectField("foos", fooType, "foos desc", ["fuu"]);
        const barIngester = ingester("bar").withType(fooType).withType(barType).build();
        assert.deepEqual(barIngester, {
            root_type: "bar",
            types: [{
                kind: "OBJECT",
                name: "foo",
                fields: [{
                    name: "fuu",
                    type: {
                        kind: "SCALAR",
                        name: "Boolean",
                    },
                }, {
                    name: "nums",
                    type: {
                        kind: "LIST",
                        ofType: {
                            kind: "SCALAR",
                            name: "Int",
                        },
                    },
                }],
            },{
                kind: "OBJECT",
                name: "bar",
                fields: [{
                    name: "poo",
                    type: {
                        kind: "SCALAR",
                        name: "String",
                    },
                }, {
                    name: "puu",
                    type: {
                        kind: "SCALAR",
                        name: "Float",
                    },
                }, {
                    name: "foos",
                    description: "foos desc",
                    type: {
                        kind: "LIST",
                        ofType: {
                            kind: "OBJECT",
                            name: "foo",
                        },
                    },
                    args: [{
                        defaultValue: null,
                        name: "fuu",
                        type: {
                            kind: "SCALAR",
                            name: "Boolean",
                        },
                    }],
                }],
            }],
        });
    });
});
