
import { ScriptAction, ScriptedFlushable } from "./Flushable";

/**
 * Support for ScriptedFlushable operations
 */
export abstract class AbstractScriptedFlushable<T> implements ScriptedFlushable<T> {

    private actions: Array<ScriptAction<T, any>> = [];

    public recordAction(action: ScriptAction<T, any>): this {
        this.actions.push(action);
        return this;
    }

    get dirty() {
        return this.actions.length > 0;
    }

    public flush(): Promise<this> {
        let me: Promise<any> = Promise.resolve(this);
        for (const a of this.actions) {
            me = me.then(p => {
                return a(p).then(_ => p);
            });
        }
        this.actions = [];
        return me as Promise<this>;
    }

}
