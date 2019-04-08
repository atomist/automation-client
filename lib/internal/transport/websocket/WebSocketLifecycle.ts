import FastPriorityQueue from "fastpriorityqueue";
import * as WebSocket from "ws";
import { logger } from "../../../util/logger";
import { sendMessage } from "./WebSocketMessageClient";

export interface WebSocketLifecycle {
    /**
     * Set the WebSocket to manage
     * @param ws
     */
    set(ws: WebSocket): void;

    /**
     * Is the WebSocket is connected and healthy
     */
    connected(): boolean;

    /**
     * Get the raw WebSocket that is managed here
     */
    get(): WebSocket;

    /**
     * Reset the WebSocket
     */
    reset(): void;

    /**
     * Send a message over the managed WebSocket
     * If the WebSocket isn't connected, messages are queued for later
     * when a WebSocket is connected again.
     * @param msg
     */
    send(msg: any): void;
}

/**
 * Lifecycle owning a WebSocket connection wrt message sending
 */
export class QueuingWebSocketLifecycle implements WebSocketLifecycle {

    private messages: FastPriorityQueue<any>;
    private ws: WebSocket;
    private timer: NodeJS.Timer;

    constructor() {
        // This is odd but the only way to the types working
        this.messages = require("FastPriorityQueue")() as FastPriorityQueue<any>;
    }

    /**
     * Set the WebSocket to manage
     * @param ws
     */
    public set(ws: WebSocket): void {
        this.ws = ws;
    }

    /**
     * Is the WebSocket is connected and healthy
     */
    public connected(): boolean {
        return !!this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    /**
     * Get the raw WebSocket that is managed here
     */
    public get(): WebSocket {
        return this.ws;
    }

    /**
     * Reset the WebSocket
     */
    public reset(): void {
        this.ws = null;
    }

    /**
     * Send a message over the managed WebSocket
     * If the WebSocket isn't connected, messages are queued for later
     * when a WebSocket is connected again.
     * @param msg
     */
    public send(msg: any): void {
        if (!this) {
            logger.warn(`WebSocket has been destroyed before we were able to send the message`);
            return;
        } else if (this.connected()) {
            sendMessage(msg, this.ws, true);
        } else {
            if (!this.timer) {
                this.init();
            }
            this.messages.add(msg);
        }
    }

    /**
     * Init the internal queue processing
     */
    private init(): void {
        this.timer = setInterval(async () => {
            const queuedMessages = [];
            while (!this.messages.isEmpty()) {
                queuedMessages.push(this.messages.poll());
            }
            queuedMessages.forEach(this.send);
        }, 1000);
        this.timer.unref();
    }
}
