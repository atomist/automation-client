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

    msg ""
    msg "Setting up Atomist API client $slug:"
    msg "This script will clone $slug, install its dependencies,"
    msg "build it, create an Atomist config for you, and then start the client."
    msg ""
    while :; do
        local answer
        read -p "$Pkg: Continue? [Y/n]: " answer
        if [[ ! $asnwer || $answer == [Yy]* ]]; then
            break
        elif [[ $answer == [Nn]* ]]; then
            msg "exiting per your request"
            msg "please try Atomist again soon!"
            return 0
        else
            err "invalid response: '$answer', please try again"
        fi
    done

    local config=$HOME/.atomist/client.config.json
    if [[ $team && -f $config ]]; then
        if ! grep -q "\"$team\"" "$config" > /dev/null 2>&1; then
            err "You have an existing Atomist client config, '$config',"
            err "but it does not contain the same team you supplied on"
            err "the command line: $team."
            err "Please use the same team or manually edit the config,"
            err "adding/changing the team list as appropriate."
            return 1
        fi
    fi

    if [[ -e $slug ]]; then
        local x=0 bad_slug=$slug-$$
        while [[ -e $bad_slug ]]; do
            bad_slug=$bad_slug-$((x++))
        done
        msg "moving old attempt on $slug to $bad_slug"
        if ! mv "$slug" "$bad_slug"; then
            err "failed to move files from old attempt, $slug, out of the way"
            err "please manually move or remove '$slug' and try again"
            return 1
        fi
    fi

    local log=$Pkg-$$.log
    msg "cloning $slug..."
    if ! git clone "$origin" "$slug" >> "$log" 2>&1; then
        err "failed to clone repository $slug from $origin, see $log for details"
        return 1
    fi

    if ! cd "$slug"; then
        err "failed to change to $slug"
        return 1
    fi

    msg "installing dependencies..."
    if ! npm install >> "$log" 2>&1; then
        err "failed to run 'npm install', see $log for details"
        return 1
    fi

    msg "building client..."
    if ! npm run compile >> "$log" 2>&1; then
        err "failed to compile TypeScript, see $log for details"
        return 1
    fi

    msg "configuring Atomist..."
    if ! $(npm bin)/atomist-config $team; then
        err "failed to configure Atomist, our sincerest apologies"
        return 1
    fi

    msg "starting client, type Ctrl-C to exit..."
    exec npm run autostart
}

main "$@" || exit 1
exit 0
