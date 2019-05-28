import * as cluster from "cluster";
import { EventFired } from "../../../HandleEvent";
import { CommandInvocation } from "../../invoker/Payload";
import { AutomationContext } from "../../util/cls";
import { RegistrationConfirmation } from "../websocket/WebSocketRequestProcessor";

export interface MasterMessage {
    type: "atomist:registration" | "atomist:event" | "atomist:command";
    registration: RegistrationConfirmation;
    context: AutomationContext;
    data?: any;
}

export interface MasterManagementMessage {
    type: "atomist:gc" | "atomist:heapdump";
}

export interface WorkerMessage {
    type: "atomist:online" | "atomist:status" | "atomist:message" | "atomist:command_success"
        | "atomist:command_failure" | "atomist:event_success" | "atomist:event_failure" | "atomist:shutdown";
    event?: EventFired<any> | CommandInvocation;
    context: AutomationContext;
    data?: any;
}

export function broadcast(message: MasterMessage | MasterManagementMessage): void {
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
