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

const shell = require('shelljs');
const path = require('path');
const fs = require('fs');
const { Tail } = require('tail');

const getXcodeVersion = () => {
    const { output } = shell.exec('xcodebuild -version', { silent: true });

    try {
        // parse output for Xcode version
        const parsedOutput =  /Xcode (.*)/.exec(output);

        return parseInt(parsedOutput[1]);
    } catch (e) {
        console.log('Unable to parse xcodebuild version.');
        return false;
    }
};

const isDeviceIdBooted = (deviceid) => {
    const { code, output } = shell.exec('xcrun simctl list -j', { silent: true });
    
    if (code !== 0) throw new Error('Unable to fetch list of devices.');

    let deviceList = null;
    try {
        deviceList = JSON.parse(output);
    } catch (e) {
        throw new Error('Failed to parse device list.');
    }

    if (!deviceList) throw new Error('No device list found.');

    const device = Object.keys(deviceList.devices)
        .reduce((acc, key) => acc.concat(deviceList.devices[key]), [])
        .find(el => el.udid === deviceid);

    return device.state === 'Booted';
}

/**
 * Xcode 9 or greater
 */
const startXcode9Plus = deviceid => {
    let isDeviceBooted = false;
    try {
        isDeviceBooted = isDeviceIdBooted(deviceid);
    } catch (error) {
        console.log(error.message);
        return;
    }

    // Do not run device if already running
    if (isDeviceBooted) {
        console.log('Simulator is already running.');
        return;
    }

    // Boot Device
    shell.exec(
        `xcrun simctl boot "${deviceid}"`,
        { silent: true }
    );

    // Launch Simulator App
    return shell.exec(
        'open `xcode-select -p`/Applications/Simulator.app',
        { silent: true }
    );
};

// Xcode 8 or older
const startXcode8Less = deviceid => shell.exec(`xcrun instruments -w "${deviceid}"`, { silent: true });

const extensions = {
    start: deviceid => {
        const xcodeVersion = getXcodeVersion();

        if (!xcodeVersion) return;

        return xcodeVersion >= 9 ? startXcode9Plus(deviceid) : startXcode8Less(deviceid);
    },

    log: (deviceid, filepath) => {
        const tail = new Tail(
            path.join(process.env.HOME, 'Library/Logs/CoreSimulator', deviceid, 'system.log')
        );

        tail.on('line', function (data) {
            if (filepath) {
                fs.appendFile(filepath, data + '\n', function (error) {
                    if (error) {
                        console.error('ERROR: ', error);
                        throw error;
                    }
                });
            } else {
                console.log(data);
            }
        });

        tail.on('error', function (error) {
            console.error('ERROR: ', error);
        });

        return tail;
    }
};

exports = module.exports = extensions;
