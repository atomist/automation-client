/*
 * Copyright © 2019 Atomist, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Run a function periodically until it returns true or until the
 * timeout expires.  Its polling period is 1/10th the timeout.  If the
 * timeout expires before the function returns true, the Promise will
 * be rejected.  The function will be tried immediately and when the
 * total duration is reached.
 *
 * @param fn Function to call periodically
 * @param duration Total length of time to poll in millisends
 * @return Resolved Promise if function returns true within the timeout period, rejected Promise if not
 */
export async function poll(fn: () => boolean, duration: number = 1000): Promise<void> {
    if (fn()) {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const period = duration / 10;
        let interval: NodeJS.Timeout;
        let timeout = setTimeout(() => {
            if (interval) {
                clearInterval(interval);
                interval = undefined;
            }
            if (fn()) {
                return resolve();
            } else {
                reject(new Error("Function did not return true in allotted time"));
            }
        }, duration);
        interval = setInterval(() => {
            if (fn()) {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = undefined;
                }
                if (interval) {
                    clearInterval(interval);
                    interval = undefined;
                }
                resolve();
            }
        }, period);
    });
}

/**
 * Async sleep function.
 *
 * @param ms Sleep time in milliseconds.
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
