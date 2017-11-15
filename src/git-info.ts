#!/usr/bin/env node
import * as child_process from "child_process";
import * as process from "process";
console.warn("git-info is deprecated, use 'atomist git' instead");
process.argv.unshift("git");
child_process.execFileSync("atomist", process.argv, { env: process.env, stdio: "inherit" });
