import * as _metrics from "metrics";
import * as os from "os";

const report = new _metrics.Report();

export function increment(name: string) {
    const counter = getCounter(name);
    counter.inc();
    report.addMetric(name, counter);
}

// tslint:disable-next-line:no-shadowed-variable
export function duration(name: string, duration: number) {
    const timer = getTimer(name);
    timer.update(duration);
    report.addMetric(name, timer);
}

export function getCounter(name: string): _metrics.Counter {
    return report.getMetric(name) as _metrics.Counter || new _metrics.Counter();
}

export function getTimer(name: string): _metrics.Timer {
    return report.getMetric(name) as _metrics.Timer || new _metrics.Timer();
}

export function metrics() {
    const m: any = {
        ...report.summary(),
        heap: {
            used: process.memoryUsage().heapUsed,
            total: process.memoryUsage().heapTotal,
            rss: process.memoryUsage().rss,
        },
        memory: {
            free: os.freemem(),
            total: os.totalmem(),
        },
        uptime: process.uptime(),
    };
    return m;
}
