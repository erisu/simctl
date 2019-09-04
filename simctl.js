/*
The MIT License (MIT)

Copyright (c) 2014 Shazron Abdullah.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

const path = require('path');
const { readFileSync } = require('fs');
const shell = require('shelljs');
const SimCtlExtensions = require('./lib/simctl-extensions');

const exec = function (action, args, flags, shellOpts) {
    args = args || [];
    args = args.map(i => `"${i}"`);
    flags = flags || [];
    shellOpts = shellOpts || {};

    const command = [ 'xcrun', 'simctl', action ]
        .concat(args, flags)
        .join(' ');

    return shell.exec(command, shellOpts);
}

exports = module.exports = {
    set noxpc (b) {
        this._noxpc = b;
    },

    get noxpc () {
        return this._noxpc;
    },

    extensions: SimCtlExtensions,

    check_prerequisites: function () {
        const obj = exec('help', [], [], { silent: true });

        if (obj.code !== 0) obj.output = readFileSync(path.resolve(__dirname, 'lib', 'missing-simctl.txt'), {}).toString();

        return obj;
    },

    create: (name, device_type_id, runtime_id) => exec('create', [...arguments]),
    del: device => exec('delete', [...arguments]),
    erase: device => exec('erase', [...arguments]),
    boot: device => exec('boot', [...arguments]),
    shutdown: device => exec('shutdown', [...arguments]),
    rename: (device, name) => exec('rename', [...arguments]),
    getenv: (device, variable_name) => exec('getenv', [...arguments]),
    openurl: (device, url) => exec('openurl', [...arguments]),
    addphoto: (device, path) => exec('addphoto', [...arguments]),
    install: (device, path) => exec('install', [...arguments]),
    uninstall: (device, app_identifier) => exec('uninstall', [...arguments]),

    launch: (wait_for_debugger, device, app_identifier, argv) => {
        let flags = wait_for_debugger ? ['--wait-for-debugger'] : [];
        return exec('launch', [device, app_identifier].concat(argv), flags);
    },

    spawn: (wait_for_debugger, arch, device, path_to_executable, argv) => {
        let flags = [];

        if (wait_for_debugger) flags.push('--wait-for-debugger');
        if (arch) flags.push(`--arch="${arch}"`)

        return exec('spawn', [device, path_to_executable].concat(argv), flags);
    },

    list: options => {
        options = options || {};

        let sublist = '';
        if (options.devices) {
            sublist = 'devices';
        } else if (options.devicetypes) {
            sublist = 'devicetypes';
        } else if (options.runtimes) {
            sublist = 'runtimes';
        } else if (options.pairs) {
            sublist = 'pairs';
        }

        const obj = exec('list', [ sublist ], [ '--json' ], { silent: options.silent })

        if (obj.code === 0) {
            try {
                obj.json = JSON.parse(obj.output);
            } catch (err) {
                console.error(err.stack);
            }
        }

        return obj;
    },

    notify_post: (device, notification_name) => exec('notify_post', [...arguments]),
    icloud_sync: device => exec('icloud_sync', [...arguments]),
    help: subcommand => exec('help', [...arguments]),
};
