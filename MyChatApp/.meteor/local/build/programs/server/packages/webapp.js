(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var Log = Package.logging.Log;
var _ = Package.underscore._;
var RoutePolicy = Package.routepolicy.RoutePolicy;
var SpacebarsCompiler = Package['spacebars-compiler'].SpacebarsCompiler;
var Spacebars = Package.spacebars.Spacebars;
var HTML = Package.htmljs.HTML;
var UI = Package.ui.UI;
var Handlebars = Package.ui.Handlebars;
var Blaze = Package.blaze.Blaze;

/* Package-scope variables */
var WebApp, main, WebAppInternals;

(function () {

///////////////////////////////////////////////////////////////////////////////////////////
//                                                                                       //
// packages\webapp\webapp_server.js                                                      //
//                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////
                                                                                         //
////////// Requires //////////                                                           // 1
                                                                                         // 2
var fs = Npm.require("fs");                                                              // 3
var http = Npm.require("http");                                                          // 4
var os = Npm.require("os");                                                              // 5
var path = Npm.require("path");                                                          // 6
var url = Npm.require("url");                                                            // 7
var crypto = Npm.require("crypto");                                                      // 8
                                                                                         // 9
var connect = Npm.require('connect');                                                    // 10
var useragent = Npm.require('useragent');                                                // 11
var send = Npm.require('send');                                                          // 12
                                                                                         // 13
var SHORT_SOCKET_TIMEOUT = 5*1000;                                                       // 14
var LONG_SOCKET_TIMEOUT = 120*1000;                                                      // 15
                                                                                         // 16
WebApp = {};                                                                             // 17
WebAppInternals = {};                                                                    // 18
                                                                                         // 19
var bundledJsCssPrefix;                                                                  // 20
                                                                                         // 21
// Keepalives so that when the outer server dies unceremoniously and                     // 22
// doesn't kill us, we quit ourselves. A little gross, but better than                   // 23
// pidfiles.                                                                             // 24
// XXX This should really be part of the boot script, not the webapp package.            // 25
//     Or we should just get rid of it, and rely on containerization.                    // 26
                                                                                         // 27
var initKeepalive = function () {                                                        // 28
  var keepaliveCount = 0;                                                                // 29
                                                                                         // 30
  process.stdin.on('data', function (data) {                                             // 31
    keepaliveCount = 0;                                                                  // 32
  });                                                                                    // 33
                                                                                         // 34
  process.stdin.resume();                                                                // 35
                                                                                         // 36
  setInterval(function () {                                                              // 37
    keepaliveCount ++;                                                                   // 38
    if (keepaliveCount >= 3) {                                                           // 39
      console.log("Failed to receive keepalive! Exiting.");                              // 40
      process.exit(1);                                                                   // 41
    }                                                                                    // 42
  }, 3000);                                                                              // 43
};                                                                                       // 44
                                                                                         // 45
                                                                                         // 46
var sha1 = function (contents) {                                                         // 47
  var hash = crypto.createHash('sha1');                                                  // 48
  hash.update(contents);                                                                 // 49
  return hash.digest('hex');                                                             // 50
};                                                                                       // 51
                                                                                         // 52
// #BrowserIdentification                                                                // 53
//                                                                                       // 54
// We have multiple places that want to identify the browser: the                        // 55
// unsupported browser page, the appcache package, and, eventually                       // 56
// delivering browser polyfills only as needed.                                          // 57
//                                                                                       // 58
// To avoid detecting the browser in multiple places ad-hoc, we create a                 // 59
// Meteor "browser" object. It uses but does not expose the npm                          // 60
// useragent module (we could choose a different mechanism to identify                   // 61
// the browser in the future if we wanted to).  The browser object                       // 62
// contains                                                                              // 63
//                                                                                       // 64
// * `name`: the name of the browser in camel case                                       // 65
// * `major`, `minor`, `patch`: integers describing the browser version                  // 66
//                                                                                       // 67
// Also here is an early version of a Meteor `request` object, intended                  // 68
// to be a high-level description of the request without exposing                        // 69
// details of connect's low-level `req`.  Currently it contains:                         // 70
//                                                                                       // 71
// * `browser`: browser identification object described above                            // 72
// * `url`: parsed url, including parsed query params                                    // 73
//                                                                                       // 74
// As a temporary hack there is a `categorizeRequest` function on WebApp which           // 75
// converts a connect `req` to a Meteor `request`. This can go away once smart           // 76
// packages such as appcache are being passed a `request` object directly when           // 77
// they serve content.                                                                   // 78
//                                                                                       // 79
// This allows `request` to be used uniformly: it is passed to the html                  // 80
// attributes hook, and the appcache package can use it when deciding                    // 81
// whether to generate a 404 for the manifest.                                           // 82
//                                                                                       // 83
// Real routing / server side rendering will probably refactor this                      // 84
// heavily.                                                                              // 85
                                                                                         // 86
                                                                                         // 87
// e.g. "Mobile Safari" => "mobileSafari"                                                // 88
var camelCase = function (name) {                                                        // 89
  var parts = name.split(' ');                                                           // 90
  parts[0] = parts[0].toLowerCase();                                                     // 91
  for (var i = 1;  i < parts.length;  ++i) {                                             // 92
    parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].substr(1);                    // 93
  }                                                                                      // 94
  return parts.join('');                                                                 // 95
};                                                                                       // 96
                                                                                         // 97
var identifyBrowser = function (userAgentString) {                                       // 98
  var userAgent = useragent.lookup(userAgentString);                                     // 99
  return {                                                                               // 100
    name: camelCase(userAgent.family),                                                   // 101
    major: +userAgent.major,                                                             // 102
    minor: +userAgent.minor,                                                             // 103
    patch: +userAgent.patch                                                              // 104
  };                                                                                     // 105
};                                                                                       // 106
                                                                                         // 107
// XXX Refactor as part of implementing real routing.                                    // 108
WebAppInternals.identifyBrowser = identifyBrowser;                                       // 109
                                                                                         // 110
WebApp.categorizeRequest = function (req) {                                              // 111
  return {                                                                               // 112
    browser: identifyBrowser(req.headers['user-agent']),                                 // 113
    url: url.parse(req.url, true)                                                        // 114
  };                                                                                     // 115
};                                                                                       // 116
                                                                                         // 117
// HTML attribute hooks: functions to be called to determine any attributes to           // 118
// be added to the '<html>' tag. Each function is passed a 'request' object (see         // 119
// #BrowserIdentification) and should return a string,                                   // 120
var htmlAttributeHooks = [];                                                             // 121
var getHtmlAttributes = function (request) {                                             // 122
  var combinedAttributes  = {};                                                          // 123
  _.each(htmlAttributeHooks || [], function (hook) {                                     // 124
    var attributes = hook(request);                                                      // 125
    if (attributes === null)                                                             // 126
      return;                                                                            // 127
    if (typeof attributes !== 'object')                                                  // 128
      throw Error("HTML attribute hook must return null or object");                     // 129
    _.extend(combinedAttributes, attributes);                                            // 130
  });                                                                                    // 131
  return combinedAttributes;                                                             // 132
};                                                                                       // 133
WebApp.addHtmlAttributeHook = function (hook) {                                          // 134
  htmlAttributeHooks.push(hook);                                                         // 135
};                                                                                       // 136
                                                                                         // 137
// Serve app HTML for this URL?                                                          // 138
var appUrl = function (url) {                                                            // 139
  if (url === '/favicon.ico' || url === '/robots.txt')                                   // 140
    return false;                                                                        // 141
                                                                                         // 142
  // NOTE: app.manifest is not a web standard like favicon.ico and                       // 143
  // robots.txt. It is a file name we have chosen to use for HTML5                       // 144
  // appcache URLs. It is included here to prevent using an appcache                     // 145
  // then removing it from poisoning an app permanently. Eventually,                     // 146
  // once we have server side routing, this won't be needed as                           // 147
  // unknown URLs with return a 404 automatically.                                       // 148
  if (url === '/app.manifest')                                                           // 149
    return false;                                                                        // 150
                                                                                         // 151
  // Avoid serving app HTML for declared routes such as /sockjs/.                        // 152
  if (RoutePolicy.classify(url))                                                         // 153
    return false;                                                                        // 154
                                                                                         // 155
  // we currently return app HTML on all URLs by default                                 // 156
  return true;                                                                           // 157
};                                                                                       // 158
                                                                                         // 159
                                                                                         // 160
// Calculate a hash of all the client resources downloaded by the                        // 161
// browser, including the application HTML, runtime config, code, and                    // 162
// static files.                                                                         // 163
//                                                                                       // 164
// This hash *must* change if any resources seen by the browser                          // 165
// change, and ideally *doesn't* change for any server-only changes                      // 166
// (but the second is a performance enhancement, not a hard                              // 167
// requirement).                                                                         // 168
                                                                                         // 169
var calculateClientHash = function () {                                                  // 170
  var hash = crypto.createHash('sha1');                                                  // 171
  hash.update(JSON.stringify(__meteor_runtime_config__), 'utf8');                        // 172
  _.each(WebApp.clientProgram.manifest, function (resource) {                            // 173
    if (resource.where === 'client' || resource.where === 'internal') {                  // 174
      hash.update(resource.path);                                                        // 175
      hash.update(resource.hash);                                                        // 176
    }                                                                                    // 177
  });                                                                                    // 178
  return hash.digest('hex');                                                             // 179
};                                                                                       // 180
                                                                                         // 181
                                                                                         // 182
// We need to calculate the client hash after all packages have loaded                   // 183
// to give them a chance to populate __meteor_runtime_config__.                          // 184
//                                                                                       // 185
// Calculating the hash during startup means that packages can only                      // 186
// populate __meteor_runtime_config__ during load, not during startup.                   // 187
//                                                                                       // 188
// Calculating instead it at the beginning of main after all startup                     // 189
// hooks had run would allow packages to also populate                                   // 190
// __meteor_runtime_config__ during startup, but that's too late for                     // 191
// autoupdate because it needs to have the client hash at startup to                     // 192
// insert the auto update version itself into                                            // 193
// __meteor_runtime_config__ to get it to the client.                                    // 194
//                                                                                       // 195
// An alternative would be to give autoupdate a "post-start,                             // 196
// pre-listen" hook to allow it to insert the auto update version at                     // 197
// the right moment.                                                                     // 198
                                                                                         // 199
Meteor.startup(function () {                                                             // 200
  WebApp.clientHash = calculateClientHash();                                             // 201
});                                                                                      // 202
                                                                                         // 203
                                                                                         // 204
                                                                                         // 205
// When we have a request pending, we want the socket timeout to be long, to             // 206
// give ourselves a while to serve it, and to allow sockjs long polls to                 // 207
// complete.  On the other hand, we want to close idle sockets relatively                // 208
// quickly, so that we can shut down relatively promptly but cleanly, without            // 209
// cutting off anyone's response.                                                        // 210
WebApp._timeoutAdjustmentRequestCallback = function (req, res) {                         // 211
  // this is really just req.socket.setTimeout(LONG_SOCKET_TIMEOUT);                     // 212
  req.setTimeout(LONG_SOCKET_TIMEOUT);                                                   // 213
  // Insert our new finish listener to run BEFORE the existing one which removes         // 214
  // the response from the socket.                                                       // 215
  var finishListeners = res.listeners('finish');                                         // 216
  // XXX Apparently in Node 0.12 this event is now called 'prefinish'.                   // 217
  // https://github.com/joyent/node/commit/7c9b6070                                      // 218
  res.removeAllListeners('finish');                                                      // 219
  res.on('finish', function () {                                                         // 220
    res.setTimeout(SHORT_SOCKET_TIMEOUT);                                                // 221
  });                                                                                    // 222
  _.each(finishListeners, function (l) { res.on('finish', l); });                        // 223
};                                                                                       // 224
                                                                                         // 225
// Will be updated by main before we listen.                                             // 226
var boilerplateFunc = null;                                                              // 227
var boilerplateBaseData = null;                                                          // 228
var memoizedBoilerplate = {};                                                            // 229
                                                                                         // 230
// Given a request (as returned from `categorizeRequest`), return the                    // 231
// boilerplate HTML to serve for that request. Memoizes on HTML                          // 232
// attributes (used by, eg, appcache) and whether inline scripts are                     // 233
// currently allowed.                                                                    // 234
var getBoilerplate = function (request) {                                                // 235
  var htmlAttributes = getHtmlAttributes(request);                                       // 236
                                                                                         // 237
  // The only thing that changes from request to request (for now) are                   // 238
  // the HTML attributes (used by, eg, appcache) and whether inline                      // 239
  // scripts are allowed, so we can memoize based on that.                               // 240
  var boilerplateKey = JSON.stringify({                                                  // 241
    inlineScriptsAllowed: inlineScriptsAllowed,                                          // 242
    htmlAttributes: htmlAttributes                                                       // 243
  });                                                                                    // 244
                                                                                         // 245
  if (! _.has(memoizedBoilerplate, boilerplateKey)) {                                    // 246
    var boilerplateData = _.extend({                                                     // 247
      htmlAttributes: htmlAttributes,                                                    // 248
      inlineScriptsAllowed: WebAppInternals.inlineScriptsAllowed()                       // 249
    }, boilerplateBaseData);                                                             // 250
                                                                                         // 251
    memoizedBoilerplate[boilerplateKey] = "<!DOCTYPE html>\n" +                          // 252
      Blaze.toHTML(Blaze.With(boilerplateData, boilerplateFunc));                        // 253
  }                                                                                      // 254
  return memoizedBoilerplate[boilerplateKey];                                            // 255
};                                                                                       // 256
                                                                                         // 257
// Serve static files from the manifest or added with                                    // 258
// `addStaticJs`. Exported for tests.                                                    // 259
// Options are:                                                                          // 260
//   - staticFiles: object mapping pathname of file in manifest -> {                     // 261
//     path, cacheable, sourceMapUrl, type }                                             // 262
//   - clientDir: root directory for static files from client manifest                   // 263
WebAppInternals.staticFilesMiddleware = function (options, req, res, next) {             // 264
  if ('GET' != req.method && 'HEAD' != req.method) {                                     // 265
    next();                                                                              // 266
    return;                                                                              // 267
  }                                                                                      // 268
  var pathname = connect.utils.parseUrl(req).pathname;                                   // 269
  var staticFiles = options.staticFiles;                                                 // 270
  var clientDir = options.clientDir;                                                     // 271
                                                                                         // 272
  try {                                                                                  // 273
    pathname = decodeURIComponent(pathname);                                             // 274
  } catch (e) {                                                                          // 275
    next();                                                                              // 276
    return;                                                                              // 277
  }                                                                                      // 278
                                                                                         // 279
  var serveStaticJs = function (s) {                                                     // 280
    res.writeHead(200, {                                                                 // 281
      'Content-type': 'application/javascript; charset=UTF-8'                            // 282
    });                                                                                  // 283
    res.write(s);                                                                        // 284
    res.end();                                                                           // 285
  };                                                                                     // 286
                                                                                         // 287
  if (pathname === "/meteor_runtime_config.js" &&                                        // 288
      ! WebAppInternals.inlineScriptsAllowed()) {                                        // 289
    serveStaticJs("__meteor_runtime_config__ = " +                                       // 290
                  JSON.stringify(__meteor_runtime_config__) + ";");                      // 291
    return;                                                                              // 292
  } else if (_.has(additionalStaticJs, pathname) &&                                      // 293
             ! WebAppInternals.inlineScriptsAllowed()) {                                 // 294
    serveStaticJs(additionalStaticJs[pathname]);                                         // 295
    return;                                                                              // 296
  }                                                                                      // 297
                                                                                         // 298
  if (!_.has(staticFiles, pathname)) {                                                   // 299
    next();                                                                              // 300
    return;                                                                              // 301
  }                                                                                      // 302
                                                                                         // 303
  // We don't need to call pause because, unlike 'static', once we call into             // 304
  // 'send' and yield to the event loop, we never call another handler with              // 305
  // 'next'.                                                                             // 306
                                                                                         // 307
  var info = staticFiles[pathname];                                                      // 308
                                                                                         // 309
  // Cacheable files are files that should never change. Typically                       // 310
  // named by their hash (eg meteor bundled js and css files).                           // 311
  // We cache them ~forever (1yr).                                                       // 312
  //                                                                                     // 313
  // We cache non-cacheable files anyway. This isn't really correct, as users            // 314
  // can change the files and changes won't propagate immediately. However, if           // 315
  // we don't cache them, browsers will 'flicker' when rerendering                       // 316
  // images. Eventually we will probably want to rewrite URLs of static assets           // 317
  // to include a query parameter to bust caches. That way we can both get               // 318
  // good caching behavior and allow users to change assets without delay.               // 319
  // https://github.com/meteor/meteor/issues/773                                         // 320
  var maxAge = info.cacheable                                                            // 321
        ? 1000 * 60 * 60 * 24 * 365                                                      // 322
        : 1000 * 60 * 60 * 24;                                                           // 323
                                                                                         // 324
  // Set the X-SourceMap header, which current Chrome understands.                       // 325
  // (The files also contain '//#' comments which FF 24 understands and                  // 326
  // Chrome doesn't understand yet.)                                                     // 327
  //                                                                                     // 328
  // Eventually we should set the SourceMap header but the current version of            // 329
  // Chrome and no version of FF supports it.                                            // 330
  //                                                                                     // 331
  // To figure out if your version of Chrome should support the SourceMap                // 332
  // header,                                                                             // 333
  //   - go to chrome://version. Let's say the Chrome version is                         // 334
  //      28.0.1500.71 and the Blink version is 537.36 (@153022)                         // 335
  //   - go to http://src.chromium.org/viewvc/blink/branches/chromium/1500/Source/core/inspector/InspectorPageAgent.cpp?view=log
  //     where the "1500" is the third part of your Chrome version                       // 337
  //   - find the first revision that is no greater than the "153022"                    // 338
  //     number.  That's probably the first one and it probably has                      // 339
  //     a message of the form "Branch 1500 - blink@r149738"                             // 340
  //   - If *that* revision number (149738) is at least 151755,                          // 341
  //     then Chrome should support SourceMap (not just X-SourceMap)                     // 342
  // (The change is https://codereview.chromium.org/15832007)                            // 343
  //                                                                                     // 344
  // You also need to enable source maps in Chrome: open dev tools, click                // 345
  // the gear in the bottom right corner, and select "enable source maps".               // 346
  //                                                                                     // 347
  // Firefox 23+ supports source maps but doesn't support either header yet,             // 348
  // so we include the '//#' comment for it:                                             // 349
  //   https://bugzilla.mozilla.org/show_bug.cgi?id=765993                               // 350
  // In FF 23 you need to turn on `devtools.debugger.source-maps-enabled`                // 351
  // in `about:config` (it is on by default in FF 24).                                   // 352
  if (info.sourceMapUrl)                                                                 // 353
    res.setHeader('X-SourceMap', info.sourceMapUrl);                                     // 354
                                                                                         // 355
  if (info.type === "js") {                                                              // 356
    res.setHeader("Content-Type", "application/javascript; charset=UTF-8");              // 357
  } else if (info.type === "css") {                                                      // 358
    res.setHeader("Content-Type", "text/css; charset=UTF-8");                            // 359
  }                                                                                      // 360
                                                                                         // 361
  send(req, path.join(clientDir, info.path))                                             // 362
    .maxage(maxAge)                                                                      // 363
    .hidden(true)  // if we specified a dotfile in the manifest, serve it                // 364
    .on('error', function (err) {                                                        // 365
      Log.error("Error serving static file " + err);                                     // 366
      res.writeHead(500);                                                                // 367
      res.end();                                                                         // 368
    })                                                                                   // 369
    .on('directory', function () {                                                       // 370
      Log.error("Unexpected directory " + info.path);                                    // 371
      res.writeHead(500);                                                                // 372
      res.end();                                                                         // 373
    })                                                                                   // 374
    .pipe(res);                                                                          // 375
};                                                                                       // 376
                                                                                         // 377
var runWebAppServer = function () {                                                      // 378
  var shuttingDown = false;                                                              // 379
  // read the control for the client we'll be serving up                                 // 380
  var clientJsonPath = path.join(__meteor_bootstrap__.serverDir,                         // 381
                                 __meteor_bootstrap__.configJson.client);                // 382
  var clientDir = path.dirname(clientJsonPath);                                          // 383
  var clientJson = JSON.parse(fs.readFileSync(clientJsonPath, 'utf8'));                  // 384
                                                                                         // 385
  if (clientJson.format !== "browser-program-pre1")                                      // 386
    throw new Error("Unsupported format for client assets: " +                           // 387
                    JSON.stringify(clientJson.format));                                  // 388
                                                                                         // 389
  // webserver                                                                           // 390
  var app = connect();                                                                   // 391
                                                                                         // 392
  // Auto-compress any json, javascript, or text.                                        // 393
  app.use(connect.compress());                                                           // 394
                                                                                         // 395
  // Packages and apps can add handlers that run before any other Meteor                 // 396
  // handlers via WebApp.rawConnectHandlers.                                             // 397
  var rawConnectHandlers = connect();                                                    // 398
  app.use(rawConnectHandlers);                                                           // 399
                                                                                         // 400
  // Strip off the path prefix, if it exists.                                            // 401
  app.use(function (request, response, next) {                                           // 402
    var pathPrefix = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX;                     // 403
    var url = Npm.require('url').parse(request.url);                                     // 404
    var pathname = url.pathname;                                                         // 405
    // check if the path in the url starts with the path prefix (and the part            // 406
    // after the path prefix must start with a / if it exists.)                          // 407
    if (pathPrefix && pathname.substring(0, pathPrefix.length) === pathPrefix &&         // 408
       (pathname.length == pathPrefix.length                                             // 409
        || pathname.substring(pathPrefix.length, pathPrefix.length + 1) === "/")) {      // 410
      request.url = request.url.substring(pathPrefix.length);                            // 411
      next();                                                                            // 412
    } else if (pathname === "/favicon.ico" || pathname === "/robots.txt") {              // 413
      next();                                                                            // 414
    } else if (pathPrefix) {                                                             // 415
      response.writeHead(404);                                                           // 416
      response.write("Unknown path");                                                    // 417
      response.end();                                                                    // 418
    } else {                                                                             // 419
      next();                                                                            // 420
    }                                                                                    // 421
  });                                                                                    // 422
                                                                                         // 423
  // Parse the query string into res.query. Used by oauth_server, but it's               // 424
  // generally pretty handy..                                                            // 425
  app.use(connect.query());                                                              // 426
                                                                                         // 427
  var getItemPathname = function (itemUrl) {                                             // 428
    return decodeURIComponent(url.parse(itemUrl).pathname);                              // 429
  };                                                                                     // 430
                                                                                         // 431
  var staticFiles = {};                                                                  // 432
  _.each(clientJson.manifest, function (item) {                                          // 433
    if (item.url && item.where === "client") {                                           // 434
      staticFiles[getItemPathname(item.url)] = {                                         // 435
        path: item.path,                                                                 // 436
        cacheable: item.cacheable,                                                       // 437
        // Link from source to its map                                                   // 438
        sourceMapUrl: item.sourceMapUrl,                                                 // 439
        type: item.type                                                                  // 440
      };                                                                                 // 441
                                                                                         // 442
      if (item.sourceMap) {                                                              // 443
        // Serve the source map too, under the specified URL. We assume all              // 444
        // source maps are cacheable.                                                    // 445
        staticFiles[getItemPathname(item.sourceMapUrl)] = {                              // 446
          path: item.sourceMap,                                                          // 447
          cacheable: true                                                                // 448
        };                                                                               // 449
      }                                                                                  // 450
    }                                                                                    // 451
  });                                                                                    // 452
                                                                                         // 453
  // Exported for tests.                                                                 // 454
  WebAppInternals.staticFiles = staticFiles;                                             // 455
                                                                                         // 456
                                                                                         // 457
  // Serve static files from the manifest.                                               // 458
  // This is inspired by the 'static' middleware.                                        // 459
  app.use(function (req, res, next) {                                                    // 460
    return WebAppInternals.staticFilesMiddleware({                                       // 461
      staticFiles: staticFiles,                                                          // 462
      clientDir: clientDir                                                               // 463
    }, req, res, next);                                                                  // 464
  });                                                                                    // 465
                                                                                         // 466
  // Packages and apps can add handlers to this via WebApp.connectHandlers.              // 467
  // They are inserted before our default handler.                                       // 468
  var packageAndAppHandlers = connect();                                                 // 469
  app.use(packageAndAppHandlers);                                                        // 470
                                                                                         // 471
  var suppressConnectErrors = false;                                                     // 472
  // connect knows it is an error handler because it has 4 arguments instead of          // 473
  // 3. go figure.  (It is not smart enough to find such a thing if it's hidden          // 474
  // inside packageAndAppHandlers.)                                                      // 475
  app.use(function (err, req, res, next) {                                               // 476
    if (!err || !suppressConnectErrors || !req.headers['x-suppress-error']) {            // 477
      next(err);                                                                         // 478
      return;                                                                            // 479
    }                                                                                    // 480
    res.writeHead(err.status, { 'Content-Type': 'text/plain' });                         // 481
    res.end("An error message");                                                         // 482
  });                                                                                    // 483
                                                                                         // 484
  app.use(function (req, res, next) {                                                    // 485
    if (! appUrl(req.url))                                                               // 486
      return next();                                                                     // 487
                                                                                         // 488
    if (!boilerplateFunc)                                                                // 489
      throw new Error("boilerplateFunc should be set before listening!");                // 490
    if (!boilerplateBaseData)                                                            // 491
      throw new Error("boilerplateBaseData should be set before listening!");            // 492
                                                                                         // 493
    var headers = {                                                                      // 494
      'Content-Type':  'text/html; charset=utf-8'                                        // 495
    };                                                                                   // 496
    if (shuttingDown)                                                                    // 497
      headers['Connection'] = 'Close';                                                   // 498
                                                                                         // 499
    var request = WebApp.categorizeRequest(req);                                         // 500
                                                                                         // 501
    if (request.url.query && request.url.query['meteor_css_resource']) {                 // 502
      // In this case, we're requesting a CSS resource in the meteor-specific            // 503
      // way, but we don't have it.  Serve a static css file that indicates that         // 504
      // we didn't have it, so we can detect that and refresh.                           // 505
      headers['Content-Type'] = 'text/css; charset=utf-8';                               // 506
      res.writeHead(200, headers);                                                       // 507
      res.write(".meteor-css-not-found-error { width: 0px;}");                           // 508
      res.end();                                                                         // 509
      return undefined;                                                                  // 510
    }                                                                                    // 511
                                                                                         // 512
    var boilerplate;                                                                     // 513
    try {                                                                                // 514
      boilerplate = getBoilerplate(request);                                             // 515
    } catch (e) {                                                                        // 516
      Log.error("Error running template: " + e);                                         // 517
      res.writeHead(500, headers);                                                       // 518
      res.end();                                                                         // 519
      return undefined;                                                                  // 520
    }                                                                                    // 521
                                                                                         // 522
    res.writeHead(200, headers);                                                         // 523
    res.write(boilerplate);                                                              // 524
    res.end();                                                                           // 525
    return undefined;                                                                    // 526
  });                                                                                    // 527
                                                                                         // 528
  // Return 404 by default, if no other handlers serve this URL.                         // 529
  app.use(function (req, res) {                                                          // 530
    res.writeHead(404);                                                                  // 531
    res.end();                                                                           // 532
  });                                                                                    // 533
                                                                                         // 534
                                                                                         // 535
  var httpServer = http.createServer(app);                                               // 536
  var onListeningCallbacks = [];                                                         // 537
                                                                                         // 538
  // After 5 seconds w/o data on a socket, kill it.  On the other hand, if               // 539
  // there's an outstanding request, give it a higher timeout instead (to avoid          // 540
  // killing long-polling requests)                                                      // 541
  httpServer.setTimeout(SHORT_SOCKET_TIMEOUT);                                           // 542
                                                                                         // 543
  // Do this here, and then also in livedata/stream_server.js, because                   // 544
  // stream_server.js kills all the current request handlers when installing its         // 545
  // own.                                                                                // 546
  httpServer.on('request', WebApp._timeoutAdjustmentRequestCallback);                    // 547
                                                                                         // 548
                                                                                         // 549
  // For now, handle SIGHUP here.  Later, this should be in some centralized             // 550
  // Meteor shutdown code.                                                               // 551
  process.on('SIGHUP', Meteor.bindEnvironment(function () {                              // 552
    shuttingDown = true;                                                                 // 553
    // tell others with websockets open that we plan to close this.                      // 554
    // XXX: Eventually, this should be done with a standard meteor shut-down             // 555
    // logic path.                                                                       // 556
    httpServer.emit('meteor-closing');                                                   // 557
                                                                                         // 558
    httpServer.close(Meteor.bindEnvironment(function () {                                // 559
      if (proxy) {                                                                       // 560
        try {                                                                            // 561
          proxy.call('removeBindingsForJob', process.env.GALAXY_JOB);                    // 562
        } catch (e) {                                                                    // 563
          Log.error("Error removing bindings: " + e.message);                            // 564
          process.exit(1);                                                               // 565
        }                                                                                // 566
      }                                                                                  // 567
      process.exit(0);                                                                   // 568
                                                                                         // 569
    }, "On http server close failed"));                                                  // 570
                                                                                         // 571
    // Ideally we will close before this hits.                                           // 572
    Meteor.setTimeout(function () {                                                      // 573
      Log.warn("Closed by SIGHUP but one or more HTTP requests may not have finished."); // 574
      process.exit(1);                                                                   // 575
    }, 5000);                                                                            // 576
                                                                                         // 577
  }, function (err) {                                                                    // 578
    console.log(err);                                                                    // 579
    process.exit(1);                                                                     // 580
  }));                                                                                   // 581
                                                                                         // 582
  // start up app                                                                        // 583
  _.extend(WebApp, {                                                                     // 584
    connectHandlers: packageAndAppHandlers,                                              // 585
    rawConnectHandlers: rawConnectHandlers,                                              // 586
    httpServer: httpServer,                                                              // 587
    // metadata about the client program that we serve                                   // 588
    clientProgram: {                                                                     // 589
      manifest: clientJson.manifest                                                      // 590
      // XXX do we need a "root: clientDir" field here? it used to be here but           // 591
      // was unused.                                                                     // 592
    },                                                                                   // 593
    // For testing.                                                                      // 594
    suppressConnectErrors: function () {                                                 // 595
      suppressConnectErrors = true;                                                      // 596
    },                                                                                   // 597
    onListening: function (f) {                                                          // 598
      if (onListeningCallbacks)                                                          // 599
        onListeningCallbacks.push(f);                                                    // 600
      else                                                                               // 601
        f();                                                                             // 602
    },                                                                                   // 603
    // Hack: allow http tests to call connect.basicAuth without making them              // 604
    // Npm.depends on another copy of connect. (That would be fine if we could           // 605
    // have test-only NPM dependencies but is overkill here.)                            // 606
    __basicAuth__: connect.basicAuth                                                     // 607
  });                                                                                    // 608
                                                                                         // 609
  // Let the rest of the packages (and Meteor.startup hooks) insert connect              // 610
  // middlewares and update __meteor_runtime_config__, then keep going to set up         // 611
  // actually serving HTML.                                                              // 612
  main = function (argv) {                                                               // 613
    // main happens post startup hooks, so we don't need a Meteor.startup() to           // 614
    // ensure this happens after the galaxy package is loaded.                           // 615
    var AppConfig = Package["application-configuration"].AppConfig;                      // 616
    // We used to use the optimist npm package to parse argv here, but it's              // 617
    // overkill (and no longer in the dev bundle). Just assume any instance of           // 618
    // '--keepalive' is a use of the option.                                             // 619
    var expectKeepalives = _.contains(argv, '--keepalive');                              // 620
                                                                                         // 621
    boilerplateBaseData = {                                                              // 622
      // 'htmlAttributes' and 'inlineScriptsAllowed' are set at render                   // 623
      // time, because they are allowed to change from request to                        // 624
      // request.                                                                        // 625
      css: [],                                                                           // 626
      js: [],                                                                            // 627
      head: '',                                                                          // 628
      body: '',                                                                          // 629
      additionalStaticJs: _.map(                                                         // 630
        additionalStaticJs,                                                              // 631
        function (contents, pathname) {                                                  // 632
          return {                                                                       // 633
            pathname: pathname,                                                          // 634
            contents: contents                                                           // 635
          };                                                                             // 636
        }                                                                                // 637
      ),                                                                                 // 638
      meteorRuntimeConfig: JSON.stringify(__meteor_runtime_config__),                    // 639
      rootUrlPathPrefix: __meteor_runtime_config__.ROOT_URL_PATH_PREFIX || '',           // 640
      bundledJsCssPrefix: bundledJsCssPrefix ||                                          // 641
        __meteor_runtime_config__.ROOT_URL_PATH_PREFIX || ''                             // 642
    };                                                                                   // 643
                                                                                         // 644
    _.each(WebApp.clientProgram.manifest, function (item) {                              // 645
      if (item.type === 'css' && item.where === 'client') {                              // 646
        boilerplateBaseData.css.push({url: item.url});                                   // 647
      }                                                                                  // 648
      if (item.type === 'js' && item.where === 'client') {                               // 649
        boilerplateBaseData.js.push({url: item.url});                                    // 650
      }                                                                                  // 651
      if (item.type === 'head') {                                                        // 652
        boilerplateBaseData.head = fs.readFileSync(                                      // 653
          path.join(clientDir, item.path), 'utf8');                                      // 654
      }                                                                                  // 655
      if (item.type === 'body') {                                                        // 656
        boilerplateBaseData.body = fs.readFileSync(                                      // 657
          path.join(clientDir, item.path), 'utf8');                                      // 658
      }                                                                                  // 659
    });                                                                                  // 660
                                                                                         // 661
    var boilerplateTemplateSource = Assets.getText("boilerplate.html");                  // 662
    var boilerplateRenderCode = SpacebarsCompiler.compile(                               // 663
      boilerplateTemplateSource, { isBody: true });                                      // 664
                                                                                         // 665
    // Note that we are actually depending on eval's local environment capture           // 666
    // so that UI and HTML are visible to the eval'd code.                               // 667
    boilerplateFunc = eval(boilerplateRenderCode);                                       // 668
                                                                                         // 669
    // only start listening after all the startup code has run.                          // 670
    var localPort = parseInt(process.env.PORT) || 0;                                     // 671
    var host = process.env.BIND_IP;                                                      // 672
    var localIp = host || '0.0.0.0';                                                     // 673
    httpServer.listen(localPort, localIp, Meteor.bindEnvironment(function() {            // 674
      if (expectKeepalives)                                                              // 675
        console.log("LISTENING"); // must match run-app.js                               // 676
      var proxyBinding;                                                                  // 677
                                                                                         // 678
      AppConfig.configurePackage('webapp', function (configuration) {                    // 679
        if (proxyBinding)                                                                // 680
          proxyBinding.stop();                                                           // 681
        if (configuration && configuration.proxy) {                                      // 682
          // TODO: We got rid of the place where this checks the app's                   // 683
          // configuration, because this wants to be configured for some things          // 684
          // on a per-job basis.  Discuss w/ teammates.                                  // 685
          proxyBinding = AppConfig.configureService(                                     // 686
            "proxy",                                                                     // 687
            "pre0",                                                                      // 688
            function (proxyService) {                                                    // 689
              if (proxyService && ! _.isEmpty(proxyService)) {                           // 690
                var proxyConf;                                                           // 691
                // XXX Figure out a per-job way to specify bind location                 // 692
                // (besides hardcoding the location for ADMIN_APP jobs).                 // 693
                if (process.env.ADMIN_APP) {                                             // 694
                  var bindPathPrefix = "";                                               // 695
                  if (process.env.GALAXY_APP !== "panel") {                              // 696
                    bindPathPrefix = "/" + bindPathPrefix +                              // 697
                      encodeURIComponent(                                                // 698
                        process.env.GALAXY_APP                                           // 699
                      ).replace(/\./g, '_');                                             // 700
                  }                                                                      // 701
                  proxyConf = {                                                          // 702
                    bindHost: process.env.GALAXY_NAME,                                   // 703
                    bindPathPrefix: bindPathPrefix,                                      // 704
                    requiresAuth: true                                                   // 705
                  };                                                                     // 706
                } else {                                                                 // 707
                  proxyConf = configuration.proxy;                                       // 708
                }                                                                        // 709
                Log("Attempting to bind to proxy at " +                                  // 710
                    proxyService);                                                       // 711
                WebAppInternals.bindToProxy(_.extend({                                   // 712
                  proxyEndpoint: proxyService                                            // 713
                }, proxyConf));                                                          // 714
              }                                                                          // 715
            }                                                                            // 716
          );                                                                             // 717
        }                                                                                // 718
      });                                                                                // 719
                                                                                         // 720
      var callbacks = onListeningCallbacks;                                              // 721
      onListeningCallbacks = null;                                                       // 722
      _.each(callbacks, function (x) { x(); });                                          // 723
                                                                                         // 724
    }, function (e) {                                                                    // 725
      console.error("Error listening:", e);                                              // 726
      console.error(e && e.stack);                                                       // 727
    }));                                                                                 // 728
                                                                                         // 729
    if (expectKeepalives)                                                                // 730
      initKeepalive();                                                                   // 731
    return 'DAEMON';                                                                     // 732
  };                                                                                     // 733
};                                                                                       // 734
                                                                                         // 735
                                                                                         // 736
var proxy;                                                                               // 737
WebAppInternals.bindToProxy = function (proxyConfig) {                                   // 738
  var securePort = proxyConfig.securePort || 4433;                                       // 739
  var insecurePort = proxyConfig.insecurePort || 8080;                                   // 740
  var bindPathPrefix = proxyConfig.bindPathPrefix || "";                                 // 741
  // XXX also support galaxy-based lookup                                                // 742
  if (!proxyConfig.proxyEndpoint)                                                        // 743
    throw new Error("missing proxyEndpoint");                                            // 744
  if (!proxyConfig.bindHost)                                                             // 745
    throw new Error("missing bindHost");                                                 // 746
  if (!process.env.GALAXY_JOB)                                                           // 747
    throw new Error("missing $GALAXY_JOB");                                              // 748
  if (!process.env.GALAXY_APP)                                                           // 749
    throw new Error("missing $GALAXY_APP");                                              // 750
  if (!process.env.LAST_START)                                                           // 751
    throw new Error("missing $LAST_START");                                              // 752
                                                                                         // 753
  // XXX rename pid argument to bindTo.                                                  // 754
  // XXX factor out into a 'getPid' function in a 'galaxy' package?                      // 755
  var pid = {                                                                            // 756
    job: process.env.GALAXY_JOB,                                                         // 757
    lastStarted: +(process.env.LAST_START),                                              // 758
    app: process.env.GALAXY_APP                                                          // 759
  };                                                                                     // 760
  var myHost = os.hostname();                                                            // 761
                                                                                         // 762
  WebAppInternals.usingDdpProxy = true;                                                  // 763
                                                                                         // 764
  // This is run after packages are loaded (in main) so we can use                       // 765
  // Follower.connect.                                                                   // 766
  if (proxy) {                                                                           // 767
    // XXX the concept here is that our configuration has changed and                    // 768
    // we have connected to an entirely new follower set, which does                     // 769
    // not have the state that we set up on the follower set that we                     // 770
    // were previously connected to, and so we need to recreate all of                   // 771
    // our bindings -- analogous to getting a SIGHUP and rereading                       // 772
    // your configuration file. so probably this should actually tear                    // 773
    // down the connection and make a whole new one, rather than                         // 774
    // hot-reconnecting to a different URL.                                              // 775
    proxy.reconnect({                                                                    // 776
      url: proxyConfig.proxyEndpoint                                                     // 777
    });                                                                                  // 778
  } else {                                                                               // 779
    proxy = Package["follower-livedata"].Follower.connect(                               // 780
      proxyConfig.proxyEndpoint, {                                                       // 781
        group: "proxy"                                                                   // 782
      }                                                                                  // 783
    );                                                                                   // 784
  }                                                                                      // 785
                                                                                         // 786
  var route = process.env.ROUTE;                                                         // 787
  var ourHost = route.split(":")[0];                                                     // 788
  var ourPort = +route.split(":")[1];                                                    // 789
                                                                                         // 790
  var outstanding = 0;                                                                   // 791
  var startedAll = false;                                                                // 792
  var checkComplete = function () {                                                      // 793
    if (startedAll && ! outstanding)                                                     // 794
      Log("Bound to proxy.");                                                            // 795
  };                                                                                     // 796
  var makeCallback = function () {                                                       // 797
    outstanding++;                                                                       // 798
    return function (err) {                                                              // 799
      if (err)                                                                           // 800
        throw err;                                                                       // 801
      outstanding--;                                                                     // 802
      checkComplete();                                                                   // 803
    };                                                                                   // 804
  };                                                                                     // 805
                                                                                         // 806
  // for now, have our (temporary) requiresAuth flag apply to all                        // 807
  // routes created by this process.                                                     // 808
  var requiresDdpAuth = !! proxyConfig.requiresAuth;                                     // 809
  var requiresHttpAuth = (!! proxyConfig.requiresAuth) &&                                // 810
        (pid.app !== "panel" && pid.app !== "auth");                                     // 811
                                                                                         // 812
  // XXX a current limitation is that we treat securePort and                            // 813
  // insecurePort as a global configuration parameter -- we assume                       // 814
  // that if the proxy wants us to ask for 8080 to get port 80 traffic                   // 815
  // on our default hostname, that's the same port that we would use                     // 816
  // to get traffic on some other hostname that our proxy listens                        // 817
  // for. Likewise, we assume that if the proxy can receive secure                       // 818
  // traffic for our domain, it can assume secure traffic for any                        // 819
  // domain! Hopefully this will get cleaned up before too long by                       // 820
  // pushing that logic into the proxy service, so we can just ask for                   // 821
  // port 80.                                                                            // 822
                                                                                         // 823
  // XXX BUG: if our configuration changes, and bindPathPrefix                           // 824
  // changes, it appears that we will not remove the routes derived                      // 825
  // from the old bindPathPrefix from the proxy (until the process                       // 826
  // exits). It is not actually normal for bindPathPrefix to change,                     // 827
  // certainly not without a process restart for other reasons, but                      // 828
  // it'd be nice to fix.                                                                // 829
                                                                                         // 830
  _.each(routes, function (route) {                                                      // 831
    var parsedUrl = url.parse(route.url, /* parseQueryString */ false,                   // 832
                              /* slashesDenoteHost aka workRight */ true);               // 833
    if (parsedUrl.protocol || parsedUrl.port || parsedUrl.search)                        // 834
      throw new Error("Bad url");                                                        // 835
    parsedUrl.host = null;                                                               // 836
    parsedUrl.path = null;                                                               // 837
    if (! parsedUrl.hostname) {                                                          // 838
      parsedUrl.hostname = proxyConfig.bindHost;                                         // 839
      if (! parsedUrl.pathname)                                                          // 840
        parsedUrl.pathname = "";                                                         // 841
      if (! parsedUrl.pathname.indexOf("/") !== 0) {                                     // 842
        // Relative path                                                                 // 843
        parsedUrl.pathname = bindPathPrefix + parsedUrl.pathname;                        // 844
      }                                                                                  // 845
    }                                                                                    // 846
    var version = "";                                                                    // 847
                                                                                         // 848
    var AppConfig = Package["application-configuration"].AppConfig;                      // 849
    version = AppConfig.getStarForThisJob() || "";                                       // 850
                                                                                         // 851
                                                                                         // 852
    var parsedDdpUrl = _.clone(parsedUrl);                                               // 853
    parsedDdpUrl.protocol = "ddp";                                                       // 854
    // Node has a hardcoded list of protocols that get '://' instead                     // 855
    // of ':'. ddp needs to be added to that whitelist. Until then, we                   // 856
    // can set the undocumented attribute 'slashes' to get the right                     // 857
    // behavior. It's not clear whether than is by design or accident.                   // 858
    parsedDdpUrl.slashes = true;                                                         // 859
    parsedDdpUrl.port = '' + securePort;                                                 // 860
    var ddpUrl = url.format(parsedDdpUrl);                                               // 861
                                                                                         // 862
    var proxyToHost, proxyToPort, proxyToPathPrefix;                                     // 863
    if (! _.has(route, 'forwardTo')) {                                                   // 864
      proxyToHost = ourHost;                                                             // 865
      proxyToPort = ourPort;                                                             // 866
      proxyToPathPrefix = parsedUrl.pathname;                                            // 867
    } else {                                                                             // 868
      var parsedFwdUrl = url.parse(route.forwardTo, false, true);                        // 869
      if (! parsedFwdUrl.hostname || parsedFwdUrl.protocol)                              // 870
        throw new Error("Bad forward url");                                              // 871
      proxyToHost = parsedFwdUrl.hostname;                                               // 872
      proxyToPort = parseInt(parsedFwdUrl.port || "80");                                 // 873
      proxyToPathPrefix = parsedFwdUrl.pathname || "";                                   // 874
    }                                                                                    // 875
                                                                                         // 876
    if (route.ddp) {                                                                     // 877
      proxy.call('bindDdp', {                                                            // 878
        pid: pid,                                                                        // 879
        bindTo: {                                                                        // 880
          ddpUrl: ddpUrl,                                                                // 881
          insecurePort: insecurePort                                                     // 882
        },                                                                               // 883
        proxyTo: {                                                                       // 884
          tags: [version],                                                               // 885
          host: proxyToHost,                                                             // 886
          port: proxyToPort,                                                             // 887
          pathPrefix: proxyToPathPrefix + '/websocket'                                   // 888
        },                                                                               // 889
        requiresAuth: requiresDdpAuth                                                    // 890
      }, makeCallback());                                                                // 891
    }                                                                                    // 892
                                                                                         // 893
    if (route.http) {                                                                    // 894
      proxy.call('bindHttp', {                                                           // 895
        pid: pid,                                                                        // 896
        bindTo: {                                                                        // 897
          host: parsedUrl.hostname,                                                      // 898
          port: insecurePort,                                                            // 899
          pathPrefix: parsedUrl.pathname                                                 // 900
        },                                                                               // 901
        proxyTo: {                                                                       // 902
          tags: [version],                                                               // 903
          host: proxyToHost,                                                             // 904
          port: proxyToPort,                                                             // 905
          pathPrefix: proxyToPathPrefix                                                  // 906
        },                                                                               // 907
        requiresAuth: requiresHttpAuth                                                   // 908
      }, makeCallback());                                                                // 909
                                                                                         // 910
      // Only make the secure binding if we've been told that the                        // 911
      // proxy knows how terminate secure connections for us (has an                     // 912
      // appropriate cert, can bind the necessary port..)                                // 913
      if (proxyConfig.securePort !== null) {                                             // 914
        proxy.call('bindHttp', {                                                         // 915
          pid: pid,                                                                      // 916
          bindTo: {                                                                      // 917
            host: parsedUrl.hostname,                                                    // 918
            port: securePort,                                                            // 919
            pathPrefix: parsedUrl.pathname,                                              // 920
            ssl: true                                                                    // 921
          },                                                                             // 922
          proxyTo: {                                                                     // 923
            tags: [version],                                                             // 924
            host: proxyToHost,                                                           // 925
            port: proxyToPort,                                                           // 926
            pathPrefix: proxyToPathPrefix                                                // 927
          },                                                                             // 928
          requiresAuth: requiresHttpAuth                                                 // 929
        }, makeCallback());                                                              // 930
      }                                                                                  // 931
    }                                                                                    // 932
  });                                                                                    // 933
                                                                                         // 934
  startedAll = true;                                                                     // 935
  checkComplete();                                                                       // 936
};                                                                                       // 937
                                                                                         // 938
// (Internal, unsupported interface -- subject to change)                                // 939
//                                                                                       // 940
// Listen for HTTP and/or DDP traffic and route it somewhere. Only                       // 941
// takes effect when using a proxy service.                                              // 942
//                                                                                       // 943
// 'url' is the traffic that we want to route, interpreted relative to                   // 944
// the default URL where this app has been told to serve itself. It                      // 945
// may not have a scheme or port, but it may have a host and a path,                     // 946
// and if no host is provided the path need not be absolute. The                         // 947
// following cases are possible:                                                         // 948
//                                                                                       // 949
//   //somehost.com                                                                      // 950
//     All incoming traffic for 'somehost.com'                                           // 951
//   //somehost.com/foo/bar                                                              // 952
//     All incoming traffic for 'somehost.com', but only when                            // 953
//     the first two path components are 'foo' and 'bar'.                                // 954
//   /foo/bar                                                                            // 955
//     Incoming traffic on our default host, but only when the                           // 956
//     first two path components are 'foo' and 'bar'.                                    // 957
//   foo/bar                                                                             // 958
//     Incoming traffic on our default host, but only when the path                      // 959
//     starts with our default path prefix, followed by 'foo' and                        // 960
//     'bar'.                                                                            // 961
//                                                                                       // 962
// (Yes, these scheme-less URLs that start with '//' are legal URLs.)                    // 963
//                                                                                       // 964
// You can select either DDP traffic, HTTP traffic, or both. Both                        // 965
// secure and insecure traffic will be gathered (assuming the proxy                      // 966
// service is capable, eg, has appropriate certs and port mappings).                     // 967
//                                                                                       // 968
// With no 'forwardTo' option, the traffic is received by this process                   // 969
// for service by the hooks in this 'webapp' package. The original URL                   // 970
// is preserved (that is, if you bind "/a", and a user visits "/a/b",                    // 971
// the app receives a request with a path of "/a/b", not a path of                       // 972
// "/b").                                                                                // 973
//                                                                                       // 974
// With 'forwardTo', the process is instead sent to some other remote                    // 975
// host. The URL is adjusted by stripping the path components in 'url'                   // 976
// and putting the path components in the 'forwardTo' URL in their                       // 977
// place. For example, if you forward "//somehost/a" to                                  // 978
// "//otherhost/x", and the user types "//somehost/a/b" into their                       // 979
// browser, then otherhost will receive a request with a Host header                     // 980
// of "somehost" and a path of "/x/b".                                                   // 981
//                                                                                       // 982
// The routing continues until this process exits. For now, all of the                   // 983
// routes must be set up ahead of time, before the initial                               // 984
// registration with the proxy. Calling addRoute from the top level of                   // 985
// your JS should do the trick.                                                          // 986
//                                                                                       // 987
// When multiple routes are present that match a given request, the                      // 988
// most specific route wins. When routes with equal specificity are                      // 989
// present, the proxy service will distribute the traffic between                        // 990
// them.                                                                                 // 991
//                                                                                       // 992
// options may be:                                                                       // 993
// - ddp: if true, the default, include DDP traffic. This includes                       // 994
//   both secure and insecure traffic, and both websocket and sockjs                     // 995
//   transports.                                                                         // 996
// - http: if true, the default, include HTTP/HTTPS traffic.                             // 997
// - forwardTo: if provided, should be a URL with a host, optional                       // 998
//   path and port, and no scheme (the scheme will be derived from the                   // 999
//   traffic type; for now it will always be a http or ws connection,                    // 1000
//   never https or wss, but we could add a forwardSecure flag to                        // 1001
//   re-encrypt).                                                                        // 1002
var routes = [];                                                                         // 1003
WebAppInternals.addRoute = function (url, options) {                                     // 1004
  options = _.extend({                                                                   // 1005
    ddp: true,                                                                           // 1006
    http: true                                                                           // 1007
  }, options || {});                                                                     // 1008
                                                                                         // 1009
  if (proxy)                                                                             // 1010
    // In the future, lift this restriction                                              // 1011
    throw new Error("Too late to add routes");                                           // 1012
                                                                                         // 1013
  routes.push(_.extend({ url: url }, options));                                          // 1014
};                                                                                       // 1015
                                                                                         // 1016
// Receive traffic on our default URL.                                                   // 1017
WebAppInternals.addRoute("");                                                            // 1018
                                                                                         // 1019
runWebAppServer();                                                                       // 1020
                                                                                         // 1021
                                                                                         // 1022
var inlineScriptsAllowed = true;                                                         // 1023
                                                                                         // 1024
WebAppInternals.inlineScriptsAllowed = function () {                                     // 1025
  return inlineScriptsAllowed;                                                           // 1026
};                                                                                       // 1027
                                                                                         // 1028
WebAppInternals.setInlineScriptsAllowed = function (value) {                             // 1029
  inlineScriptsAllowed = value;                                                          // 1030
};                                                                                       // 1031
                                                                                         // 1032
WebAppInternals.setBundledJsCssPrefix = function (prefix) {                              // 1033
  bundledJsCssPrefix = prefix;                                                           // 1034
};                                                                                       // 1035
                                                                                         // 1036
// Packages can call `WebAppInternals.addStaticJs` to specify static                     // 1037
// JavaScript to be included in the app. This static JS will be inlined,                 // 1038
// unless inline scripts have been disabled, in which case it will be                    // 1039
// served under `/<sha1 of contents>`.                                                   // 1040
var additionalStaticJs = {};                                                             // 1041
WebAppInternals.addStaticJs = function (contents) {                                      // 1042
  additionalStaticJs["/" + sha1(contents) + ".js"] = contents;                           // 1043
};                                                                                       // 1044
                                                                                         // 1045
// Exported for tests                                                                    // 1046
WebAppInternals.getBoilerplate = getBoilerplate;                                         // 1047
WebAppInternals.additionalStaticJs = additionalStaticJs;                                 // 1048
                                                                                         // 1049
///////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package.webapp = {
  WebApp: WebApp,
  main: main,
  WebAppInternals: WebAppInternals
};

})();

//# sourceMappingURL=webapp.js.map
