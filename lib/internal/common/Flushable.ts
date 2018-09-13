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
 * Defer the given action until the relevant ScriptableFlushable is flushable
 * @param {ScriptedFlushable<T>} flushable
 * @param {ScriptAction<T, R>} promise
 */
export function defer<T, R>(flushable: ScriptedFlushable<T>, promise: Promise<R>): void {
    flushable.recordAction(() => promise);
}
