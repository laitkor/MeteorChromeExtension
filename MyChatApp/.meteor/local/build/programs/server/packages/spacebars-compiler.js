(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var HTML = Package.htmljs.HTML;
var HTMLTools = Package['html-tools'].HTMLTools;
var BlazeTools = Package['blaze-tools'].BlazeTools;
var _ = Package.underscore._;
var CssTools = Package.minifiers.CssTools;
var UglifyJSMinify = Package.minifiers.UglifyJSMinify;

/* Package-scope variables */
var SpacebarsCompiler, TemplateTag;

(function () {

////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                        //
// packages\spacebars-compiler\templatetag.js                                             //
//                                                                                        //
////////////////////////////////////////////////////////////////////////////////////////////
                                                                                          //
SpacebarsCompiler = {};                                                                   // 1
                                                                                          // 2
// A TemplateTag is the result of parsing a single `{{...}}` tag.                         // 3
//                                                                                        // 4
// The `.type` of a TemplateTag is one of:                                                // 5
//                                                                                        // 6
// - `"DOUBLE"` - `{{foo}}`                                                               // 7
// - `"TRIPLE"` - `{{{foo}}}`                                                             // 8
// - `"COMMENT"` - `{{! foo}}`                                                            // 9
// - `"INCLUSION"` - `{{> foo}}`                                                          // 10
// - `"BLOCKOPEN"` - `{{#foo}}`                                                           // 11
// - `"BLOCKCLOSE"` - `{{/foo}}`                                                          // 12
// - `"ELSE"` - `{{else}}`                                                                // 13
//                                                                                        // 14
// Besides `type`, the mandatory properties of a TemplateTag are:                         // 15
//                                                                                        // 16
// - `path` - An array of one or more strings.  The path of `{{foo.bar}}`                 // 17
//   is `["foo", "bar"]`.  Applies to DOUBLE, TRIPLE, INCLUSION, BLOCKOPEN,               // 18
//   and BLOCKCLOSE.                                                                      // 19
//                                                                                        // 20
// - `args` - An array of zero or more argument specs.  An argument spec                  // 21
//   is a two or three element array, consisting of a type, value, and                    // 22
//   optional keyword name.  For example, the `args` of `{{foo "bar" x=3}}`               // 23
//   are `[["STRING", "bar"], ["NUMBER", 3, "x"]]`.  Applies to DOUBLE,                   // 24
//   TRIPLE, INCLUSION, and BLOCKOPEN.                                                    // 25
//                                                                                        // 26
// - `value` - For COMMENT tags, a string of the comment's text.                          // 27
//                                                                                        // 28
// These additional are typically set during parsing:                                     // 29
//                                                                                        // 30
// - `position` - The HTMLTools.TEMPLATE_TAG_POSITION specifying at what sort             // 31
//   of site the TemplateTag was encountered (e.g. at element level or as                 // 32
//   part of an attribute value). Its absence implies                                     // 33
//   TEMPLATE_TAG_POSITION.ELEMENT.                                                       // 34
//                                                                                        // 35
// - `content` and `elseContent` - When a BLOCKOPEN tag's contents are                    // 36
//   parsed, they are put here.  `elseContent` will only be present if                    // 37
//   an `{{else}}` was found.                                                             // 38
                                                                                          // 39
var TEMPLATE_TAG_POSITION = HTMLTools.TEMPLATE_TAG_POSITION;                              // 40
                                                                                          // 41
TemplateTag = SpacebarsCompiler.TemplateTag = function () {                               // 42
  HTMLTools.TemplateTag.apply(this, arguments);                                           // 43
};                                                                                        // 44
TemplateTag.prototype = new HTMLTools.TemplateTag;                                        // 45
TemplateTag.prototype.constructorName = 'SpacebarsCompiler.TemplateTag';                  // 46
                                                                                          // 47
var makeStacheTagStartRegex = function (r) {                                              // 48
  return new RegExp(r.source + /(?![{>!#/])/.source,                                      // 49
                    r.ignoreCase ? 'i' : '');                                             // 50
};                                                                                        // 51
                                                                                          // 52
var starts = {                                                                            // 53
  ELSE: makeStacheTagStartRegex(/^\{\{\s*else(?=[\s}])/i),                                // 54
  DOUBLE: makeStacheTagStartRegex(/^\{\{\s*(?!\s)/),                                      // 55
  TRIPLE: makeStacheTagStartRegex(/^\{\{\{\s*(?!\s)/),                                    // 56
  BLOCKCOMMENT: makeStacheTagStartRegex(/^\{\{\s*!--/),                                   // 57
  COMMENT: makeStacheTagStartRegex(/^\{\{\s*!/),                                          // 58
  INCLUSION: makeStacheTagStartRegex(/^\{\{\s*>\s*(?!\s)/),                               // 59
  BLOCKOPEN: makeStacheTagStartRegex(/^\{\{\s*#\s*(?!\s)/),                               // 60
  BLOCKCLOSE: makeStacheTagStartRegex(/^\{\{\s*\/\s*(?!\s)/)                              // 61
};                                                                                        // 62
                                                                                          // 63
var ends = {                                                                              // 64
  DOUBLE: /^\s*\}\}/,                                                                     // 65
  TRIPLE: /^\s*\}\}\}/                                                                    // 66
};                                                                                        // 67
                                                                                          // 68
// Parse a tag from the provided scanner or string.  If the input                         // 69
// doesn't start with `{{`, returns null.  Otherwise, either succeeds                     // 70
// and returns a SpacebarsCompiler.TemplateTag, or throws an error (using                 // 71
// `scanner.fatal` if a scanner is provided).                                             // 72
TemplateTag.parse = function (scannerOrString) {                                          // 73
  var scanner = scannerOrString;                                                          // 74
  if (typeof scanner === 'string')                                                        // 75
    scanner = new HTMLTools.Scanner(scannerOrString);                                     // 76
                                                                                          // 77
  if (! (scanner.peek() === '{' &&                                                        // 78
         (scanner.rest()).slice(0, 2) === '{{'))                                          // 79
    return null;                                                                          // 80
                                                                                          // 81
  var run = function (regex) {                                                            // 82
    // regex is assumed to start with `^`                                                 // 83
    var result = regex.exec(scanner.rest());                                              // 84
    if (! result)                                                                         // 85
      return null;                                                                        // 86
    var ret = result[0];                                                                  // 87
    scanner.pos += ret.length;                                                            // 88
    return ret;                                                                           // 89
  };                                                                                      // 90
                                                                                          // 91
  var advance = function (amount) {                                                       // 92
    scanner.pos += amount;                                                                // 93
  };                                                                                      // 94
                                                                                          // 95
  var scanIdentifier = function (isFirstInPath) {                                         // 96
    var id = BlazeTools.parseIdentifierName(scanner);                                     // 97
    if (! id)                                                                             // 98
      expected('IDENTIFIER');                                                             // 99
    if (isFirstInPath &&                                                                  // 100
        (id === 'null' || id === 'true' || id === 'false'))                               // 101
      scanner.fatal("Can't use null, true, or false, as an identifier at start of path"); // 102
                                                                                          // 103
    return id;                                                                            // 104
  };                                                                                      // 105
                                                                                          // 106
  var scanPath = function () {                                                            // 107
    var segments = [];                                                                    // 108
                                                                                          // 109
    // handle initial `.`, `..`, `./`, `../`, `../..`, `../../`, etc                      // 110
    var dots;                                                                             // 111
    if ((dots = run(/^[\.\/]+/))) {                                                       // 112
      var ancestorStr = '.'; // eg `../../..` maps to `....`                              // 113
      var endsWithSlash = /\/$/.test(dots);                                               // 114
                                                                                          // 115
      if (endsWithSlash)                                                                  // 116
        dots = dots.slice(0, -1);                                                         // 117
                                                                                          // 118
      _.each(dots.split('/'), function(dotClause, index) {                                // 119
        if (index === 0) {                                                                // 120
          if (dotClause !== '.' && dotClause !== '..')                                    // 121
            expected("`.`, `..`, `./` or `../`");                                         // 122
        } else {                                                                          // 123
          if (dotClause !== '..')                                                         // 124
            expected("`..` or `../`");                                                    // 125
        }                                                                                 // 126
                                                                                          // 127
        if (dotClause === '..')                                                           // 128
          ancestorStr += '.';                                                             // 129
      });                                                                                 // 130
                                                                                          // 131
      segments.push(ancestorStr);                                                         // 132
                                                                                          // 133
      if (!endsWithSlash)                                                                 // 134
        return segments;                                                                  // 135
    }                                                                                     // 136
                                                                                          // 137
    while (true) {                                                                        // 138
      // scan a path segment                                                              // 139
                                                                                          // 140
      if (run(/^\[/)) {                                                                   // 141
        var seg = run(/^[\s\S]*?\]/);                                                     // 142
        if (! seg)                                                                        // 143
          error("Unterminated path segment");                                             // 144
        seg = seg.slice(0, -1);                                                           // 145
        if (! seg && ! segments.length)                                                   // 146
          error("Path can't start with empty string");                                    // 147
        segments.push(seg);                                                               // 148
      } else {                                                                            // 149
        var id = scanIdentifier(! segments.length);                                       // 150
        if (id === 'this') {                                                              // 151
          if (! segments.length) {                                                        // 152
            // initial `this`                                                             // 153
            segments.push('.');                                                           // 154
          } else {                                                                        // 155
            error("Can only use `this` at the beginning of a path.\nInstead of `foo.this` or `../this`, just write `foo` or `..`.");
          }                                                                               // 157
        } else {                                                                          // 158
          segments.push(id);                                                              // 159
        }                                                                                 // 160
      }                                                                                   // 161
                                                                                          // 162
      var sep = run(/^[\.\/]/);                                                           // 163
      if (! sep)                                                                          // 164
        break;                                                                            // 165
    }                                                                                     // 166
                                                                                          // 167
    return segments;                                                                      // 168
  };                                                                                      // 169
                                                                                          // 170
  // scan the keyword portion of a keyword argument                                       // 171
  // (the "foo" portion in "foo=bar").                                                    // 172
  // Result is either the keyword matched, or null                                        // 173
  // if we're not at a keyword argument position.                                         // 174
  var scanArgKeyword = function () {                                                      // 175
    var match = /^([^\{\}\(\)\>#=\s"'\[\]]+)\s*=\s*/.exec(scanner.rest());                // 176
    if (match) {                                                                          // 177
      scanner.pos += match[0].length;                                                     // 178
      return match[1];                                                                    // 179
    } else {                                                                              // 180
      return null;                                                                        // 181
    }                                                                                     // 182
  };                                                                                      // 183
                                                                                          // 184
  // scan an argument; succeeds or errors.                                                // 185
  // Result is an array of two or three items:                                            // 186
  // type , value, and (indicating a keyword argument)                                    // 187
  // keyword name.                                                                        // 188
  var scanArg = function () {                                                             // 189
    var keyword = scanArgKeyword(); // null if not parsing a kwarg                        // 190
    var value = scanArgValue();                                                           // 191
    return keyword ? value.concat(keyword) : value;                                       // 192
  };                                                                                      // 193
                                                                                          // 194
  // scan an argument value (for keyword or positional arguments);                        // 195
  // succeeds or errors.  Result is an array of type, value.                              // 196
  var scanArgValue = function () {                                                        // 197
    var startPos = scanner.pos;                                                           // 198
    var result;                                                                           // 199
    if ((result = BlazeTools.parseNumber(scanner))) {                                     // 200
      return ['NUMBER', result.value];                                                    // 201
    } else if ((result = BlazeTools.parseStringLiteral(scanner))) {                       // 202
      return ['STRING', result.value];                                                    // 203
    } else if (/^[\.\[]/.test(scanner.peek())) {                                          // 204
      return ['PATH', scanPath()];                                                        // 205
    } else if ((result = BlazeTools.parseIdentifierName(scanner))) {                      // 206
      var id = result;                                                                    // 207
      if (id === 'null') {                                                                // 208
        return ['NULL', null];                                                            // 209
      } else if (id === 'true' || id === 'false') {                                       // 210
        return ['BOOLEAN', id === 'true'];                                                // 211
      } else {                                                                            // 212
        scanner.pos = startPos; // unconsume `id`                                         // 213
        return ['PATH', scanPath()];                                                      // 214
      }                                                                                   // 215
    } else {                                                                              // 216
      expected('identifier, number, string, boolean, or null');                           // 217
    }                                                                                     // 218
  };                                                                                      // 219
                                                                                          // 220
  var type;                                                                               // 221
                                                                                          // 222
  var error = function (msg) {                                                            // 223
    scanner.fatal(msg);                                                                   // 224
  };                                                                                      // 225
                                                                                          // 226
  var expected = function (what) {                                                        // 227
    error('Expected ' + what);                                                            // 228
  };                                                                                      // 229
                                                                                          // 230
  // must do ELSE first; order of others doesn't matter                                   // 231
                                                                                          // 232
  if (run(starts.ELSE)) type = 'ELSE';                                                    // 233
  else if (run(starts.DOUBLE)) type = 'DOUBLE';                                           // 234
  else if (run(starts.TRIPLE)) type = 'TRIPLE';                                           // 235
  else if (run(starts.BLOCKCOMMENT)) type = 'BLOCKCOMMENT';                               // 236
  else if (run(starts.COMMENT)) type = 'COMMENT';                                         // 237
  else if (run(starts.INCLUSION)) type = 'INCLUSION';                                     // 238
  else if (run(starts.BLOCKOPEN)) type = 'BLOCKOPEN';                                     // 239
  else if (run(starts.BLOCKCLOSE)) type = 'BLOCKCLOSE';                                   // 240
  else                                                                                    // 241
    error('Unknown stache tag');                                                          // 242
                                                                                          // 243
  var tag = new TemplateTag;                                                              // 244
  tag.type = type;                                                                        // 245
                                                                                          // 246
  if (type === 'BLOCKCOMMENT') {                                                          // 247
    var result = run(/^[\s\S]*?--\s*?\}\}/);                                              // 248
    if (! result)                                                                         // 249
      error("Unclosed block comment");                                                    // 250
    tag.value = result.slice(0, result.lastIndexOf('--'));                                // 251
  } else if (type === 'COMMENT') {                                                        // 252
    var result = run(/^[\s\S]*?\}\}/);                                                    // 253
    if (! result)                                                                         // 254
      error("Unclosed comment");                                                          // 255
    tag.value = result.slice(0, -2);                                                      // 256
  } else if (type === 'BLOCKCLOSE') {                                                     // 257
    tag.path = scanPath();                                                                // 258
    if (! run(ends.DOUBLE))                                                               // 259
      expected('`}}`');                                                                   // 260
  } else if (type === 'ELSE') {                                                           // 261
    if (! run(ends.DOUBLE))                                                               // 262
      expected('`}}`');                                                                   // 263
  } else {                                                                                // 264
    // DOUBLE, TRIPLE, BLOCKOPEN, INCLUSION                                               // 265
    tag.path = scanPath();                                                                // 266
    tag.args = [];                                                                        // 267
    var foundKwArg = false;                                                               // 268
    while (true) {                                                                        // 269
      run(/^\s*/);                                                                        // 270
      if (type === 'TRIPLE') {                                                            // 271
        if (run(ends.TRIPLE))                                                             // 272
          break;                                                                          // 273
        else if (scanner.peek() === '}')                                                  // 274
          expected('`}}}`');                                                              // 275
      } else {                                                                            // 276
        if (run(ends.DOUBLE))                                                             // 277
          break;                                                                          // 278
        else if (scanner.peek() === '}')                                                  // 279
          expected('`}}`');                                                               // 280
      }                                                                                   // 281
      var newArg = scanArg();                                                             // 282
      if (newArg.length === 3) {                                                          // 283
        foundKwArg = true;                                                                // 284
      } else {                                                                            // 285
        if (foundKwArg)                                                                   // 286
          error("Can't have a non-keyword argument after a keyword argument");            // 287
      }                                                                                   // 288
      tag.args.push(newArg);                                                              // 289
                                                                                          // 290
      if (run(/^(?=[\s}])/) !== '')                                                       // 291
        expected('space');                                                                // 292
    }                                                                                     // 293
  }                                                                                       // 294
                                                                                          // 295
  return tag;                                                                             // 296
};                                                                                        // 297
                                                                                          // 298
// Returns a SpacebarsCompiler.TemplateTag parsed from `scanner`, leaving scanner         // 299
// at its original position.                                                              // 300
//                                                                                        // 301
// An error will still be thrown if there is not a valid template tag at                  // 302
// the current position.                                                                  // 303
TemplateTag.peek = function (scanner) {                                                   // 304
  var startPos = scanner.pos;                                                             // 305
  var result = TemplateTag.parse(scanner);                                                // 306
  scanner.pos = startPos;                                                                 // 307
  return result;                                                                          // 308
};                                                                                        // 309
                                                                                          // 310
// Like `TemplateTag.parse`, but in the case of blocks, parse the complete                // 311
// `{{#foo}}...{{/foo}}` with `content` and possible `elseContent`, rather                // 312
// than just the BLOCKOPEN tag.                                                           // 313
//                                                                                        // 314
// In addition:                                                                           // 315
//                                                                                        // 316
// - Throws an error if `{{else}}` or `{{/foo}}` tag is encountered.                      // 317
//                                                                                        // 318
// - Returns `null` for a COMMENT.  (This case is distinguishable from                    // 319
//   parsing no tag by the fact that the scanner is advanced.)                            // 320
//                                                                                        // 321
// - Takes an HTMLTools.TEMPLATE_TAG_POSITION `position` and sets it as the               // 322
//   TemplateTag's `.position` property.                                                  // 323
//                                                                                        // 324
// - Validates the tag's well-formedness and legality at in its position.                 // 325
TemplateTag.parseCompleteTag = function (scannerOrString, position) {                     // 326
  var scanner = scannerOrString;                                                          // 327
  if (typeof scanner === 'string')                                                        // 328
    scanner = new HTMLTools.Scanner(scannerOrString);                                     // 329
                                                                                          // 330
  var startPos = scanner.pos; // for error messages                                       // 331
  var result = TemplateTag.parse(scannerOrString);                                        // 332
  if (! result)                                                                           // 333
    return result;                                                                        // 334
                                                                                          // 335
  if (result.type === 'BLOCKCOMMENT')                                                     // 336
    return null;                                                                          // 337
                                                                                          // 338
  if (result.type === 'COMMENT')                                                          // 339
    return null;                                                                          // 340
                                                                                          // 341
  if (result.type === 'ELSE')                                                             // 342
    scanner.fatal("Unexpected {{else}}");                                                 // 343
                                                                                          // 344
  if (result.type === 'BLOCKCLOSE')                                                       // 345
    scanner.fatal("Unexpected closing template tag");                                     // 346
                                                                                          // 347
  position = (position || TEMPLATE_TAG_POSITION.ELEMENT);                                 // 348
  if (position !== TEMPLATE_TAG_POSITION.ELEMENT)                                         // 349
    result.position = position;                                                           // 350
                                                                                          // 351
  if (result.type === 'BLOCKOPEN') {                                                      // 352
    // parse block contents                                                               // 353
                                                                                          // 354
    // Construct a string version of `.path` for comparing start and                      // 355
    // end tags.  For example, `foo/[0]` was parsed into `["foo", "0"]`                   // 356
    // and now becomes `foo,0`.  This form may also show up in error                      // 357
    // messages.                                                                          // 358
    var blockName = result.path.join(',');                                                // 359
                                                                                          // 360
    var textMode = null;                                                                  // 361
      if (blockName === 'markdown' ||                                                     // 362
          position === TEMPLATE_TAG_POSITION.IN_RAWTEXT) {                                // 363
        textMode = HTML.TEXTMODE.STRING;                                                  // 364
      } else if (position === TEMPLATE_TAG_POSITION.IN_RCDATA ||                          // 365
                 position === TEMPLATE_TAG_POSITION.IN_ATTRIBUTE) {                       // 366
        textMode = HTML.TEXTMODE.RCDATA;                                                  // 367
      }                                                                                   // 368
      var parserOptions = {                                                               // 369
        getTemplateTag: TemplateTag.parseCompleteTag,                                     // 370
        shouldStop: isAtBlockCloseOrElse,                                                 // 371
        textMode: textMode                                                                // 372
      };                                                                                  // 373
    result.content = HTMLTools.parseFragment(scanner, parserOptions);                     // 374
                                                                                          // 375
    if (scanner.rest().slice(0, 2) !== '{{')                                              // 376
      scanner.fatal("Expected {{else}} or block close for " + blockName);                 // 377
                                                                                          // 378
    var lastPos = scanner.pos; // save for error messages                                 // 379
    var tmplTag = TemplateTag.parse(scanner); // {{else}} or {{/foo}}                     // 380
                                                                                          // 381
    if (tmplTag.type === 'ELSE') {                                                        // 382
      // parse {{else}} and content up to close tag                                       // 383
      result.elseContent = HTMLTools.parseFragment(scanner, parserOptions);               // 384
                                                                                          // 385
      if (scanner.rest().slice(0, 2) !== '{{')                                            // 386
        scanner.fatal("Expected block close for " + blockName);                           // 387
                                                                                          // 388
      lastPos = scanner.pos;                                                              // 389
      tmplTag = TemplateTag.parse(scanner);                                               // 390
    }                                                                                     // 391
                                                                                          // 392
    if (tmplTag.type === 'BLOCKCLOSE') {                                                  // 393
      var blockName2 = tmplTag.path.join(',');                                            // 394
      if (blockName !== blockName2) {                                                     // 395
        scanner.pos = lastPos;                                                            // 396
        scanner.fatal('Expected tag to close ' + blockName + ', found ' +                 // 397
                      blockName2);                                                        // 398
      }                                                                                   // 399
    } else {                                                                              // 400
      scanner.pos = lastPos;                                                              // 401
      scanner.fatal('Expected tag to close ' + blockName + ', found ' +                   // 402
                    tmplTag.type);                                                        // 403
    }                                                                                     // 404
  }                                                                                       // 405
                                                                                          // 406
  var finalPos = scanner.pos;                                                             // 407
  scanner.pos = startPos;                                                                 // 408
  validateTag(result, scanner);                                                           // 409
  scanner.pos = finalPos;                                                                 // 410
                                                                                          // 411
  return result;                                                                          // 412
};                                                                                        // 413
                                                                                          // 414
var isAtBlockCloseOrElse = function (scanner) {                                           // 415
  // Detect `{{else}}` or `{{/foo}}`.                                                     // 416
  //                                                                                      // 417
  // We do as much work ourselves before deferring to `TemplateTag.peek`,                 // 418
  // for efficiency (we're called for every input token) and to be                        // 419
  // less obtrusive, because `TemplateTag.peek` will throw an error if it                 // 420
  // sees `{{` followed by a malformed tag.                                               // 421
  var rest, type;                                                                         // 422
  return (scanner.peek() === '{' &&                                                       // 423
          (rest = scanner.rest()).slice(0, 2) === '{{' &&                                 // 424
          /^\{\{\s*(\/|else\b)/.test(rest) &&                                             // 425
          (type = TemplateTag.peek(scanner).type) &&                                      // 426
          (type === 'BLOCKCLOSE' || type === 'ELSE'));                                    // 427
};                                                                                        // 428
                                                                                          // 429
// Validate that `templateTag` is correctly formed and legal for its                      // 430
// HTML position.  Use `scanner` to report errors. On success, does                       // 431
// nothing.                                                                               // 432
var validateTag = function (ttag, scanner) {                                              // 433
                                                                                          // 434
  if (ttag.type === 'INCLUSION' || ttag.type === 'BLOCKOPEN') {                           // 435
    var args = ttag.args;                                                                 // 436
    if (args.length > 1 && args[0].length === 2 && args[0][0] !== 'PATH') {               // 437
      // we have a positional argument that is not a PATH followed by                     // 438
      // other arguments                                                                  // 439
      scanner.fatal("First argument must be a function, to be called on the rest of the arguments; found " + args[0][0]);
    }                                                                                     // 441
  }                                                                                       // 442
                                                                                          // 443
  var position = ttag.position || TEMPLATE_TAG_POSITION.ELEMENT;                          // 444
  if (position === TEMPLATE_TAG_POSITION.IN_ATTRIBUTE) {                                  // 445
    if (ttag.type === 'DOUBLE') {                                                         // 446
      return;                                                                             // 447
    } else if (ttag.type === 'BLOCKOPEN') {                                               // 448
      var path = ttag.path;                                                               // 449
      var path0 = path[0];                                                                // 450
      if (! (path.length === 1 && (path0 === 'if' ||                                      // 451
                                   path0 === 'unless' ||                                  // 452
                                   path0 === 'with' ||                                    // 453
                                   path0 === 'each'))) {                                  // 454
        scanner.fatal("Custom block helpers are not allowed in an HTML attribute, only built-in ones like #each and #if");
      }                                                                                   // 456
    } else {                                                                              // 457
      scanner.fatal(ttag.type + " template tag is not allowed in an HTML attribute");     // 458
    }                                                                                     // 459
  } else if (position === TEMPLATE_TAG_POSITION.IN_START_TAG) {                           // 460
    if (! (ttag.type === 'DOUBLE')) {                                                     // 461
      scanner.fatal("Reactive HTML attributes must either have a constant name or consist of a single {{helper}} providing a dictionary of names and values.  A template tag of type " + ttag.type + " is not allowed here.");
    }                                                                                     // 463
    if (scanner.peek() === '=') {                                                         // 464
      scanner.fatal("Template tags are not allowed in attribute names, only in attribute values or in the form of a single {{helper}} that evaluates to a dictionary of name=value pairs.");
    }                                                                                     // 466
  }                                                                                       // 467
                                                                                          // 468
};                                                                                        // 469
                                                                                          // 470
////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                        //
// packages\spacebars-compiler\optimizer.js                                               //
//                                                                                        //
////////////////////////////////////////////////////////////////////////////////////////////
                                                                                          //
// Optimize parts of an HTMLjs tree into raw HTML strings when they don't                 // 1
// contain template tags.                                                                 // 2
                                                                                          // 3
var constant = function (value) {                                                         // 4
  return function () { return value; };                                                   // 5
};                                                                                        // 6
                                                                                          // 7
var OPTIMIZABLE = {                                                                       // 8
  NONE: 0,                                                                                // 9
  PARTS: 1,                                                                               // 10
  FULL: 2                                                                                 // 11
};                                                                                        // 12
                                                                                          // 13
// We can only turn content into an HTML string if it contains no template                // 14
// tags and no "tricky" HTML tags.  If we can optimize the entire content                 // 15
// into a string, we return OPTIMIZABLE.FULL.  If the we are given an                     // 16
// unoptimizable node, we return OPTIMIZABLE.NONE.  If we are given a tree                // 17
// that contains an unoptimizable node somewhere, we return OPTIMIZABLE.PARTS.            // 18
//                                                                                        // 19
// For example, we always create SVG elements programmatically, since SVG                 // 20
// doesn't have innerHTML.  If we are given an SVG element, we return NONE.               // 21
// However, if we are given a big tree that contains SVG somewhere, we                    // 22
// return PARTS so that the optimizer can descend into the tree and optimize              // 23
// other parts of it.                                                                     // 24
var CanOptimizeVisitor = HTML.Visitor.extend();                                           // 25
CanOptimizeVisitor.def({                                                                  // 26
  visitNull: constant(OPTIMIZABLE.FULL),                                                  // 27
  visitPrimitive: constant(OPTIMIZABLE.FULL),                                             // 28
  visitComment: constant(OPTIMIZABLE.FULL),                                               // 29
  visitCharRef: constant(OPTIMIZABLE.FULL),                                               // 30
  visitRaw: constant(OPTIMIZABLE.FULL),                                                   // 31
  visitObject: constant(OPTIMIZABLE.NONE),                                                // 32
  visitFunction: constant(OPTIMIZABLE.NONE),                                              // 33
  visitArray: function (x) {                                                              // 34
    for (var i = 0; i < x.length; i++)                                                    // 35
      if (this.visit(x[i]) !== OPTIMIZABLE.FULL)                                          // 36
        return OPTIMIZABLE.PARTS;                                                         // 37
    return OPTIMIZABLE.FULL;                                                              // 38
  },                                                                                      // 39
  visitTag: function (tag) {                                                              // 40
    var tagName = tag.tagName;                                                            // 41
    if (tagName === 'textarea') {                                                         // 42
      // optimizing into a TEXTAREA's RCDATA would require being a little                 // 43
      // more clever.                                                                     // 44
      return OPTIMIZABLE.NONE;                                                            // 45
    } else if (! (HTML.isKnownElement(tagName) &&                                         // 46
                  ! HTML.isKnownSVGElement(tagName))) {                                   // 47
      // foreign elements like SVG can't be stringified for innerHTML.                    // 48
      return OPTIMIZABLE.NONE;                                                            // 49
    } else if (tagName === 'table') {                                                     // 50
      // Avoid ever producing HTML containing `<table><tr>...`, because the               // 51
      // browser will insert a TBODY.  If we just `createElement("table")` and            // 52
      // `createElement("tr")`, on the other hand, no TBODY is necessary                  // 53
      // (assuming IE 8+).                                                                // 54
      return OPTIMIZABLE.NONE;                                                            // 55
    }                                                                                     // 56
                                                                                          // 57
    var children = tag.children;                                                          // 58
    for (var i = 0; i < children.length; i++)                                             // 59
      if (this.visit(children[i]) !== OPTIMIZABLE.FULL)                                   // 60
        return OPTIMIZABLE.PARTS;                                                         // 61
                                                                                          // 62
    if (this.visitAttributes(tag.attrs) !== OPTIMIZABLE.FULL)                             // 63
      return OPTIMIZABLE.PARTS;                                                           // 64
                                                                                          // 65
    return OPTIMIZABLE.FULL;                                                              // 66
  },                                                                                      // 67
  visitAttributes: function (attrs) {                                                     // 68
    if (attrs) {                                                                          // 69
      var isArray = HTML.isArray(attrs);                                                  // 70
      for (var i = 0; i < (isArray ? attrs.length : 1); i++) {                            // 71
        var a = (isArray ? attrs[i] : attrs);                                             // 72
        if ((typeof a !== 'object') || (a instanceof HTMLTools.TemplateTag))              // 73
          return OPTIMIZABLE.PARTS;                                                       // 74
        for (var k in a)                                                                  // 75
          if (this.visit(a[k]) !== OPTIMIZABLE.FULL)                                      // 76
            return OPTIMIZABLE.PARTS;                                                     // 77
      }                                                                                   // 78
    }                                                                                     // 79
    return OPTIMIZABLE.FULL;                                                              // 80
  }                                                                                       // 81
});                                                                                       // 82
                                                                                          // 83
var getOptimizability = function (content) {                                              // 84
  return (new CanOptimizeVisitor).visit(content);                                         // 85
};                                                                                        // 86
                                                                                          // 87
var toRaw = function (x) {                                                                // 88
  return HTML.Raw(HTML.toHTML(x));                                                        // 89
};                                                                                        // 90
                                                                                          // 91
var TreeTransformer = HTML.TransformingVisitor.extend();                                  // 92
TreeTransformer.def({                                                                     // 93
  visitAttributes: function (attrs/*, ...*/) {                                            // 94
    // pass template tags through by default                                              // 95
    if (attrs instanceof HTMLTools.TemplateTag)                                           // 96
      return attrs;                                                                       // 97
                                                                                          // 98
    return HTML.TransformingVisitor.prototype.visitAttributes.apply(                      // 99
      this, arguments);                                                                   // 100
  }                                                                                       // 101
});                                                                                       // 102
                                                                                          // 103
// Replace parts of the HTMLjs tree that have no template tags (or                        // 104
// tricky HTML tags) with HTML.Raw objects containing raw HTML.                           // 105
var OptimizingVisitor = TreeTransformer.extend();                                         // 106
OptimizingVisitor.def({                                                                   // 107
  visitNull: toRaw,                                                                       // 108
  visitPrimitive: toRaw,                                                                  // 109
  visitComment: toRaw,                                                                    // 110
  visitCharRef: toRaw,                                                                    // 111
  visitArray: function (array) {                                                          // 112
    var optimizability = getOptimizability(array);                                        // 113
    if (optimizability === OPTIMIZABLE.FULL) {                                            // 114
      return toRaw(array);                                                                // 115
    } else if (optimizability === OPTIMIZABLE.PARTS) {                                    // 116
      return TreeTransformer.prototype.visitArray.call(this, array);                      // 117
    } else {                                                                              // 118
      return array;                                                                       // 119
    }                                                                                     // 120
  },                                                                                      // 121
  visitTag: function (tag) {                                                              // 122
    var optimizability = getOptimizability(tag);                                          // 123
    if (optimizability === OPTIMIZABLE.FULL) {                                            // 124
      return toRaw(tag);                                                                  // 125
    } else if (optimizability === OPTIMIZABLE.PARTS) {                                    // 126
      return TreeTransformer.prototype.visitTag.call(this, tag);                          // 127
    } else {                                                                              // 128
      return tag;                                                                         // 129
    }                                                                                     // 130
  },                                                                                      // 131
  visitChildren: function (children) {                                                    // 132
    // don't optimize the children array into a Raw object!                               // 133
    return TreeTransformer.prototype.visitArray.call(this, children);                     // 134
  },                                                                                      // 135
  visitAttributes: function (attrs) {                                                     // 136
    return attrs;                                                                         // 137
  }                                                                                       // 138
});                                                                                       // 139
                                                                                          // 140
// Combine consecutive HTML.Raws.  Remove empty ones.                                     // 141
var RawCompactingVisitor = TreeTransformer.extend();                                      // 142
RawCompactingVisitor.def({                                                                // 143
  visitArray: function (array) {                                                          // 144
    var result = [];                                                                      // 145
    for (var i = 0; i < array.length; i++) {                                              // 146
      var item = array[i];                                                                // 147
      if ((item instanceof HTML.Raw) &&                                                   // 148
          ((! item.value) ||                                                              // 149
           (result.length &&                                                              // 150
            (result[result.length - 1] instanceof HTML.Raw)))) {                          // 151
        // two cases: item is an empty Raw, or previous item is                           // 152
        // a Raw as well.  In the latter case, replace the previous                       // 153
        // Raw with a longer one that includes the new Raw.                               // 154
        if (item.value) {                                                                 // 155
          result[result.length - 1] = HTML.Raw(                                           // 156
            result[result.length - 1].value + item.value);                                // 157
        }                                                                                 // 158
      } else {                                                                            // 159
        result.push(item);                                                                // 160
      }                                                                                   // 161
    }                                                                                     // 162
    return result;                                                                        // 163
  }                                                                                       // 164
});                                                                                       // 165
                                                                                          // 166
// Replace pointless Raws like `HTMl.Raw('foo')` that contain no special                  // 167
// characters with simple strings.                                                        // 168
var RawReplacingVisitor = TreeTransformer.extend();                                       // 169
RawReplacingVisitor.def({                                                                 // 170
  visitRaw: function (raw) {                                                              // 171
    var html = raw.value;                                                                 // 172
    if (html.indexOf('&') < 0 && html.indexOf('<') < 0) {                                 // 173
      return html;                                                                        // 174
    } else {                                                                              // 175
      return raw;                                                                         // 176
    }                                                                                     // 177
  }                                                                                       // 178
});                                                                                       // 179
                                                                                          // 180
SpacebarsCompiler.optimize = function (tree) {                                            // 181
  tree = (new OptimizingVisitor).visit(tree);                                             // 182
  tree = (new RawCompactingVisitor).visit(tree);                                          // 183
  tree = (new RawReplacingVisitor).visit(tree);                                           // 184
  return tree;                                                                            // 185
};                                                                                        // 186
                                                                                          // 187
////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                        //
// packages\spacebars-compiler\codegen.js                                                 //
//                                                                                        //
////////////////////////////////////////////////////////////////////////////////////////////
                                                                                          //
// ============================================================                           // 1
// Code-generation of template tags                                                       // 2
                                                                                          // 3
// The `CodeGen` class currently has no instance state, but in theory                     // 4
// it could be useful to track per-function state, like whether we                        // 5
// need to emit `var self = this` or not.                                                 // 6
var CodeGen = SpacebarsCompiler.CodeGen = function () {};                                 // 7
                                                                                          // 8
var builtInBlockHelpers = SpacebarsCompiler._builtInBlockHelpers = {                      // 9
  'if': 'Blaze.If',                                                                       // 10
  'unless': 'Blaze.Unless',                                                               // 11
  'with': 'Spacebars.With',                                                               // 12
  'each': 'Blaze.Each'                                                                    // 13
};                                                                                        // 14
                                                                                          // 15
                                                                                          // 16
// Some `UI.*` paths are special in that they generate code that                          // 17
 // doesn't folow the normal lookup rules for dotted symbols. The                         // 18
 // following names must be prefixed with `UI.` when you use them in a                    // 19
 // template.                                                                             // 20
var builtInUIPaths = {                                                                    // 21
  // `template` is a local variable defined in the generated render                       // 22
  // function for the template in which `UI.contentBlock` (or                             // 23
  // `UI.elseBlock`) is invoked. `template` is a reference to the                         // 24
  // template itself.                                                                     // 25
  'contentBlock': 'view.templateContentBlock',                                            // 26
  'elseBlock': 'view.templateElseBlock',                                                  // 27
                                                                                          // 28
  // `Template` is the global template namespace. If you define a                         // 29
  // template named `foo` in Spacebars, it gets defined as                                // 30
  // `Template.foo` in JavaScript.                                                        // 31
  'dynamic': 'Template.__dynamic'                                                         // 32
};                                                                                        // 33
                                                                                          // 34
// A "reserved name" can't be used as a <template> name.  This                            // 35
// function is used by the template file scanner.                                         // 36
SpacebarsCompiler.isReservedName = function (name) {                                      // 37
  return builtInBlockHelpers.hasOwnProperty(name);                                        // 38
};                                                                                        // 39
                                                                                          // 40
var makeObjectLiteral = function (obj) {                                                  // 41
  var parts = [];                                                                         // 42
  for (var k in obj)                                                                      // 43
    parts.push(BlazeTools.toObjectLiteralKey(k) + ': ' + obj[k]);                         // 44
  return '{' + parts.join(', ') + '}';                                                    // 45
};                                                                                        // 46
                                                                                          // 47
_.extend(CodeGen.prototype, {                                                             // 48
  codeGenTemplateTag: function (tag) {                                                    // 49
    var self = this;                                                                      // 50
    if (tag.position === HTMLTools.TEMPLATE_TAG_POSITION.IN_START_TAG) {                  // 51
      // Special dynamic attributes: `<div {{attrs}}>...`                                 // 52
      // only `tag.type === 'DOUBLE'` allowed (by earlier validation)                     // 53
      return BlazeTools.EmitCode('function () { return ' +                                // 54
          self.codeGenMustache(tag.path, tag.args, 'attrMustache')                        // 55
          + '; }');                                                                       // 56
    } else {                                                                              // 57
      if (tag.type === 'DOUBLE' || tag.type === 'TRIPLE') {                               // 58
        var code = self.codeGenMustache(tag.path, tag.args);                              // 59
        if (tag.type === 'TRIPLE') {                                                      // 60
          code = 'Spacebars.makeRaw(' + code + ')';                                       // 61
        }                                                                                 // 62
        if (tag.position !== HTMLTools.TEMPLATE_TAG_POSITION.IN_ATTRIBUTE) {              // 63
          // Reactive attributes are already wrapped in a function,                       // 64
          // and there's no fine-grained reactivity.                                      // 65
          // Anywhere else, we need to create a View.                                     // 66
          code = 'Blaze.View(function () { return ' + code + '; })';                      // 67
        }                                                                                 // 68
        return BlazeTools.EmitCode(code);                                                 // 69
      } else if (tag.type === 'INCLUSION' || tag.type === 'BLOCKOPEN') {                  // 70
        var path = tag.path;                                                              // 71
                                                                                          // 72
        if (tag.type === 'BLOCKOPEN' &&                                                   // 73
            builtInBlockHelpers.hasOwnProperty(path[0])) {                                // 74
          // if, unless, with, each.                                                      // 75
          //                                                                              // 76
          // If someone tries to do `{{> if}}`, we don't                                  // 77
          // get here, but an error is thrown when we try to codegen the path.            // 78
                                                                                          // 79
          // Note: If we caught these errors earlier, while scanning, we'd be able to     // 80
          // provide nice line numbers.                                                   // 81
          if (path.length > 1)                                                            // 82
            throw new Error("Unexpected dotted path beginning with " + path[0]);          // 83
          if (! tag.args.length)                                                          // 84
            throw new Error("#" + path[0] + " requires an argument");                     // 85
                                                                                          // 86
          // `args` must exist (tag.args.length > 0)                                      // 87
          var dataCode = self.codeGenInclusionDataFunc(tag.args) || 'null';               // 88
          // `content` must exist                                                         // 89
          var contentBlock = (('content' in tag) ?                                        // 90
                              self.codeGenBlock(tag.content) : null);                     // 91
          // `elseContent` may not exist                                                  // 92
          var elseContentBlock = (('elseContent' in tag) ?                                // 93
                                  self.codeGenBlock(tag.elseContent) : null);             // 94
                                                                                          // 95
          var callArgs = [dataCode, contentBlock];                                        // 96
          if (elseContentBlock)                                                           // 97
            callArgs.push(elseContentBlock);                                              // 98
                                                                                          // 99
          return BlazeTools.EmitCode(                                                     // 100
            builtInBlockHelpers[path[0]] + '(' + callArgs.join(', ') + ')');              // 101
                                                                                          // 102
        } else {                                                                          // 103
          var compCode = self.codeGenPath(path, {lookupTemplate: true});                  // 104
          if (path.length > 1) {                                                          // 105
            // capture reactivity                                                         // 106
            compCode = 'function () { return Spacebars.call(' + compCode +                // 107
              '); }';                                                                     // 108
          }                                                                               // 109
                                                                                          // 110
          var dataCode = self.codeGenInclusionDataFunc(tag.args);                         // 111
          var content = (('content' in tag) ?                                             // 112
                         self.codeGenBlock(tag.content) : null);                          // 113
          var elseContent = (('elseContent' in tag) ?                                     // 114
                             self.codeGenBlock(tag.elseContent) : null);                  // 115
                                                                                          // 116
          var includeArgs = [compCode];                                                   // 117
          if (content) {                                                                  // 118
            includeArgs.push(content);                                                    // 119
            if (elseContent)                                                              // 120
              includeArgs.push(elseContent);                                              // 121
          }                                                                               // 122
                                                                                          // 123
          var includeCode =                                                               // 124
                'Spacebars.include(' + includeArgs.join(', ') + ')';                      // 125
                                                                                          // 126
          // calling convention compat -- set the data context around the                 // 127
          // entire inclusion, so that if the name of the inclusion is                    // 128
          // a helper function, it gets the data context in `this`.                       // 129
          // This makes for a pretty confusing calling convention --                      // 130
          // In `{{#foo bar}}`, `foo` is evaluated in the context of `bar`                // 131
          // -- but it's what we shipped for 0.8.0.  The rationale is that                // 132
          // `{{#foo bar}}` is sugar for `{{#with bar}}{{#foo}}...`.                      // 133
          if (dataCode) {                                                                 // 134
            includeCode =                                                                 // 135
              'Spacebars.TemplateWith(' + dataCode + ', function () { return ' +          // 136
              includeCode + '; })';                                                       // 137
          }                                                                               // 138
                                                                                          // 139
          if (path[0] === 'UI' &&                                                         // 140
              (path[1] === 'contentBlock' || path[1] === 'elseBlock')) {                  // 141
            includeCode = 'Blaze.InOuterTemplateScope(view, function () { return '        // 142
              + includeCode + '; })';                                                     // 143
          }                                                                               // 144
                                                                                          // 145
          return BlazeTools.EmitCode(includeCode);                                        // 146
        }                                                                                 // 147
      } else {                                                                            // 148
        // Can't get here; TemplateTag validation should catch any                        // 149
        // inappropriate tag types that might come out of the parser.                     // 150
        throw new Error("Unexpected template tag type: " + tag.type);                     // 151
      }                                                                                   // 152
    }                                                                                     // 153
  },                                                                                      // 154
                                                                                          // 155
  // `path` is an array of at least one string.                                           // 156
  //                                                                                      // 157
  // If `path.length > 1`, the generated code may be reactive                             // 158
  // (i.e. it may invalidate the current computation).                                    // 159
  //                                                                                      // 160
  // No code is generated to call the result if it's a function.                          // 161
  //                                                                                      // 162
  // Options:                                                                             // 163
  //                                                                                      // 164
  // - lookupTemplate {Boolean} If true, generated code also looks in                     // 165
  //   the list of templates. (After helpers, before data context).                       // 166
  //   Used when generating code for `{{> foo}}` or `{{#foo}}`. Only                      // 167
  //   used for non-dotted paths.                                                         // 168
  codeGenPath: function (path, opts) {                                                    // 169
    if (builtInBlockHelpers.hasOwnProperty(path[0]))                                      // 170
      throw new Error("Can't use the built-in '" + path[0] + "' here");                   // 171
    // Let `{{#if UI.contentBlock}}` check whether this template was invoked via          // 172
    // inclusion or as a block helper, in addition to supporting                          // 173
    // `{{> UI.contentBlock}}`.                                                           // 174
    if (path.length >= 2 &&                                                               // 175
        path[0] === 'UI' && builtInUIPaths.hasOwnProperty(path[1])) {                     // 176
      if (path.length > 2)                                                                // 177
        throw new Error("Unexpected dotted path beginning with " +                        // 178
                        path[0] + '.' + path[1]);                                         // 179
      return builtInUIPaths[path[1]];                                                     // 180
    }                                                                                     // 181
                                                                                          // 182
    var firstPathItem = BlazeTools.toJSLiteral(path[0]);                                  // 183
    var lookupMethod = 'lookup';                                                          // 184
    if (opts && opts.lookupTemplate && path.length === 1)                                 // 185
      lookupMethod = 'lookupTemplate';                                                    // 186
    var code = 'view.' + lookupMethod + '(' + firstPathItem + ')';                        // 187
                                                                                          // 188
    if (path.length > 1) {                                                                // 189
      code = 'Spacebars.dot(' + code + ', ' +                                             // 190
        _.map(path.slice(1), BlazeTools.toJSLiteral).join(', ') + ')';                    // 191
    }                                                                                     // 192
                                                                                          // 193
    return code;                                                                          // 194
  },                                                                                      // 195
                                                                                          // 196
  // Generates code for an `[argType, argValue]` argument spec,                           // 197
  // ignoring the third element (keyword argument name) if present.                       // 198
  //                                                                                      // 199
  // The resulting code may be reactive (in the case of a PATH of                         // 200
  // more than one element) and is not wrapped in a closure.                              // 201
  codeGenArgValue: function (arg) {                                                       // 202
    var self = this;                                                                      // 203
                                                                                          // 204
    var argType = arg[0];                                                                 // 205
    var argValue = arg[1];                                                                // 206
                                                                                          // 207
    var argCode;                                                                          // 208
    switch (argType) {                                                                    // 209
    case 'STRING':                                                                        // 210
    case 'NUMBER':                                                                        // 211
    case 'BOOLEAN':                                                                       // 212
    case 'NULL':                                                                          // 213
      argCode = BlazeTools.toJSLiteral(argValue);                                         // 214
      break;                                                                              // 215
    case 'PATH':                                                                          // 216
      argCode = self.codeGenPath(argValue);                                               // 217
      break;                                                                              // 218
    default:                                                                              // 219
      // can't get here                                                                   // 220
      throw new Error("Unexpected arg type: " + argType);                                 // 221
    }                                                                                     // 222
                                                                                          // 223
    return argCode;                                                                       // 224
  },                                                                                      // 225
                                                                                          // 226
  // Generates a call to `Spacebars.fooMustache` on evaluated arguments.                  // 227
  // The resulting code has no function literals and must be wrapped in                   // 228
  // one for fine-grained reactivity.                                                     // 229
  codeGenMustache: function (path, args, mustacheType) {                                  // 230
    var self = this;                                                                      // 231
                                                                                          // 232
    var nameCode = self.codeGenPath(path);                                                // 233
    var argCode = self.codeGenMustacheArgs(args);                                         // 234
    var mustache = (mustacheType || 'mustache');                                          // 235
                                                                                          // 236
    return 'Spacebars.' + mustache + '(' + nameCode +                                     // 237
      (argCode ? ', ' + argCode.join(', ') : '') + ')';                                   // 238
  },                                                                                      // 239
                                                                                          // 240
  // returns: array of source strings, or null if no                                      // 241
  // args at all.                                                                         // 242
  codeGenMustacheArgs: function (tagArgs) {                                               // 243
    var self = this;                                                                      // 244
                                                                                          // 245
    var kwArgs = null; // source -> source                                                // 246
    var args = null; // [source]                                                          // 247
                                                                                          // 248
    // tagArgs may be null                                                                // 249
    _.each(tagArgs, function (arg) {                                                      // 250
      var argCode = self.codeGenArgValue(arg);                                            // 251
                                                                                          // 252
      if (arg.length > 2) {                                                               // 253
        // keyword argument (represented as [type, value, name])                          // 254
        kwArgs = (kwArgs || {});                                                          // 255
        kwArgs[arg[2]] = argCode;                                                         // 256
      } else {                                                                            // 257
        // positional argument                                                            // 258
        args = (args || []);                                                              // 259
        args.push(argCode);                                                               // 260
      }                                                                                   // 261
    });                                                                                   // 262
                                                                                          // 263
    // put kwArgs in options dictionary at end of args                                    // 264
    if (kwArgs) {                                                                         // 265
      args = (args || []);                                                                // 266
      args.push('Spacebars.kw(' + makeObjectLiteral(kwArgs) + ')');                       // 267
    }                                                                                     // 268
                                                                                          // 269
    return args;                                                                          // 270
  },                                                                                      // 271
                                                                                          // 272
  codeGenBlock: function (content) {                                                      // 273
    return SpacebarsCompiler.codeGen(content);                                            // 274
  },                                                                                      // 275
                                                                                          // 276
  codeGenInclusionDataFunc: function (args) {                                             // 277
    var self = this;                                                                      // 278
                                                                                          // 279
    var dataFuncCode = null;                                                              // 280
                                                                                          // 281
    if (! args.length) {                                                                  // 282
      // e.g. `{{#foo}}`                                                                  // 283
      return null;                                                                        // 284
    } else if (args[0].length === 3) {                                                    // 285
      // keyword arguments only, e.g. `{{> point x=1 y=2}}`                               // 286
      var dataProps = {};                                                                 // 287
      _.each(args, function (arg) {                                                       // 288
        var argKey = arg[2];                                                              // 289
        dataProps[argKey] = 'Spacebars.call(' + self.codeGenArgValue(arg) + ')';          // 290
      });                                                                                 // 291
      dataFuncCode = makeObjectLiteral(dataProps);                                        // 292
    } else if (args[0][0] !== 'PATH') {                                                   // 293
      // literal first argument, e.g. `{{> foo "blah"}}`                                  // 294
      //                                                                                  // 295
      // tag validation has confirmed, in this case, that there is only                   // 296
      // one argument (`args.length === 1`)                                               // 297
      dataFuncCode = self.codeGenArgValue(args[0]);                                       // 298
    } else if (args.length === 1) {                                                       // 299
      // one argument, must be a PATH                                                     // 300
      dataFuncCode = 'Spacebars.call(' + self.codeGenPath(args[0][1]) + ')';              // 301
    } else {                                                                              // 302
      // Multiple positional arguments; treat them as a nested                            // 303
      // "data mustache"                                                                  // 304
      dataFuncCode = self.codeGenMustache(args[0][1], args.slice(1),                      // 305
                                          'dataMustache');                                // 306
    }                                                                                     // 307
                                                                                          // 308
    return 'function () { return ' + dataFuncCode + '; }';                                // 309
  }                                                                                       // 310
                                                                                          // 311
});                                                                                       // 312
                                                                                          // 313
////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                        //
// packages\spacebars-compiler\compiler.js                                                //
//                                                                                        //
////////////////////////////////////////////////////////////////////////////////////////////
                                                                                          //
                                                                                          // 1
SpacebarsCompiler.parse = function (input) {                                              // 2
                                                                                          // 3
  var tree = HTMLTools.parseFragment(                                                     // 4
    input,                                                                                // 5
    { getTemplateTag: TemplateTag.parseCompleteTag });                                    // 6
                                                                                          // 7
  return tree;                                                                            // 8
};                                                                                        // 9
                                                                                          // 10
SpacebarsCompiler.compile = function (input, options) {                                   // 11
  var tree = SpacebarsCompiler.parse(input);                                              // 12
  return SpacebarsCompiler.codeGen(tree, options);                                        // 13
};                                                                                        // 14
                                                                                          // 15
SpacebarsCompiler._TemplateTagReplacer = HTML.TransformingVisitor.extend();               // 16
SpacebarsCompiler._TemplateTagReplacer.def({                                              // 17
  visitObject: function (x) {                                                             // 18
    if (x instanceof HTMLTools.TemplateTag) {                                             // 19
                                                                                          // 20
      // Make sure all TemplateTags in attributes have the right                          // 21
      // `.position` set on them.  This is a bit of a hack                                // 22
      // (we shouldn't be mutating that here), but it allows                              // 23
      // cleaner codegen of "synthetic" attributes like TEXTAREA's                        // 24
      // "value", where the template tags were originally not                             // 25
      // in an attribute.                                                                 // 26
      if (this.inAttributeValue)                                                          // 27
        x.position = HTMLTools.TEMPLATE_TAG_POSITION.IN_ATTRIBUTE;                        // 28
                                                                                          // 29
      return this.codegen.codeGenTemplateTag(x);                                          // 30
    }                                                                                     // 31
                                                                                          // 32
    return HTML.TransformingVisitor.prototype.visitObject.call(this, x);                  // 33
  },                                                                                      // 34
  visitAttributes: function (attrs) {                                                     // 35
    if (attrs instanceof HTMLTools.TemplateTag)                                           // 36
      return this.codegen.codeGenTemplateTag(attrs);                                      // 37
                                                                                          // 38
    // call super (e.g. for case where `attrs` is an array)                               // 39
    return HTML.TransformingVisitor.prototype.visitAttributes.call(this, attrs);          // 40
  },                                                                                      // 41
  visitAttribute: function (name, value, tag) {                                           // 42
    this.inAttributeValue = true;                                                         // 43
    var result = this.visit(value);                                                       // 44
    this.inAttributeValue = false;                                                        // 45
                                                                                          // 46
    if (result !== value) {                                                               // 47
      // some template tags must have been replaced, because otherwise                    // 48
      // we try to keep things `===` when transforming.  Wrap the code                    // 49
      // in a function as per the rules.  You can't have                                  // 50
      // `{id: Blaze.View(...)}` as an attributes dict because the View                   // 51
      // would be rendered more than once; you need to wrap it in a function              // 52
      // so that it's a different View each time.                                         // 53
      return BlazeTools.EmitCode(this.codegen.codeGenBlock(result));                      // 54
    }                                                                                     // 55
    return result;                                                                        // 56
  }                                                                                       // 57
});                                                                                       // 58
                                                                                          // 59
SpacebarsCompiler.codeGen = function (parseTree, options) {                               // 60
  // is this a template, rather than a block passed to                                    // 61
  // a block helper, say                                                                  // 62
  var isTemplate = (options && options.isTemplate);                                       // 63
  var isBody = (options && options.isBody);                                               // 64
                                                                                          // 65
  var tree = parseTree;                                                                   // 66
                                                                                          // 67
  // The flags `isTemplate` and `isBody` are kind of a hack.                              // 68
  if (isTemplate || isBody) {                                                             // 69
    // optimizing fragments would require being smarter about whether we are              // 70
    // in a TEXTAREA, say.                                                                // 71
    tree = SpacebarsCompiler.optimize(tree);                                              // 72
  }                                                                                       // 73
                                                                                          // 74
  var codegen = new SpacebarsCompiler.CodeGen;                                            // 75
  tree = (new SpacebarsCompiler._TemplateTagReplacer(                                     // 76
    {codegen: codegen})).visit(tree);                                                     // 77
                                                                                          // 78
  var code = '(function () { ';                                                           // 79
  if (isTemplate || isBody) {                                                             // 80
    code += 'var view = this; ';                                                          // 81
  }                                                                                       // 82
  code += 'return ';                                                                      // 83
  code += BlazeTools.toJS(tree);                                                          // 84
  code += '; })';                                                                         // 85
                                                                                          // 86
  code = SpacebarsCompiler._beautify(code);                                               // 87
                                                                                          // 88
  return code;                                                                            // 89
};                                                                                        // 90
                                                                                          // 91
SpacebarsCompiler._beautify = function (code) {                                           // 92
  if (Package.minifiers && Package.minifiers.UglifyJSMinify) {                            // 93
    var result = UglifyJSMinify(code,                                                     // 94
                                { fromString: true,                                       // 95
                                  mangle: false,                                          // 96
                                  compress: false,                                        // 97
                                  output: { beautify: true,                               // 98
                                            indent_level: 2,                              // 99
                                            width: 80 } });                               // 100
    var output = result.code;                                                             // 101
    // Uglify interprets our expression as a statement and may add a semicolon.           // 102
    // Strip trailing semicolon.                                                          // 103
    output = output.replace(/;$/, '');                                                    // 104
    return output;                                                                        // 105
  } else {                                                                                // 106
    // don't actually beautify; no UglifyJS                                               // 107
    return code;                                                                          // 108
  }                                                                                       // 109
};                                                                                        // 110
                                                                                          // 111
////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['spacebars-compiler'] = {
  SpacebarsCompiler: SpacebarsCompiler
};

})();

//# sourceMappingURL=spacebars-compiler.js.map
