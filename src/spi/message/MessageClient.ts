import {
    Action,
    SlackMessage,
} from "@atomist/slack-messages/SlackMessages";
import { flatten } from "flat";
import * as _ from "lodash";
import { AnyOptions } from "../../configuration";
import { HandlerContext } from "../../HandlerContext";
import { metadataFromInstance } from "../../internal/metadata/metadataReading";
import { lookupChatTeam } from "./MessageClientSupport";

/**
 * Implemented by classes that can send bot messages, whether to
 * channels or individuals, including actions and updates.
 */
export interface MessageClient {

    /**
     * Send a response back to where this command request originated.
     * @param msg
     * @param {MessageOptions} options
     * @returns {Promise<any>}
     */
    respond(msg: any, options?: MessageOptions): Promise<any>;

    /**
     * Send a message to any given destination.
     * @param msg
     * @param {Destination | Destination[]} destinations
     * @param {MessageOptions} options
     * @returns {Promise<any>}
     */
    send(msg: any,
         destinations: Destination | Destination[],
         options?: MessageOptions): Promise<any>;
}

/**
 * MessageClient to send messages to the default Slack team.
 */
export interface SlackMessageClient {

    /**
     * Send a message to a Slack user
     * @param {string | SlackMessage | SlackFileMessage} msg
     * @param {string | string[]} users
     * @param {MessageOptions} options
     * @returns {Promise<any>}
     */
    addressUsers(msg: string | SlackMessage | SlackFileMessage,
                 users: string | string[],
                 options?: MessageOptions): Promise<any>;

    /**
     * Send a message to a Slack channel
     * @param {string | SlackMessage | SlackFileMessage} msg
     * @param {string | string[]} channels
     * @param {MessageOptions} options
     * @returns {Promise<any>}
     */
    addressChannels(msg: string | SlackMessage | SlackFileMessage,
                    channels: string | string[],
                    options?: MessageOptions): Promise<any>;
}

/**
 * Basic message destination.
 */
export interface Destination {

    /** Type of Destination. */
    userAgent: string;
}

/**
 * Message Destination for Slack.
 */
export class SlackDestination implements Destination {

    public static SLACK_USER_AGENT: string = "slack";

    public userAgent: string = SlackDestination.SLACK_USER_AGENT;

    /** Slack user names to send message to. */
    public users: string[] = [];
    /** Slack channel names to send message to. */
    public channels: string[] = [];

    /**
     * Create a Destination suitable for sending messages to a Slack
     * workspace.
     *
     * @param team Slack workspace ID, which typically starts with the
     *             letter "T", consists of numbers and upper-case letters,
     *             and is nine characters long.  It can be obtained by
     *             sending the Atomist Slack bot the message "team".
     * @return {SlackDestination} A MessageClient suitable for sending messages.
     */
    constructor(public team: string) { }

    /**
     * Address user by Slack user name.  This method appends the
     * provided user to a list of users that will be sent the message
     * via this Destination.  In other words, calling repeatedly with
     * differing Slack user names results in the message being sent to
     * all such users.
     *
     * @param {string} user Slack user name.
     * @returns {SlackDestination} MessageClient Destination that results
     *          in message being send to user.
     */
    public addressUser(user: string): SlackDestination {
        this.users.push(user);
        return this;
    }

    /**
     * Address channel by Slack channel name.  This method appends the
     * provided channel to a list of channels that will be sent the
     * message via this Destination.  In other words, calling
     * repeatedly with differing Slack channel names results in the
     * message being sent to all such channels.
     *
     * @param {string} channel Slack channel name.
     * @returns {SlackDestination} MessageClient Destination that results
     *          in message being send to channel.
     */
    public addressChannel(channel: string): SlackDestination {
        this.channels.push(channel);
        return this;
    }
}

/**
 * Shortcut for creating a SlackDestination which addresses the given
 * users.
 *
 * @param {string} team Slack workspace ID to create Destination for.
 * @param {string} users Slack user names to send message to.
 * @returns {SlackDestination} MessageClient Destination to pass to `send`.
 */
export function addressSlackUsers(team: string, ...users: string[]): SlackDestination {
    const sd = new SlackDestination(team);
    users.forEach(u => sd.addressUser(u));
    return sd;
}

/**
 * Shortcut for creating a SlackDestination which addresses the given
 * users in all Slack teams connected to the context.
 *
 * @param {HandlerContext} ctx Handler context as passed to the Handler handle method.
 * @param {string} users Slack user names to send message to.
 * @returns {Promise<SlackDestination>} MessageClient Destination to pass to `send`.
 */
export function addressSlackUsersFromContext(ctx: HandlerContext, ...users: string[]): Promise<SlackDestination> {
    return lookupChatTeam(ctx.graphClient)
        .then(chatTeamId => {
            return addressSlackUsers(chatTeamId, ...users);
        });
}

/**
 * Shortcut for creating a SlackDestination which addresses the given
 * channels.
 *
 * @param {string} team Slack workspace ID to create Destination for.
 * @param {string} channels Slack channel names to send messages to.
 * @returns {SlackDestination} MessageClient Destination to pass to `send`.
 */
export function addressSlackChannels(team: string, ...channels: string[]): SlackDestination {
    const sd = new SlackDestination(team);
    channels.forEach(c => sd.addressChannel(c));
    return sd;
}

/**
 * Shortcut for creating a SlackDestination which addresses the given
 * channels in all Slack teams connected to the context.
 *
 * @param {HandlerContext} ctx Handler context as passed to the Handler handle method.
 * @param {string} channels Slack channel names to send messages to.
 * @returns {Promise<SlackDestination>} MessageClient Destination to pass to `send`.
 */
export function addressSlackChannelsFromContext(ctx: HandlerContext, ...channels: string[]): Promise<SlackDestination> {
    return lookupChatTeam(ctx.graphClient)
        .then(chatTeamId => {
            return addressSlackChannels(chatTeamId, ...channels);
        });
}

/**
 * Message Destination for Custom Event types.
 */
export class CustomEventDestination implements Destination {

    public static INGESTER_USER_AGENT: string = "ingester";

    public userAgent: string = CustomEventDestination.INGESTER_USER_AGENT;

    /**
     * Constructur returning a Destination for creating an instance of
     * the Custom Event type `rootType`.
     */
    constructor(public rootType: string) { }
}

/**
 * Helper wrapping the constructor for CustomEventDestination.
 */
export function addressEvent(rootType: string): CustomEventDestination {
    return new CustomEventDestination(rootType);
}

/**
 * Message to create a Snippet in Slack
 */
export interface SlackFileMessage {
    content: string;
    title?: string;
    fileName?: string;
    // https://api.slack.com/types/file#file_types
    fileType?: string;
    comment?: string;

}

/**
 * Options for sending messages using the MessageClient.
 */
export interface MessageOptions extends AnyOptions {

    /**
     * Unique message id per channel and team. This is required
     * if you wish to re-write a message at a later time.
     */
    id?: string;

    /**
     * Time to live for a posted message. If ts + ttl of the
     * existing message with ts is < as a new incoming message
     * with the same id, the message will be re-written.
     */
    ttl?: number;

    /**
     * Timestamp of the message. The timestamp needs to be
     * sortable lexicographically. Should be in milliseconds and
     * defaults to Date.now().
     *
     * This is only applicable if id is set too.
     */
    ts?: number;

    /**
     * If update_only is given, this message will only be posted
     * if a previous message with the same id exists.
     */
    post?: "update_only" | "always";
}

/** Valid MessageClient types. */
export class MessageMimeTypes {

    public static SLACK_JSON = "application/x-atomist-slack+json";
    public static SLACK_FILE_JSON = "application/x-atomist-slack-file+json";
    public static PLAIN_TEXT = "text/plain";
    public static APPLICATION_JSON = "application/json";
}

export interface CommandReferencingAction extends Action {

    command: CommandReference;
}

/**
 * Information about a command handler used to connect message actions
 * to a command.
 */
export interface CommandReference {

    /**
     * The id of the action as referenced in the markup.
     */
    id: string;

    /**
     * The name of the command the button or menu should invoke
     * when selected.
     */
    name: string;

    /**
     *  List of parameters to be passed to the command.
     */
    parameters?: {};

    /**
     * Name of the parameter that should be used to pass the values
     * of the menu drop-down.
     */
    parameterName?: string;
}

/**
 * Create a slack button that invokes a command handler.
 */
export function buttonForCommand(buttonSpec: ButtonSpecification,
                                 command: any,
                                 parameters: {
        [name: string]: string | number | boolean,
    } = {}): Action {
    const cmd = commandName(command);
    parameters = mergeParameters(command, parameters);
    const id = cmd.toLocaleLowerCase();
    const action = chatButtonFrom(buttonSpec, { id }) as CommandReferencingAction;
    action.command = {
        id,
        name: cmd,
        parameters,
    };
    return action;
}

/**
 * Create a Slack menu that invokes a command handler.
 */
export function menuForCommand(selectSpec: MenuSpecification,
                               command: any,
                               parameterName: string,
                               parameters: {
        [name: string]: string | number | boolean,
    } = {}): Action {
    const cmd = commandName(command);
    parameters = mergeParameters(command, parameters);
    const id = cmd.toLocaleLowerCase();
    const action = chatMenuFrom(selectSpec, { id, parameterName }) as CommandReferencingAction;
    action.command = {
        id,
        name: cmd,
        parameters,
        parameterName,
    };
    return action;
}
/**
 * Check if the object is a valid Slack message.
 */
export function isSlackMessage(object: any): object is SlackMessage {
    return (object.text || object.attachments) && !object.content;
}

/**
 * Check if the object is a valid Slack file message, i.e., a snippet.
 */
export function isFileMessage(object: any): object is SlackFileMessage {
    return !object.length && object.content;
}

/**
 * Extract command name from the argument.
 */
export function commandName(command: any): string {
    try {
        if (typeof command === "string") {
            return command as string;
        } else if (typeof command === "function") {
            return command.prototype.constructor.name;
        } else {
            return metadataFromInstance(command).name;
        }
    } catch (e) {
        throw new Error("Unable to determine the name of this command. " +
            "Please pass the name as a string or an instance of the command");
    }
}

/**
 * Merge the provided parameters into any parameters provided as
 * command object instance variables.
 */
export function mergeParameters(command: any, parameters: any): any {
    // Reuse parameters defined on the instance
    if (typeof command !== "string" && typeof command !== "function") {
        const newParameters = _.merge(command, parameters);
        return flatten(newParameters);
    }
    return parameters;
}

function chatButtonFrom(action: ButtonSpecification, command: any): Action {
    if (!command.id) {
        throw new Error(`Please provide a valid non-empty command id`);
    }
    const button: Action = {
        text: action.text,
        type: "button",
        name: `automation-command::${command.id}`,
    };
    _.forOwn(action, (v, k) => {
        (button as any)[k] = v;
    });
    return button;
}

function chatMenuFrom(action: MenuSpecification, command: any): Action {

    if (!command.id) {
        throw new Error("SelectableIdentifiableInstruction must have id set");
    }

    if (!command.parameterName) {
        throw new Error("SelectableIdentifiableInstruction must have parameterName set");
    }

    const select: Action = {
        text: action.text,
        type: "select",
        name: `automation-command::${command.id}`,
    };

    if (typeof action.options === "string") {
        select.data_source = action.options;
    } else if (action.options.length > 0) {
        const first = action.options[0] as any;
        if (first.value) {
            // then it's normal options
            select.options = action.options as SelectOption[];
        } else {
            // then it's option groups
            select.option_groups = action.options as OptionGroup[];
        }
    }

    _.forOwn(action, (v, k) => {
        if (k !== "options") {
            (select as any)[k] = v;
        }
    });
    return select;
}

export interface ActionConfirmation {
    title?: string;
    text: string;
    ok_text?: string;
    dismiss_text?: string;
}

export interface ButtonSpecification {
    text: string;
    style?: string;
    confirm?: ActionConfirmation;
    role?: string;
}

export interface SelectOption {
    text: string;
    value: string;
}

export interface OptionGroup {
    text: string;
    options: SelectOption[];
}

export type DataSource = "static" | "users" | "channels" | "conversations" | "external";

export interface MenuSpecification {
    text: string;
    options: SelectOption[] | DataSource | OptionGroup[];
    role?: string;
}
