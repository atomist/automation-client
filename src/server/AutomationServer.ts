import { Invoker } from "../internal/invoker/Invoker";
import { MetadataStore } from "../internal/metadata/MetadataStore";

export interface AutomationServer extends MetadataStore, Invoker {

}
