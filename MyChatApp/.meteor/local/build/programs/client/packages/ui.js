//////////////////////////////////////////////////////////////////////////
//                                                                      //
// This is a generated file. You can view the original                  //
// source in your browser if your browser supports source maps.         //
//                                                                      //
// If you are using Chrome, open the Developer Tools and click the gear //
// icon in its lower right corner. In the General Settings panel, turn  //
// on 'Enable source maps'.                                             //
//                                                                      //
// If you are using Firefox 23, go to `about:config` and set the        //
// `devtools.debugger.source-maps-enabled` preference to true.          //
// (The preference should be on by default in Firefox 24; versions      //
// older than 23 do not support source maps.)                           //
//                                                                      //
//////////////////////////////////////////////////////////////////////////


(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var $ = Package.jquery.$;
var jQuery = Package.jquery.jQuery;
var Deps = Package.deps.Deps;
var Random = Package.random.Random;
var EJSON = Package.ejson.EJSON;
var _ = Package.underscore._;
var OrderedDict = Package['ordered-dict'].OrderedDict;
var LocalCollection = Package.minimongo.LocalCollection;
var Minimongo = Package.minimongo.Minimongo;
var ObserveSequence = Package['observe-sequence'].ObserveSequence;
var HTML = Package.htmljs.HTML;
var Blaze = Package.blaze.Blaze;

/* Package-scope variables */
var UI, Handlebars;

(function () {

////////////////////////////////////////////////////////////////////////
//                                                                    //
// packages\ui\ui.js                                                  //
//                                                                    //
////////////////////////////////////////////////////////////////////////
                                                                      //
UI = {};                                                              // 1
                                                                      // 2
UI._globalHelpers = {};                                               // 3
                                                                      // 4
UI.registerHelper = function (name, func) {                           // 5
  UI._globalHelpers[name] = func;                                     // 6
};                                                                    // 7
                                                                      // 8
// Utility to HTML-escape a string.                                   // 9
UI._escape = (function() {                                            // 10
  var escape_map = {                                                  // 11
    "<": "&lt;",                                                      // 12
    ">": "&gt;",                                                      // 13
    '"': "&quot;",                                                    // 14
    "'": "&#x27;",                                                    // 15
    "`": "&#x60;", /* IE allows backtick-delimited attributes?? */    // 16
    "&": "&amp;"                                                      // 17
  };                                                                  // 18
  var escape_one = function(c) {                                      // 19
    return escape_map[c];                                             // 20
  };                                                                  // 21
                                                                      // 22
  return function (x) {                                               // 23
    return x.replace(/[&<>"'`]/g, escape_one);                        // 24
  };                                                                  // 25
})();                                                                 // 26
                                                                      // 27
var jsUrlsAllowed = false;                                            // 28
UI._allowJavascriptUrls = function () {                               // 29
  jsUrlsAllowed = true;                                               // 30
};                                                                    // 31
UI._javascriptUrlsAllowed = function () {                             // 32
  return jsUrlsAllowed;                                               // 33
};                                                                    // 34
                                                                      // 35
UI._parentData = Blaze._parentData;                                   // 36
                                                                      // 37
UI.getElementData = Blaze.getElementData;                             // 38
                                                                      // 39
////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////
//                                                                    //
// packages\ui\handlebars_backcompat.js                               //
//                                                                    //
////////////////////////////////////////////////////////////////////////
                                                                      //
Handlebars = {};                                                      // 1
Handlebars.registerHelper = UI.registerHelper;                        // 2
                                                                      // 3
Handlebars._escape = UI._escape;                                      // 4
                                                                      // 5
// Return these from {{...}} helpers to achieve the same as returning // 6
// strings from {{{...}}} helpers                                     // 7
Handlebars.SafeString = function(string) {                            // 8
  this.string = string;                                               // 9
};                                                                    // 10
Handlebars.SafeString.prototype.toString = function() {               // 11
  return this.string.toString();                                      // 12
};                                                                    // 13
                                                                      // 14
////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package.ui = {
  UI: UI,
  Handlebars: Handlebars
};

})();

//# sourceMappingURL=93cc89ef71b373441ee4555cbaf5e5b0707a4f0b.map
