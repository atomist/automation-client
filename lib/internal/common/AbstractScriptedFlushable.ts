import {
    ScriptAction,
    ScriptedFlushable,
} from "./Flushable";

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
        // Save actions, as they may be built up again
        const actionsToExecute = this.actions;
        this.actions = [];

        let me: Promise<any> = Promise.resolve(this);
        for (const a of actionsToExecute) {
            me = me.then(p => {
                return a(p).then(_ => p);
            });
        }

        // If there were more actions built up while we went
        return (this.actions.length > 0) ?
            me.then(r => r.flush()) :
            me as Promise<this>;
    }

}
