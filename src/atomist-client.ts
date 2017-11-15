#!/usr/bin/env node
import * as child_process from "child_process";
import * as process from "process";
console.warn("atomist-client is deprecated, use 'atomist start' instead");
process.argv.unshift("start");
child_process.execFileSync("atomist", process.argv, { env: process.env, stdio: "inherit" });
