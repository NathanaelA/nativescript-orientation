/**********************************************************************************
 * (c) 2016-2017, Master Technology
 * Licensed under the MIT license or contact me for a Support or Commercial License
 *
 * I do contract work in most languages, so let me solve your problems!
 *
 * Any questions please feel free to email me or put a issue up on the github repo
 * Version 1.5.5                                      Nathan@master-technology.com
 *********************************************************************************/
"use strict";

/* jshint camelcase: false */
/* global UIDevice, UIDeviceOrientation, UIView, getElementsByTagName, android */

var application = require('application');
var view = require('ui/core/view');
var enums = require('ui/enums');
var frame = require('ui/frame');
var Page = require('ui/page').Page;
var utils = require('utils/utils');

var types = require('utils/types');

// Load the helper plugins
require('nativescript-globalevents');
require('nativescript-dom');

var allowRotation = true, forceRotation = false;
var orientation = { };

module.exports = orientation;

/**
 * Helper function hooked to the Application to get the current orientation
 */
if (global.android) {
    orientation.getOrientation = function () {
        switch (application.android.context.getResources().getConfiguration().orientation) {
            case android.content.res.Configuration.ORIENTATION_LANDSCAPE:
                return enums.DeviceOrientation.landscape;
            case android.content.res.Configuration.ORIENTATION_PORTRAIT:
                return enums.DeviceOrientation.portrait;
            default:
                return false;
        }
    };

    orientation.enableRotation = function() {
        if (!application.android || !application.android.foregroundActivity) {
            setTimeout(orientation.enableRotation, 100);
            return;
        }

        var activity = application.android.foregroundActivity;
        activity.setRequestedOrientation(13);  // SCREEN_ORIENTATION_FULL_USER = 13
    };

    orientation.disableRotation = function() {
        if (!application.android || !application.android.foregroundActivity) {
            setTimeout(orientation.disableRotation, 100);
            return;
        }

        var activity = application.android.foregroundActivity;
        var rotation = activity.getSystemService("window").getDefaultDisplay().getRotation();
        var tempOrientation = activity.getResources().getConfiguration().orientation;
        var currentOrientation = 0;
        switch(tempOrientation)
        {
            case /* Configuration.ORIENTATION_LANDSCAPE */ 2:
                if(rotation === 0 /* Surface.ROTATION_0 */ || rotation === 1 /* Surface.ROTATION_90 */ )
                    currentOrientation = 0; /* ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE; */
                else
                    currentOrientation = 8; /* ActivityInfo.SCREEN_ORIENTATION_REVERSE_LANDSCAPE; */
                break;
            case /* Configuration.ORIENTATION_PORTRAIT */ 1:
                if(rotation === 0 /* Surface.ROTATION_0 */ || rotation === 3 /* Surface.ROTATION_270 */)
                    currentOrientation = 1; /* ActivityInfo.SCREEN_ORIENTATION_PORTRAIT; */
                else
                    currentOrientation = 9; /* ActivityInfo.SCREEN_ORIENTATION_REVERSE_PORTRAIT; */
        }
        activity.setRequestedOrientation(currentOrientation);
    };

    orientation.setOrientation = function(value, animation) {
        if (!application.android || !application.android.foregroundActivity) {
            setTimeout(function() { orientation.setOrientation(value, animation); }, 100);
            return;
        }

        var activity = application.android.foregroundActivity;

        var val = value.toLowerCase();
        var orientation;
        switch (val) {
            case 'landscape':
            case 'landscaperight':
                orientation = 0;
                break;
            case 'landscapeleft':
                orientation = 8;
                break;

            case 'portrait':
            default:
                orientation = 1;
                break;
        }
        activity.setRequestedOrientation(orientation);

        // Animation: https://developer.android.com/reference/android/view/WindowManager.LayoutParams.html#ROTATION_ANIMATION_JUMPCUT
        // and https://developer.android.com/reference/android/view/WindowManager.LayoutParams.html#rotationAnimation

    };

} else if (global.NSObject && global.UIDevice) {

    setupiOSController();
    orientation.getOrientation = function () {
        var device = utils.ios.getter(UIDevice, UIDevice.currentDevice);

        switch (device.orientation) {
            case UIDeviceOrientation.UIDeviceOrientationLandscapeRight:
            case UIDeviceOrientation.UIDeviceOrientationLandscapeLeft:
                return enums.DeviceOrientation.landscape;
            case UIDeviceOrientation.UIDeviceOrientationPortraitUpsideDown:
            case UIDeviceOrientation.UIDeviceOrientationPortrait:
                return enums.DeviceOrientation.portrait;
            default:
                return false;
        }
    };

    orientation.setOrientation = function(value, animation) {
        var newOrientation, val = value.toLowerCase();
        if (val === 'landscape' || val === 'landscaperight') {
            newOrientation = NSNumber.numberWithInt(UIInterfaceOrientationLandscapeRight);
        } else if (val === 'landscapeleft') {
            newOrientation = NSNumber.numberWithInt(UIInterfaceOrientationLandscapeLeft);
        } else {
            newOrientation = NSNumber.numberWithInt(UIInterfaceOrientationPortrait);
        }
        var device = utils.ios.getter(UIDevice, UIDevice.currentDevice);
        if (animation === false) {
            UIView.setAnimationsEnabled(false);
        }
        allowRotation = false; // disable rotations...

        forceRotation = true;
        var currentOrientation = device.orientation;
        // We have to swap to a different orientation FIRST, if the current orientation matches
        if (newOrientation === currentOrientation) {
            var tempOrientation = newOrientation-1;
            if (tempOrientation < 1) { tempOrientation += 2; }
            device.setValueForKey(tempOrientation, "orientation");
        }
        device.setValueForKey(newOrientation, "orientation");
        forceRotation = false;


        if (animation === false) {
            UIView.setAnimationsEnabled(true);
        }
    };

    orientation.enableRotation = function() { allowRotation = true; };

    orientation.disableRotation = function() { allowRotation = false; };

    var resetLandscapedLock = false;
    application.on('suspend', function() {
        if (allowRotation === false && orientation.getOrientation() === 'landscape') {
            allowRotation = true;
            resetLandscapedLock = true;
        }
    });

    application.on('resume', function() {
        if (resetLandscapedLock) {
            resetLandscapedLock = false;
            orientation.setOrientation('landscape',false);
        }
    });


}

// Depreciated; but supported for backwards compatibility
application.getOrientation = orientation.getOrientation;


/**
 * Searchs for a prototype in the prototype chain
 * @param source - Source element
 * @param name - the name of the element
 * @returns {*}
 */
function findRootPrototype(source, name) {
    var proto = source;
    do {
        proto = Object.getPrototypeOf(proto);
        //console.log("Searching...");
    } while (proto !== null && !proto.hasOwnProperty(name) );
    return proto;
}

/**
 * Sets up the iOS Controller configuration
 */
function setupiOSController() {
    var curFrame = frame.topmost();
    if (!curFrame) {
        //console.log("Not found", typeof frame);
        setTimeout(setupiOSController, 100);
        return;
    }

    try {

        var app = curFrame.ios.controller;
        var proto = findRootPrototype(app, "shouldAutorotate");
        if (proto ===  null) {
            console.log("Unable to find rotations system, disabling orientation system.");
            return;
        }
        Object.defineProperty(proto, "shouldAutorotate", {
            get: function() {
                //console.log("Should rotate", forceRotation, allowRotation);
                return forceRotation || allowRotation;
            }, enumerable: true, configurable: true
        });
    } catch (err) {
        console.log("Unable to setup Rotation",err);
    }
}

/**
 * Helper function to look for children that have refresh (i.e. like ListView's) and call their refresh since the
 * CSS changes will probsably impact them
 * @param child
 * @returns {boolean}
 */
function resetChildrenRefreshes(child) {
    if (typeof child.refresh === 'function') {
        child.refresh();
    }
    return true;
}

/**
 * Function that does the majority of the work
 * @param page
 * @param args
 */
var applyOrientationToPage = function(page, args){
    var currentOrientation = application.getOrientation();
    if (currentOrientation) {
    var isLandscape = currentOrientation === enums.DeviceOrientation.landscape;

    page.classList.toggle('landscape', isLandscape);

    // Unfortunately there is a bug in the NS CSS parser, so we have to work around it
    var i;
    if (page.classList.contains('android')) {
        for (i=0;i<page.classList.length;i++) {
            if (page.classList[i].indexOf('android') === 0) {
                if (page.classList[i].indexOf('.') >= 0) { continue; }
                page.classList.toggle(page.classList[i]+".landscape", isLandscape);
            }
        }
    } else if (page.classList.contains('ios')) {
        for (i=0;i<page.classList.length;i++) {
            if (page.classList[i].indexOf('ios') === 0) {
                if (page.classList[i].indexOf('.') >= 0) { continue; }
                page.classList.toggle(page.classList[i]+".landscape", isLandscape);
            }
        }
        //currentPage.classList.toggle('ios.landscape', isLandscape);
    } else if (page.classList.contains('windows')) {
        page.classList.toggle('windows.landscape', isLandscape);
    }
    // --- End NS Bug Patch ---



    page._refreshCss();
    page.style._resetCssValues();
    page._applyStyleFromScope();
    if (args != null) {
        view.eachDescendant(page, resetChildrenRefreshes);
    }
    if (page.exports && typeof page.exports.orientation === "function") {
        page.exports.orientation({landscape: isLandscape, page: page, object: page});
    }
    }
};

/**
 * Function that does the majority of the work
 * @param args
 */
var handleOrientationChange = function(args) {

    // If the topmost frame doesn't exist we can't do anything...
    if (!frame.topmost()) { return; }
    var currentPage = frame.topmost().currentPage;

    if (currentPage) {
        applyOrientationToPage(currentPage, args);
    }
};

var handleNavigatingTo = function(args){
    var targetPage = args.object;

    if(targetPage){
        applyOrientationToPage(targetPage);
    }

};

// Setup Events
Page.on(Page.navigatingToEvent, handleNavigatingTo);
application.on(application.orientationChangedEvent, handleOrientationChange);

