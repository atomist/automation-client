import { Ingester } from "../../src/ingesters";

export const CircleCIPayload: Ingester = {
    root_type: "CircleCIPayload",
    types: [{
        kind: "OBJECT",
        name: "CircleCIPayload",
        fields: [{
            name: "payload",
            type: {
                kind: "OBJECT",
                name: "CircleCIBuild",
            },
        }],
    }, {
        kind: "OBJECT",
        name: "CircleCIBuild",
        fields: [{
            name: "build_num",
            type: {
                kind: "SCALAR",
                name: "Int",
            },
            directives: [{
                name: "compositeId",
            }],
        }, {
            name: "vcs_revision",
            type: {
                kind: "SCALAR",
                name: "String",
            },
        }, {
            name: "reponame",
            type: {
                kind: "SCALAR",
                name: "String",
            },
            directives: [{
                name: "compositeId",
            }],
        }, {
            name: "branch",
            type: {
                kind: "SCALAR",
                name: "String",
            },
            directives: [{
                name: "compositeId",
            }],
        }],
    }],
};
