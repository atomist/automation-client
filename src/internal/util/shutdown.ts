import * as exitHook from "async-exit-hook";

const shutdownHooks: Array<() => Promise<number>> = [];

export function registerShutdownHook(cb: () => Promise<number>) {
      shutdownHooks.push(cb);
}

exitHook(callback => {
    setTimeout(() => {
        console.log("Shutdown initiated");
        shutdownHooks.reduce((p, c, i, result) => p.then(c), Promise.resolve(0))
            .then(result => {
                callback();
                process.exit(result);
            })
            .catch(() => {
                callback();
                process.exit(1);
            });
    }, 2000);
});