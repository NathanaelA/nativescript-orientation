var orientation = require('nativescript-orientation');


var page, lockElem;
exports.pageLoaded = function(args) {
    page = args.object;
    lockElem = page.getViewById('lock');
};

exports.portrait = function() {
    orientation.setOrientation("portrait");
    lock = true;
    lockElem.text = "Unlock";
};

exports.landscape = function() {
    orientation.setOrientation("landscape");
    lock = true;
    lockElem.text = "Unlock";

};


var lock = false;
exports.lock = function() {
    lock = !lock;
    if (lock) {
        orientation.disableRotation();
        lockElem.text = "Unlock";
    } else {
        orientation.enableRotation();
        lockElem.text = "Lock";
    }
};

exports.openMT = function() {
    const utils = require('tns-core-modules/utils/utils');
    utils.openUrl("https://master.technology");
};


exports.orientation = function(args) {
    console.log("Orientation was changed, is Landscape?", args.landscape);
};

exports.nav = function() {
    var frame = require('tns-core-modules/ui/frame');
    frame.topmost().navigate({ moduleName: "main-page2", clearHistory: true });
};