import {
    Action,
    SlackMessage,
} from "@atomist/slack-messages/SlackMessages";
import * as _ from "lodash";
import { metadataFromInstance } from "../../internal/metadata/metadataReading";

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
    respond(msg: any,
            options?: MessageOptions): Promise<any>;

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
 *
 * Note: This implementation is deprecated in favor of MessageClient.
 */
export interface SlackMessageClient {

    addressUsers(msg: string | SlackMessage,
                 users: string | string[],
                 options?: MessageOptions): Promise<any>;

    addressChannels(msg: string | SlackMessage,
                    channels: string | string[],
                    options?: MessageOptions): Promise<any>;
}

/**
 * Basic message destination.
 */
export interface Destination {

    userAgent: string;
}

/**
 * Message Destination for Slack.
 */
export class SlackDestination implements Destination {

    public static SLACK_USER_AGENT: string = "slack";

    public userAgent: string = SlackDestination.SLACK_USER_AGENT;

    public users: string[] = [];
    public channels: string[] = [];

    constructor(public team: string) { }

    /**
     * Address certain users by their user name.
     * @param {string} user
     * @returns {SlackDestination}
     */
    public addressUser(user: string): SlackDestination {
        this.users.push(user);
        return this;
    }

    /**
     * Address certains channels by their channel name.
     * @param {string} channel
     * @returns {SlackDestination}
     */
    public addressChannel(channel: string): SlackDestination {
        this.channels.push(channel);
        return this;
    }
}

/**
 * Shortcut for creating a SlackDestination which addresses the given users.
 * @param {string} team
 * @param {string} users
 * @returns {SlackDestination}
 */
export function addressSlackUsers(team: string, ...users: string[]): SlackDestination {
    const sd = new SlackDestination(team);
    users.forEach(u => sd.addressUser(u));
    return sd;
}

/**
 * Shortcut for creating a SlackDestination which addresses the given channels.
 * @param {string} team
 * @param {string} channels
 * @returns {SlackDestination}
 */
export function addressSlackChannels(team: string, ...channels: string[]): SlackDestination {
    const sd = new SlackDestination(team);
    channels.forEach(c => sd.addressChannel(c));
    return sd;
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

export interface MessageOptions {

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

export class MessageMimeTypes {

    public static SLACK_JSON = "application/x-atomist-slack+json";
    public static SLACK_FILE_JSON = "application/x-atomist-slack-file+json";
    public static PLAIN_TEXT = "text/plain";
}

export interface CommandReferencingAction extends Action {

    command: CommandReference;
}

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

export function buttonForCommand(buttonSpec: ButtonSpecification,
                                 command: any,
                                 parameters: {
        [name: string]: string | number | boolean,
    } = {}): Action {
    const cmd = commandName(command);
    parameters = mergeParameters(command, parameters);
    const id = cmd.toLocaleLowerCase();
    const action = rugButtonFrom(buttonSpec, { id }) as CommandReferencingAction;
    action.command = {
        id,
        name: cmd,
        parameters,
    };
    return action;
}

export function menuForCommand(selectSpec: MenuSpecification,
                               command: any,
                               parameterName: string,
                               parameters: {
        [name: string]: string | number | boolean,
    } = {}): Action {
    const cmd = commandName(command);
    parameters = mergeParameters(command, parameters);
    const id = cmd.toLocaleLowerCase();
    const action = rugMenuFrom(selectSpec, { id, parameterName }) as CommandReferencingAction;
    action.command = {
        id,
        name: cmd,
        parameters,
        parameterName,
    };
    return action;
}

export function isSlackMessage(object: any): object is SlackMessage {
    return !object.length && !object.content;
}

export function isFileMessage(object: any): object is SlackFileMessage {
    return !object.length && object.content;
}

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

export function mergeParameters(command: any, parameters: any): any {
    // Reuse parameters defined on the instance
    if (typeof command !== "string" && typeof command !== "function") {
        parameters = {
            ...command,
            ...parameters,
        };
    }
    return parameters;
}
function rugButtonFrom(action: ButtonSpecification, command: any): Action {
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

function rugMenuFrom(action: MenuSpecification, command: any): Action {

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
}
