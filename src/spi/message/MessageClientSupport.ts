import {
    Destination,
    MessageClient,
    MessageOptions,
} from "./MessageClient";

export abstract class MessageClientSupport implements MessageClient {

    public respond(msg: any,
                   options?: MessageOptions): Promise<any> {
        return this.doSend(msg, [], options);
    }

    public send(msg: any,
                destinations: Destination | Destination[],
                options?: MessageOptions): Promise<any> {
        if (!Array.isArray(destinations)) {
            destinations = [ destinations ];
        }
        return this.doSend(msg, destinations as Destination[], options);
    }

    protected abstract doSend(msg: any,
                              destinations: Destination[],
                              options?: MessageOptions): Promise<any>;

}
