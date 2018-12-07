/*
 * Copyright © 2018 Atomist, Inc.
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

import * as assert from "power-assert";
import { executeAll } from "../../lib/util/pool";

describe("pool", () => {

    describe("executeAll", () => {

        it("should preserve order", async () => {
            const results = await executeAll([() => {
                return new Promise<string>(resolve => {
                    setTimeout(() => resolve("1"), 1000);
                });
            }, () => {
                return new Promise<string>(resolve => {
                    setTimeout(() => resolve("2"), 500);
                });
            }, () => {
                return new Promise<string>(resolve => {
                    setTimeout(() => resolve("3"), 100);
                });
            }], 1);
            assert.deepStrictEqual(results, ["1", "2", "3"]);
        });

        it("should reject with results and errors", async () => {
            try {
                await executeAll([() => {
                    return new Promise<string>(resolve => {
                        setTimeout(() => resolve("1"), 1000);
                    });
                }, () => {
                    return new Promise<string>((resolve, reject) => {
                        reject(new Error("2"));
                    });
                }, () => {
                    return new Promise<string>(resolve => {
                        setTimeout(() => resolve("3"), 100);
                    });
                }], 1);
            } catch (err) {
                assert.strictEqual(err.message, "2");
            }
        });

    });

});
