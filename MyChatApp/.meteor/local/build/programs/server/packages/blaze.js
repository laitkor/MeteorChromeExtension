(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var Deps = Package.deps.Deps;
var _ = Package.underscore._;
var HTML = Package.htmljs.HTML;
var ObserveSequence = Package['observe-sequence'].ObserveSequence;

/* Package-scope variables */
var Blaze;

(function () {

////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                            //
// packages\blaze\preamble.js                                                                 //
//                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                              //
Blaze = {};                                                                                   // 1
                                                                                              // 2
////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                            //
// packages\blaze\exceptions.js                                                               //
//                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                              //
var debugFunc;                                                                                // 1
                                                                                              // 2
// We call into user code in many places, and it's nice to catch exceptions                   // 3
// propagated from user code immediately so that the whole system doesn't just                // 4
// break.  Catching exceptions is easy; reporting them is hard.  This helper                  // 5
// reports exceptions.                                                                        // 6
//                                                                                            // 7
// Usage:                                                                                     // 8
//                                                                                            // 9
// ```                                                                                        // 10
// try {                                                                                      // 11
//   // ... someStuff ...                                                                     // 12
// } catch (e) {                                                                              // 13
//   reportUIException(e);                                                                    // 14
// }                                                                                          // 15
// ```                                                                                        // 16
//                                                                                            // 17
// An optional second argument overrides the default message.                                 // 18
                                                                                              // 19
// Set this to `true` to cause `reportException` to throw                                     // 20
// the next exception rather than reporting it.  This is                                      // 21
// useful in unit tests that test error messages.                                             // 22
Blaze._throwNextException = false;                                                            // 23
                                                                                              // 24
Blaze.reportException = function (e, msg) {                                                   // 25
  if (Blaze._throwNextException) {                                                            // 26
    Blaze._throwNextException = false;                                                        // 27
    throw e;                                                                                  // 28
  }                                                                                           // 29
                                                                                              // 30
  if (! debugFunc)                                                                            // 31
    // adapted from Deps                                                                      // 32
    debugFunc = function () {                                                                 // 33
      return (typeof Meteor !== "undefined" ? Meteor._debug :                                 // 34
              ((typeof console !== "undefined") && console.log ? console.log :                // 35
               function () {}));                                                              // 36
    };                                                                                        // 37
                                                                                              // 38
  // In Chrome, `e.stack` is a multiline string that starts with the message                  // 39
  // and contains a stack trace.  Furthermore, `console.log` makes it clickable.              // 40
  // `console.log` supplies the space between the two arguments.                              // 41
  debugFunc()(msg || 'Exception caught in template:', e.stack || e.message);                  // 42
};                                                                                            // 43
                                                                                              // 44
Blaze.wrapCatchingExceptions = function (f, where) {                                          // 45
  if (typeof f !== 'function')                                                                // 46
    return f;                                                                                 // 47
                                                                                              // 48
  return function () {                                                                        // 49
    try {                                                                                     // 50
      return f.apply(this, arguments);                                                        // 51
    } catch (e) {                                                                             // 52
      Blaze.reportException(e, 'Exception in ' + where + ':');                                // 53
    }                                                                                         // 54
  };                                                                                          // 55
};                                                                                            // 56
                                                                                              // 57
////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                            //
// packages\blaze\reactivevar.js                                                              //
//                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                              //
/**                                                                                           // 1
 * ## [new] Blaze.ReactiveVar(initialValue, [equalsFunc])                                     // 2
 *                                                                                            // 3
 * A ReactiveVar holds a single value that can be get and set,                                // 4
 * such that calling `set` will invalidate any Computations that                              // 5
 * called `get`, according to the usual contract for reactive                                 // 6
 * data sources.                                                                              // 7
 *                                                                                            // 8
 * A ReactiveVar is much like a Session variable -- compare `foo.get()`                       // 9
 * to `Session.get("foo")` -- but it doesn't have a global name and isn't                     // 10
 * automatically migrated across hot code pushes.  Also, while Session                        // 11
 * variables can only hold JSON or EJSON, ReactiveVars can hold any value.                    // 12
 *                                                                                            // 13
 * An important property of ReactiveVars, which is sometimes the reason                       // 14
 * to use one, is that setting the value to the same value as before has                      // 15
 * no effect, meaning ReactiveVars can be used to absorb extra                                // 16
 * invalidations that wouldn't serve a purpose.  However, by default,                         // 17
 * ReactiveVars are extremely conservative about what changes they                            // 18
 * absorb.  Calling `set` with an object argument will *always* trigger                       // 19
 * invalidations, because even if the new value is `===` the old value,                       // 20
 * the object may have been mutated.  You can change the default behavior                     // 21
 * by passing a function of two arguments, `oldValue` and `newValue`,                         // 22
 * to the constructor as `equalsFunc`.                                                        // 23
 *                                                                                            // 24
 * This class is extremely basic right now, but the idea is to evolve                         // 25
 * it into the ReactiveVar of Geoff's Lickable Forms proposal.                                // 26
 */                                                                                           // 27
                                                                                              // 28
Blaze.ReactiveVar = function (initialValue, equalsFunc) {                                     // 29
  if (! (this instanceof Blaze.ReactiveVar))                                                  // 30
    // called without `new`                                                                   // 31
    return new Blaze.ReactiveVar(initialValue, equalsFunc);                                   // 32
                                                                                              // 33
  this.curValue = initialValue;                                                               // 34
  this.equalsFunc = equalsFunc;                                                               // 35
  this.dep = new Deps.Dependency;                                                             // 36
};                                                                                            // 37
                                                                                              // 38
Blaze.ReactiveVar._isEqual = function (oldValue, newValue) {                                  // 39
  var a = oldValue, b = newValue;                                                             // 40
  // Two values are "equal" here if they are `===` and are                                    // 41
  // number, boolean, string, undefined, or null.                                             // 42
  if (a !== b)                                                                                // 43
    return false;                                                                             // 44
  else                                                                                        // 45
    return ((!a) || (typeof a === 'number') || (typeof a === 'boolean') ||                    // 46
            (typeof a === 'string'));                                                         // 47
};                                                                                            // 48
                                                                                              // 49
Blaze.ReactiveVar.prototype.get = function () {                                               // 50
  if (Deps.active)                                                                            // 51
    this.dep.depend();                                                                        // 52
                                                                                              // 53
  return this.curValue;                                                                       // 54
};                                                                                            // 55
                                                                                              // 56
Blaze.ReactiveVar.prototype.set = function (newValue) {                                       // 57
  var oldValue = this.curValue;                                                               // 58
                                                                                              // 59
  if ((this.equalsFunc || Blaze.ReactiveVar._isEqual)(oldValue, newValue))                    // 60
    // value is same as last time                                                             // 61
    return;                                                                                   // 62
                                                                                              // 63
  this.curValue = newValue;                                                                   // 64
  this.dep.changed();                                                                         // 65
};                                                                                            // 66
                                                                                              // 67
Blaze.ReactiveVar.prototype.toString = function () {                                          // 68
  return 'ReactiveVar{' + this.get() + '}';                                                   // 69
};                                                                                            // 70
                                                                                              // 71
////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                            //
// packages\blaze\view.js                                                                     //
//                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                              //
/// [new] Blaze.View([kind], renderMethod)                                                    // 1
///                                                                                           // 2
/// Blaze.View is the building block of reactive DOM.  Views have                             // 3
/// the following features:                                                                   // 4
///                                                                                           // 5
/// * lifecycle callbacks - Views are created, rendered, and destroyed,                       // 6
///   and callbacks can be registered to fire when these things happen.                       // 7
///                                                                                           // 8
/// * parent pointer - A View points to its parentView, which is the                          // 9
///   View that caused it to be rendered.  These pointers form a                              // 10
///   hierarchy or tree of Views.                                                             // 11
///                                                                                           // 12
/// * render() method - A View's render() method specifies the DOM                            // 13
///   (or HTML) content of the View.  If the method establishes                               // 14
///   reactive dependencies, it may be re-run.                                                // 15
///                                                                                           // 16
/// * a DOMRange - If a View is rendered to DOM, its position and                             // 17
///   extent in the DOM are tracked using a DOMRange object.                                  // 18
///                                                                                           // 19
/// When a View is constructed by calling Blaze.View, the View is                             // 20
/// not yet considered "created."  It doesn't have a parentView yet,                          // 21
/// and no logic has been run to initialize the View.  All real                               // 22
/// work is deferred until at least creation time, when the onCreated                         // 23
/// callbacks are fired, which happens when the View is "used" in                             // 24
/// some way that requires it to be rendered.                                                 // 25
///                                                                                           // 26
/// ...more lifecycle stuff                                                                   // 27
///                                                                                           // 28
/// `kind` is an optional string tag identifying the View.  The only                          // 29
/// time it's used is when looking in the View tree for a View of a                           // 30
/// particular kind; for example, data contexts are stored on Views                           // 31
/// of kind "with".  Kinds are also useful when debugging, so in                              // 32
/// general it's good for functions that create Views to set the kind.                        // 33
/// Templates have kinds of the form "Template.foo".                                          // 34
Blaze.View = function (kind, render) {                                                        // 35
  if (! (this instanceof Blaze.View))                                                         // 36
    // called without `new`                                                                   // 37
    return new Blaze.View(kind, render);                                                      // 38
                                                                                              // 39
  if (typeof kind === 'function') {                                                           // 40
    // omitted "kind" argument                                                                // 41
    render = kind;                                                                            // 42
    kind = '';                                                                                // 43
  }                                                                                           // 44
  this.kind = kind;                                                                           // 45
  this.render = render;                                                                       // 46
                                                                                              // 47
  this._callbacks = {                                                                         // 48
    created: null,                                                                            // 49
    materialized: null,                                                                       // 50
    rendered: null,                                                                           // 51
    destroyed: null                                                                           // 52
  };                                                                                          // 53
                                                                                              // 54
  // Setting all properties here is good for readability,                                     // 55
  // and also may help Chrome optimize the code by keeping                                    // 56
  // the View object from changing shape too much.                                            // 57
  this.isCreated = false;                                                                     // 58
  this.isCreatedForExpansion = false;                                                         // 59
  this.isDestroyed = false;                                                                   // 60
  this.isInRender = false;                                                                    // 61
  this.parentView = null;                                                                     // 62
  this.domrange = null;                                                                       // 63
                                                                                              // 64
  this.renderCount = 0;                                                                       // 65
};                                                                                            // 66
                                                                                              // 67
Blaze.View.prototype.render = function () { return null; };                                   // 68
                                                                                              // 69
Blaze.View.prototype.onCreated = function (cb) {                                              // 70
  this._callbacks.created = this._callbacks.created || [];                                    // 71
  this._callbacks.created.push(cb);                                                           // 72
};                                                                                            // 73
Blaze.View.prototype.onMaterialized = function (cb) {                                         // 74
  this._callbacks.materialized = this._callbacks.materialized || [];                          // 75
  this._callbacks.materialized.push(cb);                                                      // 76
};                                                                                            // 77
Blaze.View.prototype.onRendered = function (cb) {                                             // 78
  this._callbacks.rendered = this._callbacks.rendered || [];                                  // 79
  this._callbacks.rendered.push(cb);                                                          // 80
};                                                                                            // 81
Blaze.View.prototype.onDestroyed = function (cb) {                                            // 82
  this._callbacks.destroyed = this._callbacks.destroyed || [];                                // 83
  this._callbacks.destroyed.push(cb);                                                         // 84
};                                                                                            // 85
                                                                                              // 86
/// View#autorun(func)                                                                        // 87
///                                                                                           // 88
/// Sets up a Deps autorun that is "scoped" to this View in two                               // 89
/// important ways: 1) Blaze.currentView is automatically set                                 // 90
/// on every re-run, and 2) the autorun is stopped when the                                   // 91
/// View is destroyed.  As with Deps.autorun, the first run of                                // 92
/// the function is immediate, and a Computation object that can                              // 93
/// be used to stop the autorun is returned.                                                  // 94
///                                                                                           // 95
/// View#autorun is meant to be called from View callbacks like                               // 96
/// onCreated, or from outside the rendering process.  It may not                             // 97
/// be called before the onCreated callbacks are fired (too early),                           // 98
/// or from a render() method (too confusing).                                                // 99
///                                                                                           // 100
/// Typically, autoruns that update the state                                                 // 101
/// of the View (as in Blaze.With) should be started from an onCreated                        // 102
/// callback.  Autoruns that update the DOM should be started                                 // 103
/// from either onCreated (guarded against the absence of                                     // 104
/// view.domrange), onMaterialized, or onRendered.                                            // 105
Blaze.View.prototype.autorun = function (f, _inViewScope) {                                   // 106
  var self = this;                                                                            // 107
                                                                                              // 108
  // The restrictions on when View#autorun can be called are in order                         // 109
  // to avoid bad patterns, like creating a Blaze.View and immediately                        // 110
  // calling autorun on it.  A freshly created View is not ready to                           // 111
  // have logic run on it; it doesn't have a parentView, for example.                         // 112
  // It's when the View is materialized or expanded that the onCreated                        // 113
  // handlers are fired and the View starts up.                                               // 114
  //                                                                                          // 115
  // Letting the render() method call `this.autorun()` is problematic                         // 116
  // because of re-render.  The best we can do is to stop the old                             // 117
  // autorun and start a new one for each render, but that's a pattern                        // 118
  // we try to avoid internally because it leads to helpers being                             // 119
  // called extra times, in the case where the autorun causes the                             // 120
  // view to re-render (and thus the autorun to be torn down and a                            // 121
  // new one established).                                                                    // 122
  //                                                                                          // 123
  // We could lift these restrictions in various ways.  One interesting                       // 124
  // idea is to allow you to call `view.autorun` after instantiating                          // 125
  // `view`, and automatically wrap it in `view.onCreated`, deferring                         // 126
  // the autorun so that it starts at an appropriate time.  However,                          // 127
  // then we can't return the Computation object to the caller, because                       // 128
  // it doesn't exist yet.                                                                    // 129
  if (! self.isCreated) {                                                                     // 130
    throw new Error("View#autorun must be called from the created callback at the earliest"); // 131
  }                                                                                           // 132
  if (this.isInRender) {                                                                      // 133
    throw new Error("Can't call View#autorun from inside render(); try calling it from the created or rendered callback");
  }                                                                                           // 135
  if (Deps.active) {                                                                          // 136
    throw new Error("Can't call View#autorun from a Deps Computation; try calling it from the created or rendered callback");
  }                                                                                           // 138
                                                                                              // 139
  var c = Deps.autorun(function viewAutorun(c) {                                              // 140
    return Blaze.withCurrentView(_inViewScope || self, function () {                          // 141
      return f.call(self, c);                                                                 // 142
    });                                                                                       // 143
  });                                                                                         // 144
  self.onDestroyed(function () { c.stop(); });                                                // 145
                                                                                              // 146
  return c;                                                                                   // 147
};                                                                                            // 148
                                                                                              // 149
Blaze._fireCallbacks = function (view, which) {                                               // 150
  Blaze.withCurrentView(view, function () {                                                   // 151
    Deps.nonreactive(function fireCallbacks() {                                               // 152
      var cbs = view._callbacks[which];                                                       // 153
      for (var i = 0, N = (cbs && cbs.length); i < N; i++)                                    // 154
        cbs[i].call(view);                                                                    // 155
    });                                                                                       // 156
  });                                                                                         // 157
};                                                                                            // 158
                                                                                              // 159
Blaze.materializeView = function (view, parentView) {                                         // 160
  view.parentView = (parentView || null);                                                     // 161
                                                                                              // 162
  if (view.isCreated)                                                                         // 163
    throw new Error("Can't render the same View twice");                                      // 164
  view.isCreated = true;                                                                      // 165
                                                                                              // 166
  Blaze._fireCallbacks(view, 'created');                                                      // 167
                                                                                              // 168
  var domrange;                                                                               // 169
                                                                                              // 170
  var needsRenderedCallback = false;                                                          // 171
  var scheduleRenderedCallback = function () {                                                // 172
    if (needsRenderedCallback && ! view.isDestroyed &&                                        // 173
        view._callbacks.rendered && view._callbacks.rendered.length) {                        // 174
      Deps.afterFlush(function callRendered() {                                               // 175
        if (needsRenderedCallback && ! view.isDestroyed) {                                    // 176
          needsRenderedCallback = false;                                                      // 177
          Blaze._fireCallbacks(view, 'rendered');                                             // 178
        }                                                                                     // 179
      });                                                                                     // 180
    }                                                                                         // 181
  };                                                                                          // 182
                                                                                              // 183
  var lastHtmljs;                                                                             // 184
  // We don't expect to be called in a Computation, but just in case,                         // 185
  // wrap in Deps.nonreactive.                                                                // 186
  Deps.nonreactive(function () {                                                              // 187
    view.autorun(function doRender(c) {                                                       // 188
      // `view.autorun` sets the current view.                                                // 189
      // Any dependencies that should invalidate this Computation come                        // 190
      // from this line:                                                                      // 191
      view.renderCount++;                                                                     // 192
      view.isInRender = true;                                                                 // 193
      var htmljs = view.render();                                                             // 194
      view.isInRender = false;                                                                // 195
                                                                                              // 196
      Deps.nonreactive(function doMaterialize() {                                             // 197
        var materializer = new Blaze.DOMMaterializer({parentView: view});                     // 198
        var rangesAndNodes = materializer.visit(htmljs, []);                                  // 199
        if (c.firstRun || ! Blaze._isContentEqual(lastHtmljs, htmljs)) {                      // 200
          if (c.firstRun) {                                                                   // 201
            domrange = new Blaze.DOMRange(rangesAndNodes);                                    // 202
            view.domrange = domrange;                                                         // 203
            domrange.view = view;                                                             // 204
          } else {                                                                            // 205
            domrange.setMembers(rangesAndNodes);                                              // 206
          }                                                                                   // 207
          Blaze._fireCallbacks(view, 'materialized');                                         // 208
          needsRenderedCallback = true;                                                       // 209
          if (! c.firstRun)                                                                   // 210
            scheduleRenderedCallback();                                                       // 211
        }                                                                                     // 212
      });                                                                                     // 213
      lastHtmljs = htmljs;                                                                    // 214
                                                                                              // 215
      // Causes any nested views to stop immediately, not when we call                        // 216
      // `setMembers` the next time around the autorun.  Otherwise,                           // 217
      // helpers in the DOM tree to be replaced might be scheduled                            // 218
      // to re-run before we have a chance to stop them.                                      // 219
      Deps.onInvalidate(function () {                                                         // 220
        domrange.destroyMembers();                                                            // 221
      });                                                                                     // 222
    });                                                                                       // 223
                                                                                              // 224
    var teardownHook = null;                                                                  // 225
                                                                                              // 226
    domrange.onAttached(function attached(range, element) {                                   // 227
      teardownHook = Blaze.DOMBackend.Teardown.onElementTeardown(                             // 228
        element, function teardown() {                                                        // 229
          Blaze.destroyView(view, true /* _skipNodes */);                                     // 230
        });                                                                                   // 231
                                                                                              // 232
      scheduleRenderedCallback();                                                             // 233
    });                                                                                       // 234
                                                                                              // 235
    // tear down the teardown hook                                                            // 236
    view.onDestroyed(function () {                                                            // 237
      teardownHook && teardownHook.stop();                                                    // 238
      teardownHook = null;                                                                    // 239
    });                                                                                       // 240
  });                                                                                         // 241
                                                                                              // 242
  return domrange;                                                                            // 243
};                                                                                            // 244
                                                                                              // 245
// Expands a View to HTMLjs, calling `render` recursively on all                              // 246
// Views and evaluating any dynamic attributes.  Calls the `created`                          // 247
// callback, but not the `materialized` or `rendered` callbacks.                              // 248
// Destroys the view immediately, unless called in a Deps Computation,                        // 249
// in which case the view will be destroyed when the Computation is                           // 250
// invalidated.  If called in a Deps Computation, the result is a                             // 251
// reactive string; that is, the Computation will be invalidated                              // 252
// if any changes are made to the view or subviews that might affect                          // 253
// the HTML.                                                                                  // 254
Blaze._expandView = function (view, parentView) {                                             // 255
  view.parentView = (parentView || null);                                                     // 256
                                                                                              // 257
  if (view.isCreated)                                                                         // 258
    throw new Error("Can't render the same View twice");                                      // 259
  view.isCreated = true;                                                                      // 260
  view.isCreatedForExpansion = true;                                                          // 261
                                                                                              // 262
  Blaze._fireCallbacks(view, 'created');                                                      // 263
                                                                                              // 264
  view.isInRender = true;                                                                     // 265
  var htmljs = Blaze.withCurrentView(view, function () {                                      // 266
    return view.render();                                                                     // 267
  });                                                                                         // 268
  view.isInRender = false;                                                                    // 269
                                                                                              // 270
  var result = Blaze._expand(htmljs, view);                                                   // 271
                                                                                              // 272
  if (Deps.active) {                                                                          // 273
    Deps.onInvalidate(function () {                                                           // 274
      Blaze.destroyView(view);                                                                // 275
    });                                                                                       // 276
  } else {                                                                                    // 277
    Blaze.destroyView(view);                                                                  // 278
  }                                                                                           // 279
                                                                                              // 280
  return result;                                                                              // 281
};                                                                                            // 282
                                                                                              // 283
// Options: `parentView`                                                                      // 284
Blaze.HTMLJSExpander = HTML.TransformingVisitor.extend();                                     // 285
Blaze.HTMLJSExpander.def({                                                                    // 286
  visitObject: function (x) {                                                                 // 287
    if (Blaze.isTemplate(x))                                                                  // 288
      x = Blaze.runTemplate(x);                                                               // 289
    if (x instanceof Blaze.View)                                                              // 290
      return Blaze._expandView(x, this.parentView);                                           // 291
                                                                                              // 292
    // this will throw an error; other objects are not allowed!                               // 293
    return HTML.TransformingVisitor.prototype.visitObject.call(this, x);                      // 294
  },                                                                                          // 295
  visitAttributes: function (attrs) {                                                         // 296
    // expand dynamic attributes                                                              // 297
    if (typeof attrs === 'function')                                                          // 298
      attrs = Blaze.withCurrentView(this.parentView, attrs);                                  // 299
                                                                                              // 300
    // call super (e.g. for case where `attrs` is an array)                                   // 301
    return HTML.TransformingVisitor.prototype.visitAttributes.call(this, attrs);              // 302
  },                                                                                          // 303
  visitAttribute: function (name, value, tag) {                                               // 304
    // expand attribute values that are functions.  Any attribute value                       // 305
    // that contains Views must be wrapped in a function.                                     // 306
    if (typeof value === 'function')                                                          // 307
      value = Blaze.withCurrentView(this.parentView, value);                                  // 308
                                                                                              // 309
    return HTML.TransformingVisitor.prototype.visitAttribute.call(                            // 310
      this, name, value, tag);                                                                // 311
  }                                                                                           // 312
});                                                                                           // 313
                                                                                              // 314
// Return Blaze.currentView, but only if it is being rendered                                 // 315
// (i.e. we are in its render() method).                                                      // 316
var currentViewIfRendering = function () {                                                    // 317
  var view = Blaze.currentView;                                                               // 318
  return (view && view.isInRender) ? view : null;                                             // 319
};                                                                                            // 320
                                                                                              // 321
Blaze._expand = function (htmljs, parentView) {                                               // 322
  parentView = parentView || currentViewIfRendering();                                        // 323
  return (new Blaze.HTMLJSExpander(                                                           // 324
    {parentView: parentView})).visit(htmljs);                                                 // 325
};                                                                                            // 326
                                                                                              // 327
Blaze._expandAttributes = function (attrs, parentView) {                                      // 328
  parentView = parentView || currentViewIfRendering();                                        // 329
  return (new Blaze.HTMLJSExpander(                                                           // 330
    {parentView: parentView})).visitAttributes(attrs);                                        // 331
};                                                                                            // 332
                                                                                              // 333
Blaze.destroyView = function (view, _skipNodes) {                                             // 334
  if (view.isDestroyed)                                                                       // 335
    return;                                                                                   // 336
  view.isDestroyed = true;                                                                    // 337
                                                                                              // 338
  Blaze._fireCallbacks(view, 'destroyed');                                                    // 339
                                                                                              // 340
  // Destroy views and elements recursively.  If _skipNodes,                                  // 341
  // only recurse up to views, not elements, for the case where                               // 342
  // the backend (jQuery) is recursing over the elements already.                             // 343
                                                                                              // 344
  if (view.domrange)                                                                          // 345
    view.domrange.destroyMembers();                                                           // 346
};                                                                                            // 347
                                                                                              // 348
Blaze.destroyNode = function (node) {                                                         // 349
  if (node.nodeType === 1)                                                                    // 350
    Blaze.DOMBackend.Teardown.tearDownElement(node);                                          // 351
};                                                                                            // 352
                                                                                              // 353
// Are the HTMLjs entities `a` and `b` the same?  We could be                                 // 354
// more elaborate here but the point is to catch the most basic                               // 355
// cases.                                                                                     // 356
Blaze._isContentEqual = function (a, b) {                                                     // 357
  if (a instanceof HTML.Raw) {                                                                // 358
    return (b instanceof HTML.Raw) && (a.value === b.value);                                  // 359
  } else if (a == null) {                                                                     // 360
    return (b == null);                                                                       // 361
  } else {                                                                                    // 362
    return (a === b) &&                                                                       // 363
      ((typeof a === 'number') || (typeof a === 'boolean') ||                                 // 364
       (typeof a === 'string'));                                                              // 365
  }                                                                                           // 366
};                                                                                            // 367
                                                                                              // 368
Blaze.currentView = null;                                                                     // 369
                                                                                              // 370
Blaze.withCurrentView = function (view, func) {                                               // 371
  var oldView = Blaze.currentView;                                                            // 372
  try {                                                                                       // 373
    Blaze.currentView = view;                                                                 // 374
    return func();                                                                            // 375
  } finally {                                                                                 // 376
    Blaze.currentView = oldView;                                                              // 377
  }                                                                                           // 378
};                                                                                            // 379
                                                                                              // 380
Blaze.isTemplate = function (t) {                                                             // 381
  return t && (typeof t.__makeView === 'function');                                           // 382
};                                                                                            // 383
                                                                                              // 384
Blaze.runTemplate = function (t/*, args*/) {                                                  // 385
  if (! Blaze.isTemplate(t))                                                                  // 386
    throw new Error("Not a template: " + t);                                                  // 387
  var restArgs = Array.prototype.slice.call(arguments, 1);                                    // 388
  return t.__makeView.apply(t, restArgs);                                                     // 389
};                                                                                            // 390
                                                                                              // 391
Blaze.render = function (content, parentView) {                                               // 392
  parentView = parentView || currentViewIfRendering();                                        // 393
                                                                                              // 394
  var view;                                                                                   // 395
  if (typeof content === 'function') {                                                        // 396
    view = Blaze.View('render', content);                                                     // 397
  } else if (Blaze.isTemplate(content)) {                                                     // 398
    view = Blaze.runTemplate(content);                                                        // 399
  } else {                                                                                    // 400
    if (! (content instanceof Blaze.View))                                                    // 401
      throw new Error("Expected a function, template, or View in Blaze.render");              // 402
    view = content;                                                                           // 403
  }                                                                                           // 404
  return Blaze.materializeView(view, parentView);                                             // 405
};                                                                                            // 406
                                                                                              // 407
Blaze.toHTML = function (htmljs, parentView) {                                                // 408
  if (typeof htmljs === 'function')                                                           // 409
    throw new Error("Blaze.toHTML doesn't take a function, just HTMLjs");                     // 410
  parentView = parentView || currentViewIfRendering();                                        // 411
  return HTML.toHTML(Blaze._expand(htmljs, parentView));                                      // 412
};                                                                                            // 413
                                                                                              // 414
Blaze.toText = function (htmljs, parentView, textMode) {                                      // 415
  if (typeof htmljs === 'function')                                                           // 416
    throw new Error("Blaze.toText doesn't take a function, just HTMLjs");                     // 417
                                                                                              // 418
  if ((parentView != null) && ! (parentView instanceof Blaze.View)) {                         // 419
    // omitted parentView argument                                                            // 420
    textMode = parentView;                                                                    // 421
    parentView = null;                                                                        // 422
  }                                                                                           // 423
  parentView = parentView || currentViewIfRendering();                                        // 424
                                                                                              // 425
  if (! textMode)                                                                             // 426
    throw new Error("textMode required");                                                     // 427
  if (! (textMode === HTML.TEXTMODE.STRING ||                                                 // 428
         textMode === HTML.TEXTMODE.RCDATA ||                                                 // 429
         textMode === HTML.TEXTMODE.ATTRIBUTE))                                               // 430
    throw new Error("Unknown textMode: " + textMode);                                         // 431
                                                                                              // 432
  return HTML.toText(Blaze._expand(htmljs, parentView), textMode);                            // 433
};                                                                                            // 434
                                                                                              // 435
Blaze.getCurrentData = function () {                                                          // 436
  var theWith = Blaze.getCurrentView('with');                                                 // 437
  return theWith ? theWith.dataVar.get() : null;                                              // 438
};                                                                                            // 439
                                                                                              // 440
// Gets the current view or its nearest ancestor of kind                                      // 441
// `kind`.                                                                                    // 442
Blaze.getCurrentView = function (kind) {                                                      // 443
  var view = Blaze.currentView;                                                               // 444
  // Better to fail in cases where it doesn't make sense                                      // 445
  // to use Blaze.getCurrentView().  There will be a current                                  // 446
  // view anywhere it does.  You can check Blaze.currentView                                  // 447
  // if you want to know whether there is one or not.                                         // 448
  if (! view)                                                                                 // 449
    throw new Error("There is no current view");                                              // 450
                                                                                              // 451
  if (kind) {                                                                                 // 452
    while (view && view.kind !== kind)                                                        // 453
      view = view.parentView;                                                                 // 454
    return view || null;                                                                      // 455
  } else {                                                                                    // 456
    // Blaze.getCurrentView() with no arguments just returns                                  // 457
    // Blaze.currentView.                                                                     // 458
    return view;                                                                              // 459
  }                                                                                           // 460
};                                                                                            // 461
                                                                                              // 462
// Gets the nearest ancestor view that corresponds to a template                              // 463
Blaze.getCurrentTemplateView = function () {                                                  // 464
  var view = Blaze.getCurrentView();                                                          // 465
                                                                                              // 466
  while (view && ! view.template)                                                             // 467
    view = view.parentView;                                                                   // 468
                                                                                              // 469
  return view || null;                                                                        // 470
};                                                                                            // 471
                                                                                              // 472
Blaze.getParentView = function (view, kind) {                                                 // 473
  var v = view.parentView;                                                                    // 474
                                                                                              // 475
  if (kind) {                                                                                 // 476
    while (v && v.kind !== kind)                                                              // 477
      v = v.parentView;                                                                       // 478
  }                                                                                           // 479
                                                                                              // 480
  return v || null;                                                                           // 481
};                                                                                            // 482
                                                                                              // 483
Blaze.getElementView = function (elem, kind) {                                                // 484
  var range = Blaze.DOMRange.forElement(elem);                                                // 485
  var view = null;                                                                            // 486
  while (range && ! view) {                                                                   // 487
    view = (range.view || null);                                                              // 488
    if (! view) {                                                                             // 489
      if (range.parentRange)                                                                  // 490
        range = range.parentRange;                                                            // 491
      else                                                                                    // 492
        range = Blaze.DOMRange.forElement(range.parentElement);                               // 493
    }                                                                                         // 494
  }                                                                                           // 495
                                                                                              // 496
  if (kind) {                                                                                 // 497
    while (view && view.kind !== kind)                                                        // 498
      view = view.parentView;                                                                 // 499
    return view || null;                                                                      // 500
  } else {                                                                                    // 501
    return view;                                                                              // 502
  }                                                                                           // 503
};                                                                                            // 504
                                                                                              // 505
Blaze.getElementData = function (elem) {                                                      // 506
  var theWith = Blaze.getElementView(elem, 'with');                                           // 507
  return theWith ? theWith.dataVar.get() : null;                                              // 508
};                                                                                            // 509
                                                                                              // 510
Blaze.getViewData = function (view) {                                                         // 511
  var theWith = Blaze.getParentView(view, 'with');                                            // 512
  return theWith ? theWith.dataVar.get() : null;                                              // 513
};                                                                                            // 514
                                                                                              // 515
Blaze._addEventMap = function (view, eventMap, thisInHandler) {                               // 516
  thisInHandler = (thisInHandler || null);                                                    // 517
  var handles = [];                                                                           // 518
                                                                                              // 519
  if (! view.domrange)                                                                        // 520
    throw new Error("View must have a DOMRange");                                             // 521
                                                                                              // 522
  view.domrange.onAttached(function attached_eventMaps(range, element) {                      // 523
    _.each(eventMap, function (handler, spec) {                                               // 524
      var clauses = spec.split(/,\s+/);                                                       // 525
      // iterate over clauses of spec, e.g. ['click .foo', 'click .bar']                      // 526
      _.each(clauses, function (clause) {                                                     // 527
        var parts = clause.split(/\s+/);                                                      // 528
        if (parts.length === 0)                                                               // 529
          return;                                                                             // 530
                                                                                              // 531
        var newEvents = parts.shift();                                                        // 532
        var selector = parts.join(' ');                                                       // 533
        handles.push(Blaze.EventSupport.listen(                                               // 534
          element, newEvents, selector,                                                       // 535
          function (evt) {                                                                    // 536
            if (! range.containsElement(evt.currentTarget))                                   // 537
              return null;                                                                    // 538
            var handlerThis = thisInHandler || this;                                          // 539
            var handlerArgs = arguments;                                                      // 540
            return Blaze.withCurrentView(view, function () {                                  // 541
              return handler.apply(handlerThis, handlerArgs);                                 // 542
            });                                                                               // 543
          },                                                                                  // 544
          range, function (r) {                                                               // 545
            return r.parentRange;                                                             // 546
          }));                                                                                // 547
      });                                                                                     // 548
    });                                                                                       // 549
  });                                                                                         // 550
                                                                                              // 551
  view.onDestroyed(function () {                                                              // 552
    _.each(handles, function (h) {                                                            // 553
      h.stop();                                                                               // 554
    });                                                                                       // 555
    handles.length = 0;                                                                       // 556
  });                                                                                         // 557
};                                                                                            // 558
                                                                                              // 559
////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                            //
// packages\blaze\builtins.js                                                                 //
//                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                              //
Blaze._calculateCondition = function (cond) {                                                 // 1
  if (cond instanceof Array && cond.length === 0)                                             // 2
    cond = false;                                                                             // 3
  return !! cond;                                                                             // 4
};                                                                                            // 5
                                                                                              // 6
Blaze.With = function (data, contentFunc) {                                                   // 7
  var view = Blaze.View('with', contentFunc);                                                 // 8
                                                                                              // 9
  view.dataVar = new Blaze.ReactiveVar;                                                       // 10
                                                                                              // 11
  view.onCreated(function () {                                                                // 12
    if (typeof data === 'function') {                                                         // 13
      // `data` is a reactive function                                                        // 14
      view.autorun(function () {                                                              // 15
        view.dataVar.set(data());                                                             // 16
      }, view.parentView);                                                                    // 17
    } else {                                                                                  // 18
      view.dataVar.set(data);                                                                 // 19
    }                                                                                         // 20
  });                                                                                         // 21
                                                                                              // 22
  return view;                                                                                // 23
};                                                                                            // 24
                                                                                              // 25
Blaze.If = function (conditionFunc, contentFunc, elseFunc, _not) {                            // 26
  var conditionVar = new Blaze.ReactiveVar;                                                   // 27
                                                                                              // 28
  var view = Blaze.View(_not ? 'unless' : 'if', function () {                                 // 29
    return conditionVar.get() ? contentFunc() :                                               // 30
      (elseFunc ? elseFunc() : null);                                                         // 31
  });                                                                                         // 32
  view.__conditionVar = conditionVar;                                                         // 33
  view.onCreated(function () {                                                                // 34
    this.autorun(function () {                                                                // 35
      var cond = Blaze._calculateCondition(conditionFunc());                                  // 36
      conditionVar.set(_not ? (! cond) : cond);                                               // 37
    }, this.parentView);                                                                      // 38
  });                                                                                         // 39
                                                                                              // 40
  return view;                                                                                // 41
};                                                                                            // 42
                                                                                              // 43
Blaze.Unless = function (conditionFunc, contentFunc, elseFunc) {                              // 44
  return Blaze.If(conditionFunc, contentFunc, elseFunc, true /*_not*/);                       // 45
};                                                                                            // 46
                                                                                              // 47
Blaze.Each = function (argFunc, contentFunc, elseFunc) {                                      // 48
  var eachView = Blaze.View('each', function () {                                             // 49
    var subviews = this.initialSubviews;                                                      // 50
    this.initialSubviews = null;                                                              // 51
    if (this.isCreatedForExpansion) {                                                         // 52
      this.expandedValueDep = new Deps.Dependency;                                            // 53
      this.expandedValueDep.depend();                                                         // 54
    }                                                                                         // 55
    return subviews;                                                                          // 56
  });                                                                                         // 57
  eachView.initialSubviews = [];                                                              // 58
  eachView.numItems = 0;                                                                      // 59
  eachView.inElseMode = false;                                                                // 60
  eachView.stopHandle = null;                                                                 // 61
  eachView.contentFunc = contentFunc;                                                         // 62
  eachView.elseFunc = elseFunc;                                                               // 63
  eachView.argVar = new Blaze.ReactiveVar;                                                    // 64
                                                                                              // 65
  eachView.onCreated(function () {                                                            // 66
    // We evaluate argFunc in an autorun to make sure                                         // 67
    // Blaze.currentView is always set when it runs (rather than                              // 68
    // passing argFunc straight to ObserveSequence).                                          // 69
    eachView.autorun(function () {                                                            // 70
      eachView.argVar.set(argFunc());                                                         // 71
    }, eachView.parentView);                                                                  // 72
                                                                                              // 73
    eachView.stopHandle = ObserveSequence.observe(function () {                               // 74
      return eachView.argVar.get();                                                           // 75
    }, {                                                                                      // 76
      addedAt: function (id, item, index) {                                                   // 77
        Deps.nonreactive(function () {                                                        // 78
          var newItemView = Blaze.With(item, eachView.contentFunc);                           // 79
          eachView.numItems++;                                                                // 80
                                                                                              // 81
          if (eachView.expandedValueDep) {                                                    // 82
            eachView.expandedValueDep.changed();                                              // 83
          } else if (eachView.domrange) {                                                     // 84
            if (eachView.inElseMode) {                                                        // 85
              eachView.domrange.removeMember(0);                                              // 86
              eachView.inElseMode = false;                                                    // 87
            }                                                                                 // 88
                                                                                              // 89
            var range = Blaze.materializeView(newItemView, eachView);                         // 90
            eachView.domrange.addMember(range, index);                                        // 91
          } else {                                                                            // 92
            eachView.initialSubviews.splice(index, 0, newItemView);                           // 93
          }                                                                                   // 94
        });                                                                                   // 95
      },                                                                                      // 96
      removedAt: function (id, item, index) {                                                 // 97
        Deps.nonreactive(function () {                                                        // 98
          eachView.numItems--;                                                                // 99
          if (eachView.expandedValueDep) {                                                    // 100
            eachView.expandedValueDep.changed();                                              // 101
          } else if (eachView.domrange) {                                                     // 102
            eachView.domrange.removeMember(index);                                            // 103
            if (eachView.elseFunc && eachView.numItems === 0) {                               // 104
              eachView.inElseMode = true;                                                     // 105
              eachView.domrange.addMember(                                                    // 106
                Blaze.materializeView(                                                        // 107
                  Blaze.View('each_else',eachView.elseFunc),                                  // 108
                  eachView), 0);                                                              // 109
            }                                                                                 // 110
          } else {                                                                            // 111
            eachView.initialSubviews.splice(index, 1);                                        // 112
          }                                                                                   // 113
        });                                                                                   // 114
      },                                                                                      // 115
      changedAt: function (id, newItem, oldItem, index) {                                     // 116
        Deps.nonreactive(function () {                                                        // 117
          var itemView;                                                                       // 118
          if (eachView.expandedValueDep) {                                                    // 119
            eachView.expandedValueDep.changed();                                              // 120
          } else if (eachView.domrange) {                                                     // 121
            itemView = eachView.domrange.getMember(index).view;                               // 122
          } else {                                                                            // 123
            itemView = eachView.initialSubviews[index];                                       // 124
          }                                                                                   // 125
          itemView.dataVar.set(newItem);                                                      // 126
        });                                                                                   // 127
      },                                                                                      // 128
      movedTo: function (id, item, fromIndex, toIndex) {                                      // 129
        Deps.nonreactive(function () {                                                        // 130
          if (eachView.expandedValueDep) {                                                    // 131
            eachView.expandedValueDep.changed();                                              // 132
          } else if (eachView.domrange) {                                                     // 133
            eachView.domrange.moveMember(fromIndex, toIndex);                                 // 134
          } else {                                                                            // 135
            var subviews = eachView.initialSubviews;                                          // 136
            var itemView = subviews[fromIndex];                                               // 137
            subviews.splice(fromIndex, 1);                                                    // 138
            subviews.splice(toIndex, 0, itemView);                                            // 139
          }                                                                                   // 140
        });                                                                                   // 141
      }                                                                                       // 142
    });                                                                                       // 143
                                                                                              // 144
    if (eachView.elseFunc && eachView.numItems === 0) {                                       // 145
      eachView.inElseMode = true;                                                             // 146
      eachView.initialSubviews[0] =                                                           // 147
        Blaze.View('each_else', eachView.elseFunc);                                           // 148
    }                                                                                         // 149
  });                                                                                         // 150
                                                                                              // 151
  eachView.onDestroyed(function () {                                                          // 152
    if (eachView.stopHandle)                                                                  // 153
      eachView.stopHandle.stop();                                                             // 154
  });                                                                                         // 155
                                                                                              // 156
  return eachView;                                                                            // 157
};                                                                                            // 158
                                                                                              // 159
Blaze.InOuterTemplateScope = function (templateView, contentFunc) {                           // 160
  var view = Blaze.View('InOuterTemplateScope', contentFunc);                                 // 161
  var parentView = templateView.parentView;                                                   // 162
                                                                                              // 163
  // Hack so that if you call `{{> foo bar}}` and it expands into                             // 164
  // `{{#with bar}}{{> foo}}{{/with}}`, and then `foo` is a template                          // 165
  // that inserts `{{> UI.contentBlock}}`, the data context for                               // 166
  // `UI.contentBlock` is not `bar` but the one enclosing that.                               // 167
  if (parentView.__isTemplateWith)                                                            // 168
    parentView = parentView.parentView;                                                       // 169
                                                                                              // 170
  view.onCreated(function () {                                                                // 171
    this.originalParentView = this.parentView;                                                // 172
    this.parentView = parentView;                                                             // 173
  });                                                                                         // 174
  return view;                                                                                // 175
};                                                                                            // 176
                                                                                              // 177
////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                            //
// packages\blaze\lookup.js                                                                   //
//                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                              //
var bindIfIsFunction = function (x, target) {                                                 // 1
  if (typeof x !== 'function')                                                                // 2
    return x;                                                                                 // 3
  return function () {                                                                        // 4
    return x.apply(target, arguments);                                                        // 5
  };                                                                                          // 6
};                                                                                            // 7
                                                                                              // 8
var bindToCurrentDataIfIsFunction = function (x) {                                            // 9
  if (typeof x === 'function') {                                                              // 10
    return function () {                                                                      // 11
      var data = Blaze.getCurrentData();                                                      // 12
      if (data == null)                                                                       // 13
        data = {};                                                                            // 14
      return x.apply(data, arguments);                                                        // 15
    };                                                                                        // 16
  }                                                                                           // 17
  return x;                                                                                   // 18
};                                                                                            // 19
                                                                                              // 20
var wrapHelper = function (f) {                                                               // 21
  return Blaze.wrapCatchingExceptions(f, 'template helper');                                  // 22
};                                                                                            // 23
                                                                                              // 24
// Implements {{foo}} where `name` is "foo"                                                   // 25
// and `component` is the component the tag is found in                                       // 26
// (the lexical "self," on which to look for methods).                                        // 27
// If a function is found, it is bound to the object it                                       // 28
// was found on.  Returns a function,                                                         // 29
// non-function value, or null.                                                               // 30
//                                                                                            // 31
// NOTE: This function must not establish any reactive                                        // 32
// dependencies.  If there is any reactivity in the                                           // 33
// value, lookup should return a function.                                                    // 34
Blaze.View.prototype.lookup = function (name, _options) {                                     // 35
  var template = this.template;                                                               // 36
  var lookupTemplate = _options && _options.template;                                         // 37
                                                                                              // 38
  if (/^\./.test(name)) {                                                                     // 39
    // starts with a dot. must be a series of dots which maps to an                           // 40
    // ancestor of the appropriate height.                                                    // 41
    if (!/^(\.)+$/.test(name))                                                                // 42
      throw new Error("id starting with dot must be a series of dots");                       // 43
                                                                                              // 44
    return Blaze._parentData(name.length - 1, true /*_functionWrapped*/);                     // 45
                                                                                              // 46
  } else if (template && (name in template)) {                                                // 47
    return wrapHelper(bindToCurrentDataIfIsFunction(template[name]));                         // 48
  } else if (lookupTemplate && Template.__lookup__(name)) {                                   // 49
    return Template.__lookup__(name);                                                         // 50
  } else if (UI._globalHelpers[name]) {                                                       // 51
    return wrapHelper(bindToCurrentDataIfIsFunction(UI._globalHelpers[name]));                // 52
  } else {                                                                                    // 53
    return function () {                                                                      // 54
      var isCalledAsFunction = (arguments.length > 0);                                        // 55
      var data = Blaze.getCurrentData();                                                      // 56
      if (lookupTemplate && ! (data && data[name])) {                                         // 57
        throw new Error("No such template: " + name);                                         // 58
      }                                                                                       // 59
      if (isCalledAsFunction && ! (data && data[name])) {                                     // 60
        throw new Error("No such function: " + name);                                         // 61
      }                                                                                       // 62
      if (! data)                                                                             // 63
        return null;                                                                          // 64
      var x = data[name];                                                                     // 65
      if (typeof x !== 'function') {                                                          // 66
        if (isCalledAsFunction) {                                                             // 67
          throw new Error("Can't call non-function: " + x);                                   // 68
        }                                                                                     // 69
        return x;                                                                             // 70
      }                                                                                       // 71
      return x.apply(data, arguments);                                                        // 72
    };                                                                                        // 73
  }                                                                                           // 74
  return null;                                                                                // 75
};                                                                                            // 76
                                                                                              // 77
// Implement Spacebars' {{../..}}.                                                            // 78
// @param height {Number} The number of '..'s                                                 // 79
Blaze._parentData = function (height, _functionWrapped) {                                     // 80
  var theWith = Blaze.getCurrentView('with');                                                 // 81
  for (var i = 0; (i < height) && theWith; i++) {                                             // 82
    theWith = Blaze.getParentView(theWith, 'with');                                           // 83
  }                                                                                           // 84
                                                                                              // 85
  if (! theWith)                                                                              // 86
    return null;                                                                              // 87
  if (_functionWrapped)                                                                       // 88
    return function () { return theWith.dataVar.get(); };                                     // 89
  return theWith.dataVar.get();                                                               // 90
};                                                                                            // 91
                                                                                              // 92
                                                                                              // 93
Blaze.View.prototype.lookupTemplate = function (name) {                                       // 94
  return this.lookup(name, {template:true});                                                  // 95
};                                                                                            // 96
                                                                                              // 97
////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package.blaze = {
  Blaze: Blaze
};

})();

//# sourceMappingURL=blaze.js.map
