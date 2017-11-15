#!/usr/bin/env node
import * as child_process from "child_process";
import * as process from "process";
console.warn("atomist-cli is deprecated, use 'atomist' instead");
child_process.execFileSync("atomist", process.argv, { env: process.env, stdio: "inherit" });
