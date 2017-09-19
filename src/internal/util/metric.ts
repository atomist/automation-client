import * as metrics from "metrics";

export const report = new metrics.Report();
// const reporter = new metrics.ConsoleReporter(report);

export function increment(name: string) {
    const counter = report.getMetric(name) as metrics.Counter || new metrics.Counter();
    counter.inc();
    report.addMetric(name, counter);
}

// tslint:disable-next-line:no-shadowed-variable
export function duration(name: string, duration: number) {
    const timer = report.getMetric(name) as metrics.Timer || new metrics.Timer();
    timer.update(duration);
    report.addMetric(name, timer);
}

// reporter.start(30000);
