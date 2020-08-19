/**********************************************************************************
 * (c) 2016-2019, Master Technology
 * Licensed under the MIT license or contact me for a Support or Commercial License
 *
 * I do contract work in most languages, so let me solve your problems!
 *
 * Any questions please feel free to email me or put a issue up on the github repo
 * Version 2.0.1                                      Nathan@master-technology.com
 *********************************************************************************/
"use strict";

/* jshint camelcase: false */
/* global UIDevice, UIDeviceOrientation, UIView, getElementsByTagName, android */

var application = require('@nativescript/core/application');
var view = require('@nativescript/core/ui/core/view');
var viewBase = require('@nativescript/core/ui/core/view-base');
var enums = require('@nativescript/core/ui/enums');
var frame = require('@nativescript/core/ui/frame');
var Page = require('@nativescript/core/ui/page').Page;

// Load the helper plugins
require('nativescript-globalevents');
require('nativescript-dom');

var allowRotation = true, forceRotation = false, fullScreen = false, abHidden=false;
var orientation = { };
var orientationAppliers = [];

module.exports = orientation;

/**
 * Function to add a new orientation applier callback
 */
orientation.addOrientationApplier = function(newOrientationApplier) {
    if (!newOrientationApplier) return;

    var existingApplier = orientationAppliers.find(function(oa) { return oa === newOrientationApplier; });
    if (existingApplier) return;

    orientationAppliers.push(newOrientationApplier);
};

/**
 * Function to remove an orientation applier callback
 */
orientation.removeOrientationApplier = function(orientationApplier) {
    if (!orientationApplier) return;

    orientationAppliers = orientationAppliers.filter(function (oa) { return oa !== orientationApplier; });
};

/**
 * Helper function hooked to the Application to get the current orientation
 */
if (global.android) {
	orientation.getOrientation = function () {
        var context = getContext();

        // These both lie on Tablets, The orientation is opposite, so it is safer to use .orientation value
        // context.getSystemService("window").getDefaultDisplay().getOrientation();
        // context.getSystemService("window").getDefaultDisplay().getRotation();

        var currentOrientation = getContext().getResources().getConfiguration().orientation;

        switch (currentOrientation) {
            case 2: /* LANDSCAPE */
                return enums.DeviceOrientation.landscape;
            case 1: /* PORTRAIT */
                return enums.DeviceOrientation.portrait;
            default:
                break;
        }


        // If for some reason the orientation code above doesn't figure it out; we use sizes
        var metrics = new android.util.DisplayMetrics();
        context.getSystemService(android.content.Context.WINDOW_SERVICE).getDefaultDisplay().getRealMetrics(metrics);
        if (metrics.widthPixels > metrics.heightPixels) {
            return enums.DeviceOrientation.landscape;
        }
        return enums.DeviceOrientation.portrait;

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
        activity.setRequestedOrientation(14); // SCREEN_ORIENTATION_LOCKED = 14
	};

	orientation.setOrientation = function(value, animation) {
		if (!application.android || !application.android.foregroundActivity) {
			setTimeout(function() { orientation.setOrientation(value, animation); }, 100);
			return;
		}

		var activity = application.android.foregroundActivity;

		var val = value.toLowerCase();
		var newOrientation;
		switch (val) {
			case 'landscape':
				newOrientation = 6; // SCREEN_ORIENTATION_SENSOR_LANDSCAPE = 6
                break;

			case 'landscaperight':
				newOrientation = 0; // SCREEN_ORIENTATION_LANDSCAPE = 0
				break;

			case 'landscapeleft':
				newOrientation = 8; // SCREEN_ORIENTATION_REVERSE_LANDSCAPE = 9
				break;

			case 'portrait':
			default:
				newOrientation = 1; // SCREEN_ORIENTATION_PORTRAIT = 1
				break;
		}
		activity.setRequestedOrientation(newOrientation);

		// Animation: https://developer.android.com/reference/android/view/WindowManager.LayoutParams.html#ROTATION_ANIMATION_JUMPCUT
		// and https://developer.android.com/reference/android/view/WindowManager.LayoutParams.html#rotationAnimation

	};

	orientation.setFullScreen = function(value) {

            var View = android.view.View;
            var WindowManager = android.view.WindowManager;
            var window = application.android.startActivity.getWindow();

            fullScreen = !!value;

            if (fullScreen) {
                window.setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,WindowManager.LayoutParams.FLAG_FULLSCREEN);
                window.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY );
            } else {
                    window.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
                    window.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
            }
/*
            if (fullScreen) {
                if (!frame.topmost().currentPage.actionBarHidden && !abHidden) {
                    abHidden = true;
                    frame.topmost().currentPage.actionBarHidden = true;
                }
            } else if (abHidden) {
                abHidden = false;
                frame.topmost().currentPage.actionBarHidden = false;
            }
*/
    };

} else if (global.NSObject && global.UIDevice) {

	setupiOSController();
	orientation.getOrientation = function () {
		var device = UIDevice.currentDevice;

		switch (device.orientation) {
			case UIDeviceOrientation.UIDeviceOrientationLandscapeRight:
			case UIDeviceOrientation.UIDeviceOrientationLandscapeLeft:
				return enums.DeviceOrientation.landscape;
			case UIDeviceOrientation.UIDeviceOrientationPortraitUpsideDown:
			case UIDeviceOrientation.UIDeviceOrientationPortrait:
				return enums.DeviceOrientation.portrait;
			default:
				// Since we have a up/Down orientation, we need to see what the statusbar is set to to get the actual current device orientation
				var appOrientation = UIApplication.sharedApplication.statusBarOrientation;
				if (appOrientation === 1 || appOrientation === 2) { return enums.DeviceOrientation.portrait; }
				else { return enums.DeviceOrientation.landscape; }
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
		var device = UIDevice.currentDevice;
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

	orientation.setFullScreen = function(setFullScreen) {
	    fullScreen = !!setFullScreen;
	    var app = iosProperty(UIApplication, UIApplication.sharedApplication);
	    app.setStatusBarHiddenWithAnimation(fullScreen, UIStatusBarAnimation.Slide);
    };

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
	} while (proto !== null && !proto.hasOwnProperty(name) );
	return proto;
}

/**
 * Sets up the iOS Controller configuration
 */
function setupiOSController() {
	var curFrame = frame.topmost();
	if (!curFrame) {
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
 * CSS changes will probably impact them
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
	var currentOrientation = orientation.getOrientation();

	// If somehow we didn't get the orientation we don't do anything!
	if (!currentOrientation) return;

	// Check what the current rotation vs the existing page rotation is
	var isLandscape = currentOrientation === enums.DeviceOrientation.landscape;
	if (!args || !args.force) {
		var containsLandScape = page.classList.contains("landscape");

		// No need to run the swap if it already has the correct orientation
		if (isLandscape === containsLandScape) { return; }
	}

	// Change Orientation
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
	} else if (page.classList.contains('windows')) {
		page.classList.toggle('windows.landscape', isLandscape);
	}
	// --- End NS Bug Patch ---

    // _refreshCSS will verify against the Scope to make sure all the correct styles are
    // applied. If they are already applied, it will short circuit and not
    // do anything more.
    if (typeof page._refreshCss === 'function') {
	    // TNS 3.2-
        page._refreshCss();
    } else {
	    // TNS 3.3+
	    page._onCssStateChange();
    }

	if (args != null) {
		if (view.eachDescendant) {
			view.eachDescendant(page, resetChildrenRefreshes);
		} else {
			// TNS 6.8+ rc
			viewBase.eachDescendant(page, resetChildrenRefreshes);
		}
	}
	if (page.exports && typeof page.exports.orientation === "function") {
		page.exports.orientation({landscape: isLandscape, object: page});
	}

	callOrientationAppliers(page, isLandscape);
};

/**
 * This handles an Orientation change event
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
	if (targetPage){
		applyOrientationToPage(targetPage, {force: true});
	}
};

function callOrientationAppliers(page, isLandscape) {
    if (!orientationAppliers || orientationAppliers.length <= 0) { return; }

    for (var i=0;i<orientationAppliers.length;i++) {
    	orientationAppliers[i]({landscape: isLandscape, object: page});
	}
}

function getContext() {
	var ctx = java.lang.Class.forName("android.app.AppGlobals").getMethod("getInitialApplication", null).invoke(null, null);
	if (ctx) { return ctx; }

	return java.lang.Class.forName("android.app.ActivityThread").getMethod("currentApplication", null).invoke(null, null);
}

function iosProperty(theClass, theProperty) {
    if (typeof theProperty === "function") {
        // xCode 7 and below
        return theProperty.call(theClass);
    } else {
        // xCode 8+
        return theProperty;
    }
}

// Setup Events
Page.on(Page.navigatingToEvent, handleNavigatingTo);
application.on(application.orientationChangedEvent, handleOrientationChange);

