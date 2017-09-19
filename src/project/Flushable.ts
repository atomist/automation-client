/**
 * Action that can be recorded for later execution against a Flushable
 * in its flush() function.
 */
export type ScriptAction<T, R> = (t: T) => Promise<R>;

/**
 * Interface implemented by objects that can accumulate changes
 * that require flushing.
 */
export interface Flushable {

    /**
     * Are there pending changes that need to be flushed?
     */
    dirty: boolean;

    /**
     * Flush any pending changes.
     */
    flush(): Promise<this>;

}

/**
 * Interface to be implemented by Flushable objects that can accumulate a change script
 * and play it synchronously.
 */
export interface ScriptedFlushable<T> extends Flushable {

    /**
     * Record an arbitrary action against the backing object.
     * @param {(p: ProjectAsync) => Promise<any>} action
     */
    recordAction(action: ScriptAction<T, any>): this;
}

/**
 * Return type of operations on ScriptedFlushable.
 * Provide a choice of running the operation now on the ScriptedFlushable implementation,
 * or deferring it to run in that object's flush() function.
 * The latter choice is only useful if the operation's result isn't required by the calling logic.
 */
export interface RunOrDefer<T> {

    /**
     * Run the operation now and return a promise
     * @returns {Promise<T>}
     */
    run(): Promise<T>;

    /**
     * Schedule this operation to run later, when flush() is called on the ScriptedFlushable
     */
    defer(): void;
}

/**
 * Convert a ScriptAction function into a RunOrDefer instance
 * @param {T} t
 * @param {ScriptAction<T extends ScriptedFlushable<T>, R>} funrun
 * @returns {RunOrDefer<R>}
 */
export function runOrDefer<T extends ScriptedFlushable<T>, R>(t: T, funrun: ScriptAction<T, R>): RunOrDefer<R> {
    return {
        defer() {
            t.recordAction(funrun);
        },
        run() {
            return funrun(t);
        },
    };
}
