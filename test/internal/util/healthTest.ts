import * as stringify from "json-stringify-safe";
import "mocha";
import * as assert from "power-assert";
import { health, HealthStatus, Indicators, registerHealthIndicator } from "../../../src/internal/util/health";

describe("health", () => {

    beforeEach(() => {
        while (Indicators.length > 0) {
            Indicators.pop();
        }
    });

    it("check no health indicator", () => {
        const h = health();
        assert(h.status === HealthStatus.Up);
    });

    it("check single failing health indicator", () => {
        registerHealthIndicator(() => ({ status: HealthStatus.Down, detail: "down" }));
        const h = health();
        assert(h.status === HealthStatus.Down);
        assert(h.detail === "down");
    });

    it("check single up health indicator", () => {
        registerHealthIndicator(() => ({ status: HealthStatus.Up, detail: "up" }));
        const h = health();
        assert(h.status === HealthStatus.Up);
        assert(h.detail === "up");
    });

    it("check single 2 up health indicators", () => {
        registerHealthIndicator(() => ({ status: HealthStatus.Up, detail: "up" }));
        registerHealthIndicator(() => ({ status: HealthStatus.Up, detail: "up" }));
        const h = health();
        assert(h.status === HealthStatus.Up);
        assert(h.detail.length === 2);
    });

    it("check single 2 down health indicators", () => {
        registerHealthIndicator(() => ({ status: HealthStatus.Down, detail: "down" }));
        registerHealthIndicator(() => ({ status: HealthStatus.Down, detail: "down" }));
        const h = health();
        assert(h.status === HealthStatus.Down);
        assert(h.detail.length === 2);
    });

    it("check single multiple health indicators", () => {
        registerHealthIndicator(() => ({ status: HealthStatus.Up, detail: "up" }));
        registerHealthIndicator(() => ({ status: HealthStatus.OutOfService, detail: "out" }));
        registerHealthIndicator(() => ({ status: HealthStatus.Up, detail: "up" }));
        registerHealthIndicator(() => ({ status: HealthStatus.Down, detail: "down" }));
        registerHealthIndicator(() => ({ status: HealthStatus.Up, detail: "up" }));
        const h = health();
        assert(h.status === HealthStatus.Down);
        assert(h.detail.length === 5);
    });

    it("check single multiple health indicators with out of service", () => {
        registerHealthIndicator(() => ({ status: HealthStatus.Up, detail: "up" }));
        registerHealthIndicator(() => ({ status: HealthStatus.OutOfService, detail: "out" }));
        registerHealthIndicator(() => ({ status: HealthStatus.Up, detail: "up" }));
        registerHealthIndicator(() => ({ status: HealthStatus.OutOfService, detail: "out" }));
        registerHealthIndicator(() => ({ status: HealthStatus.Up, detail: "up" }));
        const h = health();
        assert(h.status === HealthStatus.OutOfService);
        assert(h.detail.length === 5);
    });

    it("check serialization", () => {
        registerHealthIndicator(() => ({ status: HealthStatus.Up, detail: "up" }));
        registerHealthIndicator(() => ({ status: HealthStatus.OutOfService, detail: "out" }));
        registerHealthIndicator(() => ({ status: HealthStatus.Up, detail: "up" }));
        registerHealthIndicator(() => ({ status: HealthStatus.OutOfService, detail: "out" }));
        registerHealthIndicator(() => ({ status: HealthStatus.Up, detail: "up" }));
        const h = health();
        /* tslint:disable */
        const ep = `{"status":"OUT_OF_SERVICE","detail":[{"status":"UP","detail":"up"},{"status":"OUT_OF_SERVICE","detail":"out"},{"status":"UP","detail":"up"},{"status":"OUT_OF_SERVICE","detail":"out"},{"status":"UP","detail":"up"}]}`;
        /* tslint:enable */
        assert(stringify(h) === ep);
    });
});
