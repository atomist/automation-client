import * as HttpsProxyAgent from "https-proxy-agent";
import * as WebSocket from "ws";
import { RegistrationConfirmation } from "../../internal/transport/websocket/WebSocketRequestProcessor";
import { logger } from "../../util/logger";

/**
 * Factory to create a WebSocket instance.
 */
export interface WebSocketFactory {

    /**
     * Create a WebSocket for the provided registration
     * @param registration
     */
    create(registration: RegistrationConfirmation): WebSocket;
}

/**
 * WS based WebSocketFactory implementation
 */
export class WSWebSocketFactory implements WebSocketFactory {

    public create(registration: RegistrationConfirmation): WebSocket {
        return new WebSocket(registration.url, this.configureOptions({}));
    }

    protected configureOptions(options: WebSocket.ClientOptions): WebSocket.ClientOptions {
        if (process.env.HTTPS_PROXY || process.env.https_proxy) {
            const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
            logger.debug(`WebSocket connection using proxy '${proxy}'`);
            options.agent = new HttpsProxyAgent(proxy);
        }
        return options;
    }
}

export const defaultWebSocketFactory = () => new WSWebSocketFactory();
