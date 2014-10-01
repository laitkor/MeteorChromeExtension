(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var HTML = Package.htmljs.HTML;
var UI = Package.ui.UI;
var Handlebars = Package.ui.Handlebars;
var ObserveSequence = Package['observe-sequence'].ObserveSequence;
var Blaze = Package.blaze.Blaze;

/* Package-scope variables */
var Spacebars;

(function () {

///////////////////////////////////////////////////////////////////////////////////
//                                                                               //
// packages\spacebars\spacebars-runtime.js                                       //
//                                                                               //
///////////////////////////////////////////////////////////////////////////////////
                                                                                 //
Spacebars = {};                                                                  // 1
                                                                                 // 2
var tripleEquals = function (a, b) { return a === b; };                          // 3
                                                                                 // 4
Spacebars.include = function (templateOrFunction, contentFunc, elseFunc) {       // 5
  if (! templateOrFunction)                                                      // 6
    return null;                                                                 // 7
                                                                                 // 8
  if (typeof templateOrFunction !== 'function') {                                // 9
    var template = templateOrFunction;                                           // 10
    if (! Blaze.isTemplate(template))                                            // 11
      throw new Error("Expected template or null, found: " + template);          // 12
    return Blaze.runTemplate(templateOrFunction, contentFunc, elseFunc);         // 13
  }                                                                              // 14
                                                                                 // 15
  var templateVar = Blaze.ReactiveVar(null, tripleEquals);                       // 16
  var view = Blaze.View('Spacebars.include', function () {                       // 17
    var template = templateVar.get();                                            // 18
    if (template === null)                                                       // 19
      return null;                                                               // 20
                                                                                 // 21
    if (! Template.__isTemplate__(template))                                     // 22
      throw new Error("Expected template or null, found: " + template);          // 23
                                                                                 // 24
    return Blaze.runTemplate(template, contentFunc, elseFunc);                   // 25
  });                                                                            // 26
  view.__templateVar = templateVar;                                              // 27
  view.onCreated(function () {                                                   // 28
    this.autorun(function () {                                                   // 29
      templateVar.set(templateOrFunction());                                     // 30
    });                                                                          // 31
  });                                                                            // 32
                                                                                 // 33
  return view;                                                                   // 34
};                                                                               // 35
                                                                                 // 36
// Executes `{{foo bar baz}}` when called on `(foo, bar, baz)`.                  // 37
// If `bar` and `baz` are functions, they are called before                      // 38
// `foo` is called on them.                                                      // 39
//                                                                               // 40
// This is the shared part of Spacebars.mustache and                             // 41
// Spacebars.attrMustache, which differ in how they post-process the             // 42
// result.                                                                       // 43
Spacebars.mustacheImpl = function (value/*, args*/) {                            // 44
  var args = arguments;                                                          // 45
  // if we have any arguments (pos or kw), add an options argument               // 46
  // if there isn't one.                                                         // 47
  if (args.length > 1) {                                                         // 48
    var kw = args[args.length - 1];                                              // 49
    if (! (kw instanceof Spacebars.kw)) {                                        // 50
      kw = Spacebars.kw();                                                       // 51
      // clone arguments into an actual array, then push                         // 52
      // the empty kw object.                                                    // 53
      args = Array.prototype.slice.call(arguments);                              // 54
      args.push(kw);                                                             // 55
    } else {                                                                     // 56
      // For each keyword arg, call it if it's a function                        // 57
      var newHash = {};                                                          // 58
      for (var k in kw.hash) {                                                   // 59
        var v = kw.hash[k];                                                      // 60
        newHash[k] = (typeof v === 'function' ? v() : v);                        // 61
      }                                                                          // 62
      args[args.length - 1] = Spacebars.kw(newHash);                             // 63
    }                                                                            // 64
  }                                                                              // 65
                                                                                 // 66
  return Spacebars.call.apply(null, args);                                       // 67
};                                                                               // 68
                                                                                 // 69
Spacebars.mustache = function (value/*, args*/) {                                // 70
  var result = Spacebars.mustacheImpl.apply(null, arguments);                    // 71
                                                                                 // 72
  if (result instanceof Spacebars.SafeString)                                    // 73
    return HTML.Raw(result.toString());                                          // 74
  else                                                                           // 75
    // map `null`, `undefined`, and `false` to null, which is important          // 76
    // so that attributes with nully values are considered absent.               // 77
    // stringify anything else (e.g. strings, booleans, numbers including 0).    // 78
    return (result == null || result === false) ? null : String(result);         // 79
};                                                                               // 80
                                                                                 // 81
Spacebars.attrMustache = function (value/*, args*/) {                            // 82
  var result = Spacebars.mustacheImpl.apply(null, arguments);                    // 83
                                                                                 // 84
  if (result == null || result === '') {                                         // 85
    return null;                                                                 // 86
  } else if (typeof result === 'object') {                                       // 87
    return result;                                                               // 88
  } else if (typeof result === 'string' && HTML.isValidAttributeName(result)) {  // 89
    var obj = {};                                                                // 90
    obj[result] = '';                                                            // 91
    return obj;                                                                  // 92
  } else {                                                                       // 93
    throw new Error("Expected valid attribute name, '', null, or object");       // 94
  }                                                                              // 95
};                                                                               // 96
                                                                                 // 97
Spacebars.dataMustache = function (value/*, args*/) {                            // 98
  var result = Spacebars.mustacheImpl.apply(null, arguments);                    // 99
                                                                                 // 100
  return result;                                                                 // 101
};                                                                               // 102
                                                                                 // 103
// Idempotently wrap in `HTML.Raw`.                                              // 104
//                                                                               // 105
// Called on the return value from `Spacebars.mustache` in case the              // 106
// template uses triple-stache (`{{{foo bar baz}}}`).                            // 107
Spacebars.makeRaw = function (value) {                                           // 108
  if (value == null) // null or undefined                                        // 109
    return null;                                                                 // 110
  else if (value instanceof HTML.Raw)                                            // 111
    return value;                                                                // 112
  else                                                                           // 113
    return HTML.Raw(value);                                                      // 114
};                                                                               // 115
                                                                                 // 116
// If `value` is a function, called it on the `args`, after                      // 117
// evaluating the args themselves (by calling them if they are                   // 118
// functions).  Otherwise, simply return `value` (and assert that                // 119
// there are no args).                                                           // 120
Spacebars.call = function (value/*, args*/) {                                    // 121
  if (typeof value === 'function') {                                             // 122
    // evaluate arguments if they are functions (by calling them)                // 123
    var newArgs = [];                                                            // 124
    for (var i = 1; i < arguments.length; i++) {                                 // 125
      var arg = arguments[i];                                                    // 126
      newArgs[i-1] = (typeof arg === 'function' ? arg() : arg);                  // 127
    }                                                                            // 128
                                                                                 // 129
    return value.apply(null, newArgs);                                           // 130
  } else {                                                                       // 131
    if (arguments.length > 1)                                                    // 132
      throw new Error("Can't call non-function: " + value);                      // 133
                                                                                 // 134
    return value;                                                                // 135
  }                                                                              // 136
};                                                                               // 137
                                                                                 // 138
// Call this as `Spacebars.kw({ ... })`.  The return value                       // 139
// is `instanceof Spacebars.kw`.                                                 // 140
Spacebars.kw = function (hash) {                                                 // 141
  if (! (this instanceof Spacebars.kw))                                          // 142
    // called without new; call with new                                         // 143
    return new Spacebars.kw(hash);                                               // 144
                                                                                 // 145
  this.hash = hash || {};                                                        // 146
};                                                                               // 147
                                                                                 // 148
// Call this as `Spacebars.SafeString("some HTML")`.  The return value           // 149
// is `instanceof Spacebars.SafeString` (and `instanceof Handlebars.SafeString). // 150
Spacebars.SafeString = function (html) {                                         // 151
  if (! (this instanceof Spacebars.SafeString))                                  // 152
    // called without new; call with new                                         // 153
    return new Spacebars.SafeString(html);                                       // 154
                                                                                 // 155
  return new Handlebars.SafeString(html);                                        // 156
};                                                                               // 157
Spacebars.SafeString.prototype = Handlebars.SafeString.prototype;                // 158
                                                                                 // 159
// `Spacebars.dot(foo, "bar", "baz")` performs a special kind                    // 160
// of `foo.bar.baz` that allows safe indexing of `null` and                      // 161
// indexing of functions (which calls the function).  If the                     // 162
// result is a function, it is always a bound function (e.g.                     // 163
// a wrapped version of `baz` that always uses `foo.bar` as                      // 164
// `this`).                                                                      // 165
//                                                                               // 166
// In `Spacebars.dot(foo, "bar")`, `foo` is assumed to be either                 // 167
// a non-function value or a "fully-bound" function wrapping a value,            // 168
// where fully-bound means it takes no arguments and ignores `this`.             // 169
//                                                                               // 170
// `Spacebars.dot(foo, "bar")` performs the following steps:                     // 171
//                                                                               // 172
// * If `foo` is falsy, return `foo`.                                            // 173
//                                                                               // 174
// * If `foo` is a function, call it (set `foo` to `foo()`).                     // 175
//                                                                               // 176
// * If `foo` is falsy now, return `foo`.                                        // 177
//                                                                               // 178
// * Return `foo.bar`, binding it to `foo` if it's a function.                   // 179
Spacebars.dot = function (value, id1/*, id2, ...*/) {                            // 180
  if (arguments.length > 2) {                                                    // 181
    // Note: doing this recursively is probably less efficient than              // 182
    // doing it in an iterative loop.                                            // 183
    var argsForRecurse = [];                                                     // 184
    argsForRecurse.push(Spacebars.dot(value, id1));                              // 185
    argsForRecurse.push.apply(argsForRecurse,                                    // 186
                              Array.prototype.slice.call(arguments, 2));         // 187
    return Spacebars.dot.apply(null, argsForRecurse);                            // 188
  }                                                                              // 189
                                                                                 // 190
  if (typeof value === 'function')                                               // 191
    value = value();                                                             // 192
                                                                                 // 193
  if (! value)                                                                   // 194
    return value; // falsy, don't index, pass through                            // 195
                                                                                 // 196
  var result = value[id1];                                                       // 197
  if (typeof result !== 'function')                                              // 198
    return result;                                                               // 199
  // `value[id1]` (or `value()[id1]`) is a function.                             // 200
  // Bind it so that when called, `value` will be placed in `this`.              // 201
  return function (/*arguments*/) {                                              // 202
    return result.apply(value, arguments);                                       // 203
  };                                                                             // 204
};                                                                               // 205
                                                                                 // 206
Spacebars.TemplateWith = function (argFunc, contentBlock) {                      // 207
  var w;                                                                         // 208
                                                                                 // 209
  // This is a little messy.  When we compile `{{> UI.contentBlock}}`, we        // 210
  // wrap it in Blaze.InOuterTemplateScope in order to skip the intermediate     // 211
  // parent Views in the current template.  However, when there's an argument    // 212
  // (`{{> UI.contentBlock arg}}`), the argument needs to be evaluated           // 213
  // in the original scope.  There's no good order to nest                       // 214
  // Blaze.InOuterTemplateScope and Spacebars.TemplateWith to achieve this,      // 215
  // so we wrap argFunc to run it in the "original parentView" of the            // 216
  // Blaze.InOuterTemplateScope.                                                 // 217
  //                                                                             // 218
  // To make this better, reconsider InOuterTemplateScope as a primitive.        // 219
  // Longer term, evaluate expressions in the proper lexical scope.              // 220
  var wrappedArgFunc = function () {                                             // 221
    var viewToEvaluateArg = null;                                                // 222
    if (w.parentView && w.parentView.kind === 'InOuterTemplateScope') {          // 223
      viewToEvaluateArg = w.parentView.originalParentView;                       // 224
    }                                                                            // 225
    if (viewToEvaluateArg) {                                                     // 226
      return Blaze.withCurrentView(viewToEvaluateArg, argFunc);                  // 227
    } else {                                                                     // 228
      return argFunc();                                                          // 229
    }                                                                            // 230
  };                                                                             // 231
                                                                                 // 232
  w = Blaze.With(wrappedArgFunc, contentBlock);                                  // 233
  w.__isTemplateWith = true;                                                     // 234
  return w;                                                                      // 235
};                                                                               // 236
                                                                                 // 237
// Spacebars.With implements the conditional logic of rendering                  // 238
// the `{{else}}` block if the argument is falsy.  It combines                   // 239
// a Blaze.If with a Blaze.With (the latter only in the truthy                   // 240
// case, since the else block is evaluated without entering                      // 241
// a new data context).                                                          // 242
Spacebars.With = function (argFunc, contentFunc, elseFunc) {                     // 243
  var argVar = new Blaze.ReactiveVar;                                            // 244
  var view = Blaze.View('Spacebars_with', function () {                          // 245
    return Blaze.If(function () { return argVar.get(); },                        // 246
                    function () { return Blaze.With(function () {                // 247
                      return argVar.get(); }, contentFunc); },                   // 248
                    elseFunc);                                                   // 249
  });                                                                            // 250
  view.onCreated(function () {                                                   // 251
    this.autorun(function () {                                                   // 252
      argVar.set(argFunc());                                                     // 253
                                                                                 // 254
      // This is a hack so that autoruns inside the body                         // 255
      // of the #with get stopped sooner.  It reaches inside                     // 256
      // our ReactiveVar to access its dep.                                      // 257
                                                                                 // 258
      Deps.onInvalidate(function () {                                            // 259
        argVar.dep.changed();                                                    // 260
      });                                                                        // 261
                                                                                 // 262
      // Take the case of `{{#with A}}{{B}}{{/with}}`.  The goal                 // 263
      // is to not re-render `B` if `A` changes to become falsy                  // 264
      // and `B` is simultaneously invalidated.                                  // 265
      //                                                                         // 266
      // A series of autoruns are involved:                                      // 267
      //                                                                         // 268
      // 1. This autorun (argument to Spacebars.With)                            // 269
      // 2. Argument to Blaze.If                                                 // 270
      // 3. Blaze.If view re-render                                              // 271
      // 4. Argument to Blaze.With                                               // 272
      // 5. The template tag `{{B}}`                                             // 273
      //                                                                         // 274
      // When (3) is invalidated, it immediately stops (4) and (5)               // 275
      // because of a Deps.onInvalidate built into materializeView.              // 276
      // (When a View's render method is invalidated, it immediately             // 277
      // tears down all the subviews, via a Deps.onInvalidate much               // 278
      // like this one.                                                          // 279
      //                                                                         // 280
      // Suppose `A` changes to become falsy, and `B` changes at the             // 281
      // same time (i.e. without an intervening flush).                          // 282
      // Without the code above, this happens:                                   // 283
      //                                                                         // 284
      // - (1) and (5) are invalidated.                                          // 285
      // - (1) runs, invalidating (2) and (4).                                   // 286
      // - (5) runs.                                                             // 287
      // - (2) runs, invalidating (3), stopping (4) and (5).                     // 288
      //                                                                         // 289
      // With the code above:                                                    // 290
      //                                                                         // 291
      // - (1) and (5) are invalidated, invalidating (2) and (4).                // 292
      // - (1) runs.                                                             // 293
      // - (2) runs, invalidating (3), stopping (4) and (5).                     // 294
      //                                                                         // 295
      // If the re-run of (5) is originally enqueued before (1), all             // 296
      // bets are off, but typically that doesn't seem to be the                 // 297
      // case.  Anyway, doing this is always better than not doing it,           // 298
      // because it might save a bunch of DOM from being updated                 // 299
      // needlessly.                                                             // 300
    });                                                                          // 301
  });                                                                            // 302
                                                                                 // 303
  return view;                                                                   // 304
};                                                                               // 305
                                                                                 // 306
///////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package.spacebars = {
  Spacebars: Spacebars
};

})();

//# sourceMappingURL=spacebars.js.map
