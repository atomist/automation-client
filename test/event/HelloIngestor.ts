import { Ingestor } from "../../src/decorators";
import { EventFired, HandleEvent, HandlerContext, HandlerResult, Success } from "../../src/Handlers";
import { logger } from "../../src/internal/util/logger";

@Ingestor("A simple ingestor that accepts Hello payloads", "hello")
export class HelloIngestor implements HandleEvent<Hello> {

    public handle(e: EventFired<Hello>, ctx: HandlerContext): Promise<HandlerResult> {
        logger.info(`Incoming event had ${e.data.name}`);
        return Promise.resolve(Success);
    }
}

export interface Hello {
    name: string;
}
