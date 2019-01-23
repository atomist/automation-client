import * as TinyQueue from "tinyqueue";
import * as WebSocket from "ws";
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

    private messages: TinyQueue;
    private ws: WebSocket;
    private timer: NodeJS.Timer;

    constructor() {
        this.messages = new TinyQueue();
    }

    /**
     * Set the WebSocket to manage
     * @param ws
     */
    set(ws: WebSocket): void {
        this.ws = ws;
    }

    /**
     * Is the WebSocket is connected and healthy
     */
    connected(): boolean {
        return !!this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    /**
     * Get the raw WebSocket that is managed here
     */
    get(): WebSocket {
        return this.ws;
    }

    /**
     * Reset the WebSocket
     */
    reset(): void {
        this.ws = null;
    }

    /**
     * Send a message over the managed WebSocket
     * If the WebSocket isn't connected, messages are queued for later
     * when a WebSocket is connected again.
     * @param msg
     */
    send(msg: any): void {
        if (this.connected()) {
            sendMessage(msg, this.ws, true);
        } else {
            if (!this.timer) {
                this.init();
            }
            this.messages.push(msg);
        }
    }

    /**
     * Init the internal queue processing
     */
    private init(): void {
        this.timer = setInterval(async () => {
            const queuedMessages = [];
            while (this.messages.length) {
                queuedMessages.push(this.messages.pop());
            }
            queuedMessages.forEach(this.send);
        }, 1000);
        this.timer.unref();
    }
}
