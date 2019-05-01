import { SlackMessage } from "@atomist/slack-messages";
import "mocha";
import * as assert from "power-assert";
import { QueuingWebSocketLifecycle } from "../../../../lib/internal/transport/websocket/WebSocketLifecycle";
import {
    clean,
    WebSocketCommandMessageClient,
    WebSocketEventMessageClient,
} from "../../../../lib/internal/transport/websocket/WebSocketMessageClient";
import { guid } from "../../../../lib/internal/util/string";
import {
    buttonForCommand,
    SlackDestination,
    SlackFileMessage,
} from "../../../../lib/spi/message/MessageClient";

describe("WebSocketMessageClient", () => {

    it("respond is not allowed from event handlers", done => {
        const client = new WebSocketEventMessageClient(
            {
                data: {},
                extensions: { team_id: "Txxxxxxx", correlation_id: guid(), operationName: "Foor" },
                secrets: [],
            }, null, {});
        client.respond("Some test message")
            .catch(err => {
                assert(err.message === "Response messages are not supported for event handlers");
                done();
            });

    });

    it("correctly clean up addresses", () => {
        assert(clean("test")[0] === "test");
        assert(clean(["test"])[0] === "test");
        assert(clean([""]).length === 0);
    });

    it("correctly format user message", done => {
        const corrId = guid();
        const client = new WebSocketEventMessageClient(
            {
                data: {},
                extensions: { team_id: "Txxxxxxx", correlation_id: corrId, operationName: "Foor" },
                secrets: [],
            }, new QueuingWebSocketLifecycle(), {});

        const msg: SlackMessage = {
            attachments: [{
                fallback: "test",
                text: "test",
                actions: [
                    buttonForCommand({ text: "Foo" }, "HelloWorld", { name: "cd" }),
                ],
            }],
        };

        client.send(msg, {
            userAgent: "slack",
            team: "Txxxxxxx",
            users: ["cd", "rod"],
        } as SlackDestination, { id: "123456" })
            .then(fm => {
                assert(fm.api_version === "1");
                assert(fm.correlation_id === corrId);
                assert(fm.content_type === "application/x-atomist-slack+json");
                assert(fm.team.id === "Txxxxxxx");
                assert(fm.event === "Foor");
                assert(fm.id === "123456");
                assert(fm.destinations.length === 2);
                assert(fm.destinations[0].user_agent === "slack");
                assert(fm.destinations[0].slack.team.id === "Txxxxxxx");
                assert(fm.destinations[0].slack.user.name === "cd");
                assert(fm.destinations[1].user_agent === "slack");
                assert(fm.destinations[1].slack.team.id === "Txxxxxxx");
                assert(fm.destinations[1].slack.user.name === "rod");
                assert(fm.actions.length === 1);
                assert(fm.actions[0].id === "helloworld-0");
                assert(fm.actions[0].command === "HelloWorld");
                assert(fm.actions[0].parameters.length === 1);
                assert(fm.actions[0].parameters[0].name === "name");
                assert(fm.actions[0].parameters[0].value === "cd");
                done();
            });

    });

    it("correctly format channel message", done => {
        const corrId = guid();
        const client = new WebSocketEventMessageClient(
            {
                data: {},
                extensions: { team_id: "Txxxxxxx", correlation_id: corrId, operationName: "Foor" },
                secrets: [],
            }, new QueuingWebSocketLifecycle(), {});

        const msg: SlackMessage = {
            attachments: [{
                fallback: "test",
                text: "test",
                actions: [
                    buttonForCommand({ text: "Foo" }, "HelloWorld", { name: "cd" }),
                ],
            }],
        };

        client.send(msg, {
            userAgent: "slack",
            team: "Txxxxxxx",
            channels: ["general", "test"],
        } as SlackDestination, { id: "123456" })
            .then(fm => {
                assert(fm.api_version === "1");
                assert(fm.correlation_id === corrId);
                assert(fm.content_type === "application/x-atomist-slack+json");
                assert(fm.team.id === "Txxxxxxx");
                assert(fm.event === "Foor");
                assert(fm.id === "123456");
                assert(fm.destinations.length === 2);
                assert(fm.destinations[0].user_agent === "slack");
                assert(fm.destinations[0].slack.team.id === "Txxxxxxx");
                assert(fm.destinations[0].slack.channel.name === "general");
                assert(fm.destinations[1].user_agent === "slack");
                assert(fm.destinations[1].slack.team.id === "Txxxxxxx");
                assert(fm.destinations[1].slack.channel.name === "test");
                assert(fm.actions.length === 1);
                assert(fm.actions[0].id === "helloworld-0");
                assert(fm.actions[0].command === "HelloWorld");
                assert(fm.actions[0].parameters.length === 1);
                assert(fm.actions[0].parameters[0].name === "name");
                assert(fm.actions[0].parameters[0].value === "cd");
                done();
            });

    });

    it("correctly format response message", done => {
        const corrId = guid();
        const client = new WebSocketCommandMessageClient(
            {
                api_version: "1",
                correlation_id: corrId,
                team: {
                    id: "Txxxxxxx",
                },
                source: {
                    user_agent: "slack",
                    slack: {
                        team: {
                            id: "Txxxxxxx",
                        },
                        channel: {
                            id: "C12",
                        },
                        thread_ts: "123",
                    },
                },
                command: "Foor",
                parameters: [],
                mapped_parameters: [],
                secrets: [],
            }, new QueuingWebSocketLifecycle(), {});

        const msg: SlackMessage = {
            attachments: [{
                fallback: "test",
                text: "test",
                actions: [
                    buttonForCommand({ text: "Foo" }, "HelloWorld", { name: "cd" }),
                ],
            }],
        };

        client.respond(msg, { id: "123456" })
            .then(fm => {
                assert(fm.api_version === "1");
                assert(fm.correlation_id === corrId);
                assert(fm.content_type === "application/x-atomist-slack+json");
                assert(fm.team.id === "Txxxxxxx");
                assert(fm.command === "Foor");
                assert(fm.id === "123456");
                assert(fm.destinations.length === 1);
                assert(fm.destinations[0].user_agent === "slack");
                assert(fm.destinations[0].slack.team.id === "Txxxxxxx");
                assert(fm.destinations[0].slack.channel.id === "C12");
                assert(fm.destinations[0].slack.thread_ts === "123");
                assert(fm.actions.length === 1);
                assert(fm.actions[0].id === "helloworld-0");
                assert(fm.actions[0].command === "HelloWorld");
                assert(fm.actions[0].parameters.length === 1);
                assert(fm.actions[0].parameters[0].name === "name");
                assert(fm.actions[0].parameters[0].value === "cd");
                done();
            });

    });

    it("correctly format response file message", done => {
        const corrId = guid();
        const client = new WebSocketCommandMessageClient(
            {
                api_version: "1",
                correlation_id: corrId,
                team: {
                    id: "Txxxxxxx",
                },
                source: {
                    user_agent: "slack",
                    slack: {
                        team: {
                            id: "Txxxxxxx",
                        },
                        channel: {
                            id: "C12",
                        },
                        thread_ts: "123",
                    },
                },
                command: "Foor",
                parameters: [],
                mapped_parameters: [],
                secrets: [],
            }, new QueuingWebSocketLifecycle(), {});

        const msg: SlackFileMessage = {
            content: "some basic text",
            title: "some title",
            comment: "some comment",
            fileType: "javascript",
            fileName: "some file",
        };

        client.respond(msg, { id: "123456" })
            .then(fm => {
                assert(fm.api_version === "1");
                assert(fm.correlation_id === corrId);
                assert(fm.content_type === "application/x-atomist-slack-file+json");
                assert(fm.team.id === "Txxxxxxx");
                assert(fm.command === "Foor");
                assert(fm.id === "123456");
                assert(fm.destinations.length === 1);
                assert(fm.destinations[0].user_agent === "slack");
                assert(fm.destinations[0].slack.team.id === "Txxxxxxx");
                assert(fm.destinations[0].slack.channel.id === "C12");
                assert(fm.destinations[0].slack.thread_ts === "123");
                assert(!fm.actions);

                const newMsg = JSON.parse(fm.body);
                assert(newMsg.content === msg.content);
                assert(newMsg.title === msg.title);
                assert(newMsg.initial_comment === msg.comment);
                assert(newMsg.filetype === msg.fileType);
                assert(newMsg.filename === msg.fileName);
                done();
            });

    });
});
