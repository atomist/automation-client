/**
 * Enum value expressing the state of a health check.
 */
export enum HealthStatus { Up = "UP", Down = "DOWN", OutOfService = "OUT_OF_SERVICE" }

export interface Health<P> {
    status: HealthStatus;
    detail: P;
}

/**
 * A HealthIndicator is a function that determines the Health of a sub-system or service this client
 * consumes.
 */
export type HealthIndicator = () => Health<any>;

/**
 * Register a HealthIndicator at startup.
 * @param {HealthIndicator} indicator
 */
export function registerHealthIndicator(indicator: HealthIndicator) {
    Indicators.push(indicator);
}

/**
 * Returns the combined health of the client.
 * @returns {Health<any>}
 */
export function health(): Health<any> {
    return CompositeHealthIndicator(Indicators);
}

// public for testing only
export const Indicators: HealthIndicator[] = [];

const CompositeHealthIndicator = (indicators: HealthIndicator[]) => {

    if (indicators.length === 1) {
        return indicators[0]();
    } else if (indicators.length === 0) {
        return {
            status: HealthStatus.Up,
            detail: "Service is up",
        };
    }

    const status: HealthStatus = indicators.map(h => h().status).reduce((p, c) => {
        if (p === HealthStatus.Down) {
            return p;
        }

        if (p === HealthStatus.OutOfService && c === HealthStatus.Down) {
            return c;
        }

        if (p === HealthStatus.Up) {
            return c;
        }

        return p;
    }, HealthStatus.Up);

    return {
        status,
        detail: indicators.map(i => i()),
    };
};
