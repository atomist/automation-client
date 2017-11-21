import * as cluster from "cluster";
import { EventFired } from "../../../HandleEvent";
import { CommandInvocation } from "../../invoker/Payload";
import { AutomationContext } from "../../util/cls";
import { RegistrationConfirmation } from "../websocket/WebSocketRequestProcessor";

export interface MasterMessage {
    type: "registration" | "event" | "command";
    registration: RegistrationConfirmation;
    cls?: AutomationContext;
    data?: any;
}

export interface MasterManagementMessage {
    type: "gc" | "heapdump";
}

export interface WorkerMessage {
    type: "online" | "status" | "message" | "command_success" | "command_failure" | "event_success" | "event_failure";
    event?: EventFired<any> | CommandInvocation;
    cls?: AutomationContext;
    data?: any;
}

export function broadcast(message: MasterMessage | MasterManagementMessage) {
    if (cluster.isMaster) {
        for (const id in cluster.workers) {
            if (cluster.workers.hasOwnProperty(id)) {
                const worker = cluster.workers[id];
                worker.send(message);
            }
        }
    }
}

export function workerSend(message: WorkerMessage): Promise<any> {
    return Promise.resolve(process.send(message));
}
