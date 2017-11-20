export class Deferred<T> {
    public promise: Promise<T>;

    private fate: "resolved" | "unresolved";
    private state: "pending" | "fulfilled" | "rejected";

    // tslint:disable-next-line:ban-types
    private deferredResolve: Function;
    // tslint:disable-next-line:ban-types
    private deferredReject: Function;

    constructor() {
        this.state = "pending";
        this.fate = "unresolved";
        this.promise = new Promise((resolve, reject) => {
            this.deferredResolve = resolve;
            this.deferredReject = reject;
        });
        this.promise.then(
            () => this.state = "fulfilled",
            () => this.state = "rejected",
        );
    }

    public resolve(value?: any) {
        if (this.fate === "resolved") {
            throw new Error("Deferred cannot be resolved twice");
        }
        this.fate = "resolved";
        this.deferredResolve(value);
    }

    public reject(reason?: any) {
        if (this.fate === "resolved") {
            throw new Error("Deferred cannot be resolved twice");
        }
        this.fate = "resolved";
        this.deferredReject(reason);
    }

    public isResolved() {
        return this.fate === "resolved";
    }

    public isPending() {
        return this.state === "pending";
    }

    public isFulfilled() {
        return this.state === "fulfilled";
    }

    public isRejected() {
        return this.state === "rejected";
    }
}
