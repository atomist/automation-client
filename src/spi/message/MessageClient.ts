import {
    Action,
    SlackMessage,
} from "@atomist/slack-messages/SlackMessages";
import { guid } from "../../internal/util/string";
import { ScriptedFlushable } from "../../project/Flushable";
import * as _ from "lodash";

/**
 * Implemented by classes that can send bot messages, whether to
 * channels or individuals, including actions and updates.
 */
export interface MessageClient extends ScriptedFlushable<MessageClient> {

    respond(msg: string | SlackMessage, options?: MessageOptions): Promise<any>;

    addressUsers(msg: string | SlackMessage, userNames: string | string[], options?: MessageOptions): Promise<any>;

    addressChannels(msg: string | SlackMessage, channelNames: string | string[],
                    options?: MessageOptions): Promise<any>;

    recordRespond(msg: string | SlackMessage, options?: MessageOptions): this;

    recordAddressUsers(msg: string | SlackMessage, userNames: string | string[], options?: MessageOptions): this;

    recordAddressChannels(msg: string | SlackMessage, channelNames: string | string[],
                          options?: MessageOptions): this;
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
     * sortable lexicographically.
     */
    ts?: number;

    /**
     * If update_only is given, this message will only be posted
     * if a previous message with the same id exists.
     */
    post?: "update_only" | "always";
}

export class MessageMimeTypes {

    public static SLACK_JSON: "application/x-atomist-slack+json" | "text/plain"
        = "application/x-atomist-slack+json";
    public static PLAIN_TEXT: "application/x-atomist-slack+json" | "text/plain"
        = "text/plain";
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

export function buttonForCommand(buttonSpec: ButtonSpec, commandName: string, parameters: {} = {}): Action {
    const id = `${commandName.toLocaleLowerCase()}-${guid()}`;
    const action = rugButtonFrom(buttonSpec, { id }) as CommandReferencingAction;
    action.command = {
        id,
        name: commandName,
        parameters,
    };
    return action;
}

export function menuForCommand(selectSpec: SelectSpec, commandName: string, parameterName: string,
                               parameters?: {}): Action {
    const id = `${commandName.toLocaleLowerCase()}-${guid()}`;
    const action = rugMenuFrom(selectSpec, { id, parameterName }) as CommandReferencingAction;
    action.command = {
        id,
        name: commandName,
        parameters,
        parameterName,
    };
    return action;
}

export function isSlackMessage(object: any): object is SlackMessage {
    return !object.length;
}

function rugButtonFrom(action: ButtonSpec, command: any): Action {
    if (!command.id) {
        throw new Error(`Please provide a valid non-empty command id`);
    }
    const button: Action = {
        text: action.text,
        type: "button",
        name: "rug",
        value: command.id,
    };
    _.forOwn(action, (v, k) => {
        (button as any)[k] = v;
    });
    return button;
}

function rugMenuFrom(action: SelectSpec, command: any): Action {

    if (!command.id) {
        throw new Error("SelectableIdentifiableInstruction must have id set");
    }

    if (!command.parameterName) {
        throw new Error("SelectableIdentifiableInstruction must have parameterName set");
    }

    const select: Action = {
        text: action.text,
        type: "select",
        name: `rug::${command.id}`,
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

export interface ButtonSpec {
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

export interface SelectSpec {
    text: string;
    options: SelectOption[] | DataSource | OptionGroup[];
}