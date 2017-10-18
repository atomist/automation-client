#!/bin/bash
# download and setup Atomist automation client
# Copyright © 2017  Atomist
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

set -o pipefail

declare Pkg=atomist-setup
declare Version=0.1.0

# write message to standard out (stdout)
# usage: msg MESSAGE
function msg() {
    echo "$Pkg: $*"
}

# write message to standard error (stderr)
# usage: err MESSAGE
function err() {
    msg "$*" 1>&2
}

# usage: main "$@"
function main () {
    local arg team slug
    for arg in "$@"; do
        case "$arg" in
            T*)
                team=$arg
                ;;
            */*)
                slug=$arg
                ;;
            *)
                err "unrecognized argument: $arg"
                return 1
                ;;
        esac
    done

    if [[ ! $slug ]]; then
        slug=atomist-blogs/sof-command
    fi
    local origin=https://github.com/$slug.git

    msg "setting up Atomist API client $slug"
    msg "this script will clone $slug, install its dependencies,"
    msg "build it, create an Atomist config for you, and then start the client."
    msg ""
    msg "type Ctrl-C in the next five seconds to abort"
    sleep 5
    msg "continuing..."

    if ! git clone "$origin" "$slug"; then
        err "failed to clone repository $slug from $origin"
        return 1
    fi

    if ! cd "$slug"; then
        err "failed to change to $slug"
        return 1
    fi

    if ! npm install; then
        err "failed to run 'npm install'"
        return 1
    fi

    if ! npm run compile; then
        err "failed to compile TypeScript"
        return 1
    fi

    if ! $(npm bin)/atomist-config $team; then
        err "failed to configure Atomist, our sincerest apologies"
        return 1
    fi

    if ! npm start; then
        err "failed to start Atomist client"
        return 1
    fi
    msg "switch to your browser and visit http://localhost:2866/"
}

main "$@" || exit 1
exit 0
