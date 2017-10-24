import * as _metrics from "metrics";
import * as os from "os";

const report = new _metrics.Report();

export function increment(name: string) {
    const counter = report.getMetric(name) as _metrics.Counter || new _metrics.Counter();
    counter.inc();
    report.addMetric(name, counter);
}

// tslint:disable-next-line:no-shadowed-variable
export function duration(name: string, duration: number) {
    const timer = report.getMetric(name) as _metrics.Timer || new _metrics.Timer();
    timer.update(duration);
    report.addMetric(name, timer);
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
