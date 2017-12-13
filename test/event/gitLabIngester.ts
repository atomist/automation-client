import { Ingester } from "../../src/ingesters";

export const GitLabPushPayload: Ingester = {
  root_type: "GitLabPush",
  types: [
    {
      kind: "OBJECT",
      name: "GitLabPush",
      fields: [
        {
          name: "user_username",
          type: {
            kind: "SCALAR",
            name: "String",
          },
        },
        {
          name: "checkout_sha",
          type: {
            kind: "SCALAR",
            name: "String",
          },
          directives: [
            {
              name: "compositeId",
            },
          ],
        },
        {
          name: "user_avatar",
          type: {
            kind: "SCALAR",
            name: "String",
          },
        },
        {
          name: "repository",
          type: {
            kind: "OBJECT",
            name: "GitLabRepository",
          },
        },
        {
          name: "commits",
          type: {
            kind: "LIST",
            ofType: {
              kind: "OBJECT",
              name: "GitLabLabCommit",
            },
          },
        },
      ],
    },
    {
      kind: "OBJECT",
      name: "GitLabLabCommit",
      fields: [
        {
          name: "id",
          type: {
            kind: "SCALAR",
            name: "String",
          },
        },
        {
            name: "message",
            type: {
                kind: "SCALAR",
                name: "String",
            },
        },
        {
          name: "url",
          type: {
            kind: "SCALAR",
            name: "String",
          },
        },
        {
          name: "author",
          type: {
            kind: "OBJECT",
            name: "GitLabAuthor",
          },
        },
      ],
    },
    {
      kind: "OBJECT",
      name: "GitLabAuthor",
      fields: [
        {
          name: "name",
          type: {
            kind: "SCALAR",
            name: "String",
          },
        },
        {
          name: "email",
          type: {
            kind: "SCALAR",
            name: "String",
          },
        },
      ],
    },
    {
      kind: "OBJECT",
      name: "GitLabRepository",
      fields: [
        {
          name: "name",
          type: {
            kind: "SCALAR",
            name: "String",
          },
        },
        {
          name: "git_http_url",
          type: {
            kind: "SCALAR",
            name: "String",
          },
        },
      ],
    },
  ],
};
