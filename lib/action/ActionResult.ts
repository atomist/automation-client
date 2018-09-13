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

/**
 * Result of running an action, optionally on a target.  Instances may
 * add further information beyond boolean success or failure.  Useful
 * when promise chaining, to allow results to be included along with
 * the target.
 */
export interface ActionResult<T = undefined> {

    /** Target on which we ran the action, if there is one. */
    readonly target: T;

    /** Whether or not the action succeeded. */
    readonly success: boolean;

    /** Error that occurred, if any */
    readonly error?: Error;

    /** Description of step that errored, if one did. */
    readonly errorStep?: string;
}

/** Test if an object is an ActionResult */
export function isActionResult(a: any): a is ActionResult {
    return a.target !== undefined && a.success !== undefined;
}

/**
 * @deprecated
 * Convenient implementation of ActionResult
 */
export class SimpleActionResult<T> implements ActionResult<T> {

    constructor(public readonly target: T, public readonly success: boolean) { }
}

/**
 * Helper to create a successful ActionResult object.
 *
 * @param t Target for action
 * @return {ActionResult<T>} with success: true
 */
export function successOn<T>(t: T): ActionResult<T> {
    return {
        success: true,
        target: t,
    };
}

/**
 * Helper to create a failed ActionResult object.
 *
 * @param t Target for action
 * @param err Error that occurred.
 * @param f Function that failed, should have a name property.
 * @return {ActionResult<T>} with success: true
 */
export function failureOn<T>(t: T, err: Error, f?: any /* function */): ActionResult<T> {
    return {
        success: false,
        target: t,
        error: err,
        errorStep: (f && f.name) ? f.name : undefined,
    };
}
