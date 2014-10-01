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
var Deps = Package.deps.Deps;
var LocalCollection = Package.minimongo.LocalCollection;
var Minimongo = Package.minimongo.Minimongo;
var _ = Package.underscore._;
var Random = Package.random.Random;

/* Package-scope variables */
var ObserveSequence;

(function () {

//////////////////////////////////////////////////////////////////////////////////////////
//                                                                                      //
// packages\observe-sequence\observe_sequence.js                                        //
//                                                                                      //
//////////////////////////////////////////////////////////////////////////////////////////
                                                                                        //
var warn = function () {                                                                // 1
  if (ObserveSequence._suppressWarnings) {                                              // 2
    ObserveSequence._suppressWarnings--;                                                // 3
  } else {                                                                              // 4
    if (typeof console !== 'undefined' && console.warn)                                 // 5
      console.warn.apply(console, arguments);                                           // 6
                                                                                        // 7
    ObserveSequence._loggedWarnings++;                                                  // 8
  }                                                                                     // 9
};                                                                                      // 10
                                                                                        // 11
var idStringify = LocalCollection._idStringify;                                         // 12
var idParse = LocalCollection._idParse;                                                 // 13
                                                                                        // 14
ObserveSequence = {                                                                     // 15
  _suppressWarnings: 0,                                                                 // 16
  _loggedWarnings: 0,                                                                   // 17
                                                                                        // 18
  // A mechanism similar to cursor.observe which receives a reactive                    // 19
  // function returning a sequence type and firing appropriate callbacks                // 20
  // when the value changes.                                                            // 21
  //                                                                                    // 22
  // @param sequenceFunc {Function} a reactive function returning a                     // 23
  //     sequence type. The currently supported sequence types are:                     // 24
  //     'null', arrays and cursors.                                                    // 25
  //                                                                                    // 26
  // @param callbacks {Object} similar to a specific subset of                          // 27
  //     callbacks passed to `cursor.observe`                                           // 28
  //     (http://docs.meteor.com/#observe), with minor variations to                    // 29
  //     support the fact that not all sequences contain objects with                   // 30
  //     _id fields.  Specifically:                                                     // 31
  //                                                                                    // 32
  //     * addedAt(id, item, atIndex, beforeId)                                         // 33
  //     * changedAt(id, newItem, oldItem, atIndex)                                     // 34
  //     * removedAt(id, oldItem, atIndex)                                              // 35
  //     * movedTo(id, item, fromIndex, toIndex, beforeId)                              // 36
  //                                                                                    // 37
  // @returns {Object(stop: Function)} call 'stop' on the return value                  // 38
  //     to stop observing this sequence function.                                      // 39
  //                                                                                    // 40
  // We don't make any assumptions about our ability to compare sequence                // 41
  // elements (ie, we don't assume EJSON.equals works; maybe there is extra             // 42
  // state/random methods on the objects) so unlike cursor.observe, we may              // 43
  // sometimes call changedAt() when nothing actually changed.                          // 44
  // XXX consider if we *can* make the stronger assumption and avoid                    // 45
  //     no-op changedAt calls (in some cases?)                                         // 46
  //                                                                                    // 47
  // XXX currently only supports the callbacks used by our                              // 48
  // implementation of {{#each}}, but this can be expanded.                             // 49
  //                                                                                    // 50
  // XXX #each doesn't use the indices (though we'll eventually need                    // 51
  // a way to get them when we support `@index`), but calling                           // 52
  // `cursor.observe` causes the index to be calculated on every                        // 53
  // callback using a linear scan (unless you turn it off by passing                    // 54
  // `_no_indices`).  Any way to avoid calculating indices on a pure                    // 55
  // cursor observe like we used to?                                                    // 56
  observe: function (sequenceFunc, callbacks) {                                         // 57
    var lastSeq = null;                                                                 // 58
    var activeObserveHandle = null;                                                     // 59
                                                                                        // 60
    // 'lastSeqArray' contains the previous value of the sequence                       // 61
    // we're observing. It is an array of objects with '_id' and                        // 62
    // 'item' fields.  'item' is the element in the array, or the                       // 63
    // document in the cursor.                                                          // 64
    //                                                                                  // 65
    // '_id' is whichever of the following is relevant, unless it has                   // 66
    // already appeared -- in which case it's randomly generated.                       // 67
    //                                                                                  // 68
    // * if 'item' is an object:                                                        // 69
    //   * an '_id' field, if present                                                   // 70
    //   * otherwise, the index in the array                                            // 71
    //                                                                                  // 72
    // * if 'item' is a number or string, use that value                                // 73
    //                                                                                  // 74
    // XXX this can be generalized by allowing {{#each}} to accept a                    // 75
    // general 'key' argument which could be a function, a dotted                       // 76
    // field name, or the special @index value.                                         // 77
    var lastSeqArray = []; // elements are objects of form {_id, item}                  // 78
    var computation = Deps.autorun(function () {                                        // 79
      var seq = sequenceFunc();                                                         // 80
                                                                                        // 81
      Deps.nonreactive(function () {                                                    // 82
        var seqArray; // same structure as `lastSeqArray` above.                        // 83
                                                                                        // 84
        // If we were previously observing a cursor, replace lastSeqArray with          // 85
        // more up-to-date information (specifically, the state of the observe          // 86
        // before it was stopped, which may be older than the DB).                      // 87
        if (activeObserveHandle) {                                                      // 88
          lastSeqArray = _.map(activeObserveHandle._fetch(), function (doc) {           // 89
            return {_id: doc._id, item: doc};                                           // 90
          });                                                                           // 91
          activeObserveHandle.stop();                                                   // 92
          activeObserveHandle = null;                                                   // 93
        }                                                                               // 94
                                                                                        // 95
        if (!seq) {                                                                     // 96
          seqArray = [];                                                                // 97
          diffArray(lastSeqArray, seqArray, callbacks);                                 // 98
        } else if (seq instanceof Array) {                                              // 99
          var idsUsed = {};                                                             // 100
          seqArray = _.map(seq, function (item, index) {                                // 101
            var id;                                                                     // 102
            if (typeof item === 'string') {                                             // 103
              // ensure not empty, since other layers (eg DomRange) assume this as well // 104
              id = "-" + item;                                                          // 105
            } else if (typeof item === 'number' ||                                      // 106
                       typeof item === 'boolean' ||                                     // 107
                       item === undefined) {                                            // 108
              id = item;                                                                // 109
            } else if (typeof item === 'object') {                                      // 110
              id = (item && item._id) || index;                                         // 111
            } else {                                                                    // 112
              throw new Error("{{#each}} doesn't support arrays with " +                // 113
                              "elements of type " + typeof item);                       // 114
            }                                                                           // 115
                                                                                        // 116
            var idString = idStringify(id);                                             // 117
            if (idsUsed[idString]) {                                                    // 118
              if (typeof item === 'object' && '_id' in item)                            // 119
                warn("duplicate id " + id + " in", seq);                                // 120
              id = Random.id();                                                         // 121
            } else {                                                                    // 122
              idsUsed[idString] = true;                                                 // 123
            }                                                                           // 124
                                                                                        // 125
            return { _id: id, item: item };                                             // 126
          });                                                                           // 127
                                                                                        // 128
          diffArray(lastSeqArray, seqArray, callbacks);                                 // 129
        } else if (isStoreCursor(seq)) {                                                // 130
          var cursor = seq;                                                             // 131
          seqArray = [];                                                                // 132
                                                                                        // 133
          var initial = true; // are we observing initial data from cursor?             // 134
          activeObserveHandle = cursor.observe({                                        // 135
            addedAt: function (document, atIndex, before) {                             // 136
              if (initial) {                                                            // 137
                // keep track of initial data so that we can diff once                  // 138
                // we exit `observe`.                                                   // 139
                if (before !== null)                                                    // 140
                  throw new Error("Expected initial data from observe in order");       // 141
                seqArray.push({ _id: document._id, item: document });                   // 142
              } else {                                                                  // 143
                callbacks.addedAt(document._id, document, atIndex, before);             // 144
              }                                                                         // 145
            },                                                                          // 146
            changedAt: function (newDocument, oldDocument, atIndex) {                   // 147
              callbacks.changedAt(newDocument._id, newDocument, oldDocument,            // 148
                                  atIndex);                                             // 149
            },                                                                          // 150
            removedAt: function (oldDocument, atIndex) {                                // 151
              callbacks.removedAt(oldDocument._id, oldDocument, atIndex);               // 152
            },                                                                          // 153
            movedTo: function (document, fromIndex, toIndex, before) {                  // 154
              callbacks.movedTo(                                                        // 155
                document._id, document, fromIndex, toIndex, before);                    // 156
            }                                                                           // 157
          });                                                                           // 158
          initial = false;                                                              // 159
                                                                                        // 160
          // diff the old sequnce with initial data in the new cursor. this will        // 161
          // fire `addedAt` callbacks on the initial data.                              // 162
          diffArray(lastSeqArray, seqArray, callbacks);                                 // 163
                                                                                        // 164
        } else {                                                                        // 165
          throw badSequenceError();                                                     // 166
        }                                                                               // 167
                                                                                        // 168
        lastSeq = seq;                                                                  // 169
        lastSeqArray = seqArray;                                                        // 170
      });                                                                               // 171
    });                                                                                 // 172
                                                                                        // 173
    return {                                                                            // 174
      stop: function () {                                                               // 175
        computation.stop();                                                             // 176
        if (activeObserveHandle)                                                        // 177
          activeObserveHandle.stop();                                                   // 178
      }                                                                                 // 179
    };                                                                                  // 180
  },                                                                                    // 181
                                                                                        // 182
  // Fetch the items of `seq` into an array, where `seq` is of one of the               // 183
  // sequence types accepted by `observe`.  If `seq` is a cursor, a                     // 184
  // dependency is established.                                                         // 185
  fetch: function (seq) {                                                               // 186
    if (!seq) {                                                                         // 187
      return [];                                                                        // 188
    } else if (seq instanceof Array) {                                                  // 189
      return seq;                                                                       // 190
    } else if (isStoreCursor(seq)) {                                                    // 191
      return seq.fetch();                                                               // 192
    } else {                                                                            // 193
      throw badSequenceError();                                                         // 194
    }                                                                                   // 195
  }                                                                                     // 196
};                                                                                      // 197
                                                                                        // 198
var badSequenceError = function () {                                                    // 199
  return new Error("{{#each}} currently only accepts " +                                // 200
                   "arrays, cursors or falsey values.");                                // 201
};                                                                                      // 202
                                                                                        // 203
var isStoreCursor = function (cursor) {                                                 // 204
  return cursor && _.isObject(cursor) &&                                                // 205
    _.isFunction(cursor.observe) && _.isFunction(cursor.fetch);                         // 206
};                                                                                      // 207
                                                                                        // 208
// Calculates the differences between `lastSeqArray` and                                // 209
// `seqArray` and calls appropriate functions from `callbacks`.                         // 210
// Reuses Minimongo's diff algorithm implementation.                                    // 211
var diffArray = function (lastSeqArray, seqArray, callbacks) {                          // 212
  var diffFn = Package.minimongo.LocalCollection._diffQueryOrderedChanges;              // 213
  var oldIdObjects = [];                                                                // 214
  var newIdObjects = [];                                                                // 215
  var posOld = {}; // maps from idStringify'd ids                                       // 216
  var posNew = {}; // ditto                                                             // 217
  var posCur = {};                                                                      // 218
  var lengthCur = lastSeqArray.length;                                                  // 219
                                                                                        // 220
  _.each(seqArray, function (doc, i) {                                                  // 221
    newIdObjects.push({_id: doc._id});                                                  // 222
    posNew[idStringify(doc._id)] = i;                                                   // 223
  });                                                                                   // 224
  _.each(lastSeqArray, function (doc, i) {                                              // 225
    oldIdObjects.push({_id: doc._id});                                                  // 226
    posOld[idStringify(doc._id)] = i;                                                   // 227
    posCur[idStringify(doc._id)] = i;                                                   // 228
  });                                                                                   // 229
                                                                                        // 230
  // Arrays can contain arbitrary objects. We don't diff the                            // 231
  // objects. Instead we always fire 'changedAt' callback on every                      // 232
  // object. The consumer of `observe-sequence` should deal with                        // 233
  // it appropriately.                                                                  // 234
  diffFn(oldIdObjects, newIdObjects, {                                                  // 235
    addedBefore: function (id, doc, before) {                                           // 236
      var position = before ? posCur[idStringify(before)] : lengthCur;                  // 237
                                                                                        // 238
      _.each(posCur, function (pos, id) {                                               // 239
        if (pos >= position)                                                            // 240
          posCur[id]++;                                                                 // 241
      });                                                                               // 242
                                                                                        // 243
      lengthCur++;                                                                      // 244
      posCur[idStringify(id)] = position;                                               // 245
                                                                                        // 246
      callbacks.addedAt(                                                                // 247
        id,                                                                             // 248
        seqArray[posNew[idStringify(id)]].item,                                         // 249
        position,                                                                       // 250
        before);                                                                        // 251
    },                                                                                  // 252
    movedBefore: function (id, before) {                                                // 253
      var prevPosition = posCur[idStringify(id)];                                       // 254
      var position = before ? posCur[idStringify(before)] : lengthCur - 1;              // 255
                                                                                        // 256
      _.each(posCur, function (pos, id) {                                               // 257
        if (pos >= prevPosition && pos <= position)                                     // 258
          posCur[id]--;                                                                 // 259
        else if (pos <= prevPosition && pos >= position)                                // 260
          posCur[id]++;                                                                 // 261
      });                                                                               // 262
                                                                                        // 263
      posCur[idStringify(id)] = position;                                               // 264
                                                                                        // 265
      callbacks.movedTo(                                                                // 266
        id,                                                                             // 267
        seqArray[posNew[idStringify(id)]].item,                                         // 268
        prevPosition,                                                                   // 269
        position,                                                                       // 270
        before);                                                                        // 271
    },                                                                                  // 272
    removed: function (id) {                                                            // 273
      var prevPosition = posCur[idStringify(id)];                                       // 274
                                                                                        // 275
      _.each(posCur, function (pos, id) {                                               // 276
        if (pos >= prevPosition)                                                        // 277
          posCur[id]--;                                                                 // 278
      });                                                                               // 279
                                                                                        // 280
      delete posCur[idStringify(id)];                                                   // 281
      lengthCur--;                                                                      // 282
                                                                                        // 283
      callbacks.removedAt(                                                              // 284
        id,                                                                             // 285
        lastSeqArray[posOld[idStringify(id)]].item,                                     // 286
        prevPosition);                                                                  // 287
    }                                                                                   // 288
  });                                                                                   // 289
                                                                                        // 290
  _.each(posNew, function (pos, idString) {                                             // 291
    var id = idParse(idString);                                                         // 292
    if (_.has(posOld, idString)) {                                                      // 293
      // specifically for primitive types, compare equality before                      // 294
      // firing the 'changedAt' callback. otherwise, always fire it                     // 295
      // because doing a deep EJSON comparison is not guaranteed to                     // 296
      // work (an array can contain arbitrary objects, and 'transform'                  // 297
      // can be used on cursors). also, deep diffing is not                             // 298
      // necessarily the most efficient (if only a specific subfield                    // 299
      // of the object is later accessed).                                              // 300
      var newItem = seqArray[pos].item;                                                 // 301
      var oldItem = lastSeqArray[posOld[idString]].item;                                // 302
                                                                                        // 303
      if (typeof newItem === 'object' || newItem !== oldItem)                           // 304
          callbacks.changedAt(id, newItem, oldItem, pos);                               // 305
      }                                                                                 // 306
  });                                                                                   // 307
};                                                                                      // 308
                                                                                        // 309
//////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['observe-sequence'] = {
  ObserveSequence: ObserveSequence
};

})();

//# sourceMappingURL=aaa58b01211bfb39f1667a01d931a4ab15fd2526.map
