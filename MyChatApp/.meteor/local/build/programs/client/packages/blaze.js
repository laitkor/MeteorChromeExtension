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
var _ = Package.underscore._;
var HTML = Package.htmljs.HTML;
var ObserveSequence = Package['observe-sequence'].ObserveSequence;

/* Package-scope variables */
var Blaze, AttributeHandler, makeAttributeHandler, ElementAttributesUpdater;

(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                        //
// packages\blaze\preamble.js                                                                             //
//                                                                                                        //
////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                          //
Blaze = {};                                                                                               // 1
                                                                                                          // 2
////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                        //
// packages\blaze\dombackend.js                                                                           //
//                                                                                                        //
////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                          //
var DOMBackend = {};                                                                                      // 1
Blaze.DOMBackend = DOMBackend;                                                                            // 2
                                                                                                          // 3
var $jq = (typeof jQuery !== 'undefined' ? jQuery :                                                       // 4
           (typeof Package !== 'undefined' ?                                                              // 5
            Package.jquery && Package.jquery.jQuery : null));                                             // 6
if (! $jq)                                                                                                // 7
  throw new Error("jQuery not found");                                                                    // 8
                                                                                                          // 9
DOMBackend._$jq = $jq;                                                                                    // 10
                                                                                                          // 11
DOMBackend.parseHTML = function (html) {                                                                  // 12
  // Return an array of nodes.                                                                            // 13
  //                                                                                                      // 14
  // jQuery does fancy stuff like creating an appropriate                                                 // 15
  // container element and setting innerHTML on it, as well                                               // 16
  // as working around various IE quirks.                                                                 // 17
  return $jq.parseHTML(html) || [];                                                                       // 18
};                                                                                                        // 19
                                                                                                          // 20
DOMBackend.Events = {                                                                                     // 21
  // `selector` is non-null.  `type` is one type (but                                                     // 22
  // may be in backend-specific form, e.g. have namespaces).                                              // 23
  // Order fired must be order bound.                                                                     // 24
  delegateEvents: function (elem, type, selector, handler) {                                              // 25
    $jq(elem).on(type, selector, handler);                                                                // 26
  },                                                                                                      // 27
                                                                                                          // 28
  undelegateEvents: function (elem, type, handler) {                                                      // 29
    $jq(elem).off(type, '**', handler);                                                                   // 30
  },                                                                                                      // 31
                                                                                                          // 32
  bindEventCapturer: function (elem, type, selector, handler) {                                           // 33
    var $elem = $jq(elem);                                                                                // 34
                                                                                                          // 35
    var wrapper = function (event) {                                                                      // 36
      event = $jq.event.fix(event);                                                                       // 37
      event.currentTarget = event.target;                                                                 // 38
                                                                                                          // 39
      // Note: It might improve jQuery interop if we called into jQuery                                   // 40
      // here somehow.  Since we don't use jQuery to dispatch the event,                                  // 41
      // we don't fire any of jQuery's event hooks or anything.  However,                                 // 42
      // since jQuery can't bind capturing handlers, it's not clear                                       // 43
      // where we would hook in.  Internal jQuery functions like `dispatch`                               // 44
      // are too high-level.                                                                              // 45
      var $target = $jq(event.currentTarget);                                                             // 46
      if ($target.is($elem.find(selector)))                                                               // 47
        handler.call(elem, event);                                                                        // 48
    };                                                                                                    // 49
                                                                                                          // 50
    handler._meteorui_wrapper = wrapper;                                                                  // 51
                                                                                                          // 52
    type = DOMBackend.Events.parseEventType(type);                                                        // 53
    // add *capturing* event listener                                                                     // 54
    elem.addEventListener(type, wrapper, true);                                                           // 55
  },                                                                                                      // 56
                                                                                                          // 57
  unbindEventCapturer: function (elem, type, handler) {                                                   // 58
    type = DOMBackend.Events.parseEventType(type);                                                        // 59
    elem.removeEventListener(type, handler._meteorui_wrapper, true);                                      // 60
  },                                                                                                      // 61
                                                                                                          // 62
  parseEventType: function (type) {                                                                       // 63
    // strip off namespaces                                                                               // 64
    var dotLoc = type.indexOf('.');                                                                       // 65
    if (dotLoc >= 0)                                                                                      // 66
      return type.slice(0, dotLoc);                                                                       // 67
    return type;                                                                                          // 68
  }                                                                                                       // 69
};                                                                                                        // 70
                                                                                                          // 71
                                                                                                          // 72
///// Removal detection and interoperability.                                                             // 73
                                                                                                          // 74
// For an explanation of this technique, see:                                                             // 75
// http://bugs.jquery.com/ticket/12213#comment:23 .                                                       // 76
//                                                                                                        // 77
// In short, an element is considered "removed" when jQuery                                               // 78
// cleans up its *private* userdata on the element,                                                       // 79
// which we can detect using a custom event with a teardown                                               // 80
// hook.                                                                                                  // 81
                                                                                                          // 82
var NOOP = function () {};                                                                                // 83
                                                                                                          // 84
// Circular doubly-linked list                                                                            // 85
var TeardownCallback = function (func) {                                                                  // 86
  this.next = this;                                                                                       // 87
  this.prev = this;                                                                                       // 88
  this.func = func;                                                                                       // 89
};                                                                                                        // 90
                                                                                                          // 91
// Insert newElt before oldElt in the circular list                                                       // 92
TeardownCallback.prototype.linkBefore = function(oldElt) {                                                // 93
  this.prev = oldElt.prev;                                                                                // 94
  this.next = oldElt;                                                                                     // 95
  oldElt.prev.next = this;                                                                                // 96
  oldElt.prev = this;                                                                                     // 97
};                                                                                                        // 98
                                                                                                          // 99
TeardownCallback.prototype.unlink = function () {                                                         // 100
  this.prev.next = this.next;                                                                             // 101
  this.next.prev = this.prev;                                                                             // 102
};                                                                                                        // 103
                                                                                                          // 104
TeardownCallback.prototype.go = function () {                                                             // 105
  var func = this.func;                                                                                   // 106
  func && func();                                                                                         // 107
};                                                                                                        // 108
                                                                                                          // 109
TeardownCallback.prototype.stop = TeardownCallback.prototype.unlink;                                      // 110
                                                                                                          // 111
DOMBackend.Teardown = {                                                                                   // 112
  _JQUERY_EVENT_NAME: 'blaze_teardown_watcher',                                                           // 113
  _CB_PROP: '$blaze_teardown_callbacks',                                                                  // 114
  // Registers a callback function to be called when the given element or                                 // 115
  // one of its ancestors is removed from the DOM via the backend library.                                // 116
  // The callback function is called at most once, and it receives the element                            // 117
  // in question as an argument.                                                                          // 118
  onElementTeardown: function (elem, func) {                                                              // 119
    var elt = new TeardownCallback(func);                                                                 // 120
                                                                                                          // 121
    var propName = DOMBackend.Teardown._CB_PROP;                                                          // 122
    if (! elem[propName]) {                                                                               // 123
      // create an empty node that is never unlinked                                                      // 124
      elem[propName] = new TeardownCallback;                                                              // 125
                                                                                                          // 126
      // Set up the event, only the first time.                                                           // 127
      $jq(elem).on(DOMBackend.Teardown._JQUERY_EVENT_NAME, NOOP);                                         // 128
    }                                                                                                     // 129
                                                                                                          // 130
    elt.linkBefore(elem[propName]);                                                                       // 131
                                                                                                          // 132
    return elt; // so caller can call stop()                                                              // 133
  },                                                                                                      // 134
  // Recursively call all teardown hooks, in the backend and registered                                   // 135
  // through DOMBackend.onElementTeardown.                                                                // 136
  tearDownElement: function (elem) {                                                                      // 137
    var elems = [];                                                                                       // 138
    // Array.prototype.slice.call doesn't work when given a NodeList in                                   // 139
    // IE8 ("JScript object expected").                                                                   // 140
    var nodeList = elem.getElementsByTagName('*');                                                        // 141
    for (var i = 0; i < nodeList.length; i++) {                                                           // 142
      elems.push(nodeList[i]);                                                                            // 143
    }                                                                                                     // 144
    elems.push(elem);                                                                                     // 145
    $jq.cleanData(elems);                                                                                 // 146
  }                                                                                                       // 147
};                                                                                                        // 148
                                                                                                          // 149
$jq.event.special[DOMBackend.Teardown._JQUERY_EVENT_NAME] = {                                             // 150
  setup: function () {                                                                                    // 151
    // This "setup" callback is important even though it is empty!                                        // 152
    // Without it, jQuery will call addEventListener, which is a                                          // 153
    // performance hit, especially with Chrome's async stack trace                                        // 154
    // feature enabled.                                                                                   // 155
  },                                                                                                      // 156
  teardown: function() {                                                                                  // 157
    var elem = this;                                                                                      // 158
    var callbacks = elem[DOMBackend.Teardown._CB_PROP];                                                   // 159
    if (callbacks) {                                                                                      // 160
      var elt = callbacks.next;                                                                           // 161
      while (elt !== callbacks) {                                                                         // 162
        elt.go();                                                                                         // 163
        elt = elt.next;                                                                                   // 164
      }                                                                                                   // 165
      callbacks.go();                                                                                     // 166
                                                                                                          // 167
      elem[DOMBackend.Teardown._CB_PROP] = null;                                                          // 168
    }                                                                                                     // 169
  }                                                                                                       // 170
};                                                                                                        // 171
                                                                                                          // 172
                                                                                                          // 173
// Must use jQuery semantics for `context`, not                                                           // 174
// querySelectorAll's.  In other words, all the parts                                                     // 175
// of `selector` must be found under `context`.                                                           // 176
DOMBackend.findBySelector = function (selector, context) {                                                // 177
  return $jq(selector, context);                                                                          // 178
};                                                                                                        // 179
                                                                                                          // 180
////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                        //
// packages\blaze\domrange.js                                                                             //
//                                                                                                        //
////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                          //
                                                                                                          // 1
// A constant empty array (frozen if the JS engine supports it).                                          // 2
var _emptyArray = Object.freeze ? Object.freeze([]) : [];                                                 // 3
                                                                                                          // 4
// `[new] Blaze.DOMRange([nodeAndRangeArray])`                                                            // 5
//                                                                                                        // 6
// A DOMRange consists of an array of consecutive nodes and DOMRanges,                                    // 7
// which may be replaced at any time with a new array.  If the DOMRange                                   // 8
// has been attached to the DOM at some location, then updating                                           // 9
// the array will cause the DOM to be updated at that location.                                           // 10
Blaze.DOMRange = function (nodeAndRangeArray) {                                                           // 11
  if (! (this instanceof DOMRange))                                                                       // 12
    // called without `new`                                                                               // 13
    return new DOMRange(nodeAndRangeArray);                                                               // 14
                                                                                                          // 15
  var members = (nodeAndRangeArray || _emptyArray);                                                       // 16
  if (! (members && (typeof members.length) === 'number'))                                                // 17
    throw new Error("Expected array");                                                                    // 18
                                                                                                          // 19
  for (var i = 0; i < members.length; i++)                                                                // 20
    this._memberIn(members[i]);                                                                           // 21
                                                                                                          // 22
  this.members = members;                                                                                 // 23
  this.emptyRangePlaceholder = null;                                                                      // 24
  this.attached = false;                                                                                  // 25
  this.parentElement = null;                                                                              // 26
  this.parentRange = null;                                                                                // 27
  this.attachedCallbacks = _emptyArray;                                                                   // 28
};                                                                                                        // 29
var DOMRange = Blaze.DOMRange;                                                                            // 30
                                                                                                          // 31
// In IE 8, don't use empty text nodes as placeholders                                                    // 32
// in empty DOMRanges, use comment nodes instead.  Using                                                  // 33
// empty text nodes in modern browsers is great because                                                   // 34
// it doesn't clutter the web inspector.  In IE 8, however,                                               // 35
// it seems to lead in some roundabout way to the OAuth                                                   // 36
// pop-up crashing the browser completely.  In the past,                                                  // 37
// we didn't use empty text nodes on IE 8 because they                                                    // 38
// don't accept JS properties, so just use the same logic                                                 // 39
// even though we don't need to set properties on the                                                     // 40
// placeholder anymore.                                                                                   // 41
DOMRange._USE_COMMENT_PLACEHOLDERS = (function () {                                                       // 42
  var result = false;                                                                                     // 43
  var textNode = document.createTextNode("");                                                             // 44
  try {                                                                                                   // 45
    textNode.someProp = true;                                                                             // 46
  } catch (e) {                                                                                           // 47
    // IE 8                                                                                               // 48
    result = true;                                                                                        // 49
  }                                                                                                       // 50
  return result;                                                                                          // 51
})();                                                                                                     // 52
                                                                                                          // 53
// static methods                                                                                         // 54
DOMRange._insert = function (rangeOrNode, parentElement, nextNode, _isMove) {                             // 55
  var m = rangeOrNode;                                                                                    // 56
  if (m instanceof DOMRange) {                                                                            // 57
    m.attach(parentElement, nextNode, _isMove);                                                           // 58
  } else {                                                                                                // 59
    if (_isMove)                                                                                          // 60
      DOMRange._moveNodeWithHooks(m, parentElement, nextNode);                                            // 61
    else                                                                                                  // 62
      DOMRange._insertNodeWithHooks(m, parentElement, nextNode);                                          // 63
  }                                                                                                       // 64
};                                                                                                        // 65
                                                                                                          // 66
DOMRange._remove = function (rangeOrNode) {                                                               // 67
  var m = rangeOrNode;                                                                                    // 68
  if (m instanceof DOMRange) {                                                                            // 69
    m.detach();                                                                                           // 70
  } else {                                                                                                // 71
    DOMRange._removeNodeWithHooks(m);                                                                     // 72
  }                                                                                                       // 73
};                                                                                                        // 74
                                                                                                          // 75
DOMRange._removeNodeWithHooks = function (n) {                                                            // 76
  if (! n.parentNode)                                                                                     // 77
    return;                                                                                               // 78
  if (n.nodeType === 1 &&                                                                                 // 79
      n.parentNode._uihooks && n.parentNode._uihooks.removeElement) {                                     // 80
    n.parentNode._uihooks.removeElement(n);                                                               // 81
  } else {                                                                                                // 82
    n.parentNode.removeChild(n);                                                                          // 83
  }                                                                                                       // 84
};                                                                                                        // 85
                                                                                                          // 86
DOMRange._insertNodeWithHooks = function (n, parent, next) {                                              // 87
  // `|| null` because IE throws an error if 'next' is undefined                                          // 88
  next = next || null;                                                                                    // 89
  if (n.nodeType === 1 &&                                                                                 // 90
      parent._uihooks && parent._uihooks.insertElement) {                                                 // 91
    parent._uihooks.insertElement(n, next);                                                               // 92
  } else {                                                                                                // 93
    parent.insertBefore(n, next);                                                                         // 94
  }                                                                                                       // 95
};                                                                                                        // 96
                                                                                                          // 97
DOMRange._moveNodeWithHooks = function (n, parent, next) {                                                // 98
  if (n.parentNode !== parent)                                                                            // 99
    return;                                                                                               // 100
  // `|| null` because IE throws an error if 'next' is undefined                                          // 101
  next = next || null;                                                                                    // 102
  if (n.nodeType === 1 &&                                                                                 // 103
      parent._uihooks && parent._uihooks.moveElement) {                                                   // 104
    parent._uihooks.moveElement(n, next);                                                                 // 105
  } else {                                                                                                // 106
    parent.insertBefore(n, next);                                                                         // 107
  }                                                                                                       // 108
};                                                                                                        // 109
                                                                                                          // 110
DOMRange.forElement = function (elem) {                                                                   // 111
  if (elem.nodeType !== 1)                                                                                // 112
    throw new Error("Expected element, found: " + elem);                                                  // 113
  var range = null;                                                                                       // 114
  while (elem && ! range) {                                                                               // 115
    range = (elem.$blaze_range || null);                                                                  // 116
    if (! range)                                                                                          // 117
      elem = elem.parentNode;                                                                             // 118
  }                                                                                                       // 119
  return range;                                                                                           // 120
};                                                                                                        // 121
                                                                                                          // 122
DOMRange.prototype.attach = function (parentElement, nextNode, _isMove) {                                 // 123
  // This method is called to insert the DOMRange into the DOM for                                        // 124
  // the first time, but it's also used internally when                                                   // 125
  // updating the DOM.                                                                                    // 126
  //                                                                                                      // 127
  // If _isMove is true, move this attached range to a different                                          // 128
  // location under the same parentElement.                                                               // 129
  if (_isMove) {                                                                                          // 130
    if (! (this.parentElement === parentElement &&                                                        // 131
           this.attached))                                                                                // 132
      throw new Error("Can only move an attached DOMRange, and only under the same parent element");      // 133
  }                                                                                                       // 134
                                                                                                          // 135
  var members = this.members;                                                                             // 136
  if (members.length) {                                                                                   // 137
    this.emptyRangePlaceholder = null;                                                                    // 138
    for (var i = 0; i < members.length; i++) {                                                            // 139
      DOMRange._insert(members[i], parentElement, nextNode, _isMove);                                     // 140
    }                                                                                                     // 141
  } else {                                                                                                // 142
    var placeholder = (                                                                                   // 143
      DOMRange._USE_COMMENT_PLACEHOLDERS ?                                                                // 144
        document.createComment("") :                                                                      // 145
        document.createTextNode(""));                                                                     // 146
    this.emptyRangePlaceholder = placeholder;                                                             // 147
    parentElement.insertBefore(placeholder, nextNode || null);                                            // 148
  }                                                                                                       // 149
  this.attached = true;                                                                                   // 150
  this.parentElement = parentElement;                                                                     // 151
                                                                                                          // 152
  if (! _isMove) {                                                                                        // 153
    for(var i = 0; i < this.attachedCallbacks.length; i++) {                                              // 154
      var obj = this.attachedCallbacks[i];                                                                // 155
      obj.attached && obj.attached(this, parentElement);                                                  // 156
    }                                                                                                     // 157
  }                                                                                                       // 158
};                                                                                                        // 159
                                                                                                          // 160
DOMRange.prototype.setMembers = function (newNodeAndRangeArray) {                                         // 161
  var newMembers = newNodeAndRangeArray;                                                                  // 162
  if (! (newMembers && (typeof newMembers.length) === 'number'))                                          // 163
    throw new Error("Expected array");                                                                    // 164
                                                                                                          // 165
  var oldMembers = this.members;                                                                          // 166
                                                                                                          // 167
  for (var i = 0; i < oldMembers.length; i++)                                                             // 168
    this._memberOut(oldMembers[i]);                                                                       // 169
  for (var i = 0; i < newMembers.length; i++)                                                             // 170
    this._memberIn(newMembers[i]);                                                                        // 171
                                                                                                          // 172
  if (! this.attached) {                                                                                  // 173
    this.members = newMembers;                                                                            // 174
  } else {                                                                                                // 175
    // don't do anything if we're going from empty to empty                                               // 176
    if (newMembers.length || oldMembers.length) {                                                         // 177
      // detach the old members and insert the new members                                                // 178
      var nextNode = this.lastNode().nextSibling;                                                         // 179
      var parentElement = this.parentElement;                                                             // 180
      this.detach();                                                                                      // 181
      this.members = newMembers;                                                                          // 182
      this.attach(parentElement, nextNode);                                                               // 183
    }                                                                                                     // 184
  }                                                                                                       // 185
};                                                                                                        // 186
                                                                                                          // 187
DOMRange.prototype.firstNode = function () {                                                              // 188
  if (! this.attached)                                                                                    // 189
    throw new Error("Must be attached");                                                                  // 190
                                                                                                          // 191
  if (! this.members.length)                                                                              // 192
    return this.emptyRangePlaceholder;                                                                    // 193
                                                                                                          // 194
  var m = this.members[0];                                                                                // 195
  return (m instanceof DOMRange) ? m.firstNode() : m;                                                     // 196
};                                                                                                        // 197
                                                                                                          // 198
DOMRange.prototype.lastNode = function () {                                                               // 199
  if (! this.attached)                                                                                    // 200
    throw new Error("Must be attached");                                                                  // 201
                                                                                                          // 202
  if (! this.members.length)                                                                              // 203
    return this.emptyRangePlaceholder;                                                                    // 204
                                                                                                          // 205
  var m = this.members[this.members.length - 1];                                                          // 206
  return (m instanceof DOMRange) ? m.lastNode() : m;                                                      // 207
};                                                                                                        // 208
                                                                                                          // 209
DOMRange.prototype.detach = function () {                                                                 // 210
  if (! this.attached)                                                                                    // 211
    throw new Error("Must be attached");                                                                  // 212
                                                                                                          // 213
  var oldParentElement = this.parentElement;                                                              // 214
  var members = this.members;                                                                             // 215
  if (members.length) {                                                                                   // 216
    for (var i = 0; i < members.length; i++) {                                                            // 217
      DOMRange._remove(members[i]);                                                                       // 218
    }                                                                                                     // 219
  } else {                                                                                                // 220
    var placeholder = this.emptyRangePlaceholder;                                                         // 221
    this.parentElement.removeChild(placeholder);                                                          // 222
    this.emptyRangePlaceholder = null;                                                                    // 223
  }                                                                                                       // 224
  this.attached = false;                                                                                  // 225
  this.parentElement = null;                                                                              // 226
                                                                                                          // 227
  for(var i = 0; i < this.attachedCallbacks.length; i++) {                                                // 228
    var obj = this.attachedCallbacks[i];                                                                  // 229
    obj.detached && obj.detached(this, oldParentElement);                                                 // 230
  }                                                                                                       // 231
};                                                                                                        // 232
                                                                                                          // 233
DOMRange.prototype.addMember = function (newMember, atIndex, _isMove) {                                   // 234
  var members = this.members;                                                                             // 235
  if (! (atIndex >= 0 && atIndex <= members.length))                                                      // 236
    throw new Error("Bad index in range.addMember: " + atIndex);                                          // 237
                                                                                                          // 238
  if (! _isMove)                                                                                          // 239
    this._memberIn(newMember);                                                                            // 240
                                                                                                          // 241
  if (! this.attached) {                                                                                  // 242
    // currently detached; just updated members                                                           // 243
    members.splice(atIndex, 0, newMember);                                                                // 244
  } else if (members.length === 0) {                                                                      // 245
    // empty; use the empty-to-nonempty handling of setMembers                                            // 246
    this.setMembers([newMember]);                                                                         // 247
  } else {                                                                                                // 248
    var nextNode;                                                                                         // 249
    if (atIndex === members.length) {                                                                     // 250
      // insert at end                                                                                    // 251
      nextNode = this.lastNode().nextSibling;                                                             // 252
    } else {                                                                                              // 253
      var m = members[atIndex];                                                                           // 254
      nextNode = (m instanceof DOMRange) ? m.firstNode() : m;                                             // 255
    }                                                                                                     // 256
    members.splice(atIndex, 0, newMember);                                                                // 257
    DOMRange._insert(newMember, this.parentElement, nextNode, _isMove);                                   // 258
  }                                                                                                       // 259
};                                                                                                        // 260
                                                                                                          // 261
DOMRange.prototype.removeMember = function (atIndex, _isMove) {                                           // 262
  var members = this.members;                                                                             // 263
  if (! (atIndex >= 0 && atIndex < members.length))                                                       // 264
    throw new Error("Bad index in range.removeMember: " + atIndex);                                       // 265
                                                                                                          // 266
  if (_isMove) {                                                                                          // 267
    members.splice(atIndex, 1);                                                                           // 268
  } else {                                                                                                // 269
    var oldMember = members[atIndex];                                                                     // 270
    this._memberOut(oldMember);                                                                           // 271
                                                                                                          // 272
    if (members.length === 1) {                                                                           // 273
      // becoming empty; use the logic in setMembers                                                      // 274
      this.setMembers(_emptyArray);                                                                       // 275
    } else {                                                                                              // 276
      members.splice(atIndex, 1);                                                                         // 277
      if (this.attached)                                                                                  // 278
        DOMRange._remove(oldMember);                                                                      // 279
    }                                                                                                     // 280
  }                                                                                                       // 281
};                                                                                                        // 282
                                                                                                          // 283
DOMRange.prototype.moveMember = function (oldIndex, newIndex) {                                           // 284
  var member = this.members[oldIndex];                                                                    // 285
  this.removeMember(oldIndex, true /*_isMove*/);                                                          // 286
  this.addMember(member, newIndex, true /*_isMove*/);                                                     // 287
};                                                                                                        // 288
                                                                                                          // 289
DOMRange.prototype.getMember = function (atIndex) {                                                       // 290
  var members = this.members;                                                                             // 291
  if (! (atIndex >= 0 && atIndex < members.length))                                                       // 292
    throw new Error("Bad index in range.getMember: " + atIndex);                                          // 293
  return this.members[atIndex];                                                                           // 294
};                                                                                                        // 295
                                                                                                          // 296
DOMRange.prototype._memberIn = function (m) {                                                             // 297
  if (m instanceof DOMRange)                                                                              // 298
    m.parentRange = this;                                                                                 // 299
  else if (m.nodeType === 1) // DOM Element                                                               // 300
    m.$blaze_range = this;                                                                                // 301
};                                                                                                        // 302
                                                                                                          // 303
DOMRange._destroy = function (m, _skipNodes) {                                                            // 304
  if (m instanceof DOMRange) {                                                                            // 305
    if (m.view)                                                                                           // 306
      Blaze.destroyView(m.view, _skipNodes);                                                              // 307
    m.parentRange = null;                                                                                 // 308
  } else if ((! _skipNodes) && m.nodeType === 1) {                                                        // 309
    // DOM Element                                                                                        // 310
    if (m.$blaze_range) {                                                                                 // 311
      Blaze.destroyNode(m);                                                                               // 312
      m.$blaze_range = null;                                                                              // 313
    }                                                                                                     // 314
  }                                                                                                       // 315
};                                                                                                        // 316
                                                                                                          // 317
DOMRange.prototype._memberOut = DOMRange._destroy;                                                        // 318
                                                                                                          // 319
// Tear down, but don't remove, the members.  Used when chunks                                            // 320
// of DOM are being torn down or replaced.                                                                // 321
DOMRange.prototype.destroyMembers = function (_skipNodes) {                                               // 322
  var members = this.members;                                                                             // 323
  for (var i = 0; i < members.length; i++)                                                                // 324
    this._memberOut(members[i], _skipNodes);                                                              // 325
};                                                                                                        // 326
                                                                                                          // 327
DOMRange.prototype.destroy = function (_skipNodes) {                                                      // 328
  DOMRange._destroy(this, _skipNodes);                                                                    // 329
};                                                                                                        // 330
                                                                                                          // 331
DOMRange.prototype.containsElement = function (elem) {                                                    // 332
  if (! this.attached)                                                                                    // 333
    throw new Error("Must be attached");                                                                  // 334
                                                                                                          // 335
  // An element is contained in this DOMRange if it's possible to                                         // 336
  // reach it by walking parent pointers, first through the DOM and                                       // 337
  // then parentRange pointers.  In other words, the element or some                                      // 338
  // ancestor of it is at our level of the DOM (a child of our                                            // 339
  // parentElement), and this element is one of our members or                                            // 340
  // is a member of a descendant Range.                                                                   // 341
                                                                                                          // 342
  // First check that elem is a descendant of this.parentElement,                                         // 343
  // according to the DOM.                                                                                // 344
  if (! Blaze._elementContains(this.parentElement, elem))                                                 // 345
    return false;                                                                                         // 346
                                                                                                          // 347
  // If elem is not an immediate child of this.parentElement,                                             // 348
  // walk up to its ancestor that is.                                                                     // 349
  while (elem.parentNode !== this.parentElement)                                                          // 350
    elem = elem.parentNode;                                                                               // 351
                                                                                                          // 352
  var range = elem.$blaze_range;                                                                          // 353
  while (range && range !== this)                                                                         // 354
    range = range.parentRange;                                                                            // 355
                                                                                                          // 356
  return range === this;                                                                                  // 357
};                                                                                                        // 358
                                                                                                          // 359
DOMRange.prototype.containsRange = function (range) {                                                     // 360
  if (! this.attached)                                                                                    // 361
    throw new Error("Must be attached");                                                                  // 362
                                                                                                          // 363
  if (! range.attached)                                                                                   // 364
    return false;                                                                                         // 365
                                                                                                          // 366
  // A DOMRange is contained in this DOMRange if it's possible                                            // 367
  // to reach this range by following parent pointers.  If the                                            // 368
  // DOMRange has the same parentElement, then it should be                                               // 369
  // a member, or a member of a member etc.  Otherwise, we must                                           // 370
  // contain its parentElement.                                                                           // 371
                                                                                                          // 372
  if (range.parentElement !== this.parentElement)                                                         // 373
    return this.containsElement(range.parentElement);                                                     // 374
                                                                                                          // 375
  if (range === this)                                                                                     // 376
    return false; // don't contain self                                                                   // 377
                                                                                                          // 378
  while (range && range !== this)                                                                         // 379
    range = range.parentRange;                                                                            // 380
                                                                                                          // 381
  return range === this;                                                                                  // 382
};                                                                                                        // 383
                                                                                                          // 384
DOMRange.prototype.onAttached = function (attached) {                                                     // 385
  this.onAttachedDetached({ attached: attached });                                                        // 386
};                                                                                                        // 387
                                                                                                          // 388
// callbacks are `attached(range, element)` and                                                           // 389
// `detached(range, element)`, and they may                                                               // 390
// access the `callbacks` object in `this`.                                                               // 391
// The arguments to `detached` are the same                                                               // 392
// range and element that were passed to `attached`.                                                      // 393
DOMRange.prototype.onAttachedDetached = function (callbacks) {                                            // 394
  if (this.attachedCallbacks === _emptyArray)                                                             // 395
    this.attachedCallbacks = [];                                                                          // 396
  this.attachedCallbacks.push(callbacks);                                                                 // 397
};                                                                                                        // 398
                                                                                                          // 399
DOMRange.prototype.$ = function (selector) {                                                              // 400
  var self = this;                                                                                        // 401
                                                                                                          // 402
  var parentNode = this.parentElement;                                                                    // 403
  if (! parentNode)                                                                                       // 404
    throw new Error("Can't select in removed DomRange");                                                  // 405
                                                                                                          // 406
  // Strategy: Find all selector matches under parentNode,                                                // 407
  // then filter out the ones that aren't in this DomRange                                                // 408
  // using `DOMRange#containsElement`.  This is                                                           // 409
  // asymptotically slow in the presence of O(N) sibling                                                  // 410
  // content that is under parentNode but not in our range,                                               // 411
  // so if performance is an issue, the selector should be                                                // 412
  // run on a child element.                                                                              // 413
                                                                                                          // 414
  // Since jQuery can't run selectors on a DocumentFragment,                                              // 415
  // we don't expect findBySelector to work.                                                              // 416
  if (parentNode.nodeType === 11 /* DocumentFragment */)                                                  // 417
    throw new Error("Can't use $ on an offscreen range");                                                 // 418
                                                                                                          // 419
  var results = Blaze.DOMBackend.findBySelector(selector, parentNode);                                    // 420
                                                                                                          // 421
  // We don't assume `results` has jQuery API; a plain array                                              // 422
  // should do just as well.  However, if we do have a jQuery                                             // 423
  // array, we want to end up with one also, so we use                                                    // 424
  // `.filter`.                                                                                           // 425
                                                                                                          // 426
  // Function that selects only elements that are actually                                                // 427
  // in this DomRange, rather than simply descending from                                                 // 428
  // `parentNode`.                                                                                        // 429
  var filterFunc = function (elem) {                                                                      // 430
    // handle jQuery's arguments to filter, where the node                                                // 431
    // is in `this` and the index is the first argument.                                                  // 432
    if (typeof elem === 'number')                                                                         // 433
      elem = this;                                                                                        // 434
                                                                                                          // 435
    return self.containsElement(elem);                                                                    // 436
  };                                                                                                      // 437
                                                                                                          // 438
  if (! results.filter) {                                                                                 // 439
    // not a jQuery array, and not a browser with                                                         // 440
    // Array.prototype.filter (e.g. IE <9)                                                                // 441
    var newResults = [];                                                                                  // 442
    for (var i = 0; i < results.length; i++) {                                                            // 443
      var x = results[i];                                                                                 // 444
      if (filterFunc(x))                                                                                  // 445
        newResults.push(x);                                                                               // 446
    }                                                                                                     // 447
    results = newResults;                                                                                 // 448
  } else {                                                                                                // 449
    // `results.filter` is either jQuery's or ECMAScript's `filter`                                       // 450
    results = results.filter(filterFunc);                                                                 // 451
  }                                                                                                       // 452
                                                                                                          // 453
  return results;                                                                                         // 454
};                                                                                                        // 455
                                                                                                          // 456
// Returns true if element a contains node b and is not node b.                                           // 457
//                                                                                                        // 458
// The restriction that `a` be an element (not a document fragment,                                       // 459
// say) is based on what's easy to implement cross-browser.                                               // 460
Blaze._elementContains = function (a, b) {                                                                // 461
  if (a.nodeType !== 1) // ELEMENT                                                                        // 462
    return false;                                                                                         // 463
  if (a === b)                                                                                            // 464
    return false;                                                                                         // 465
                                                                                                          // 466
  if (a.compareDocumentPosition) {                                                                        // 467
    return a.compareDocumentPosition(b) & 0x10;                                                           // 468
  } else {                                                                                                // 469
    // Should be only old IE and maybe other old browsers here.                                           // 470
    // Modern Safari has both functions but seems to get contains() wrong.                                // 471
    // IE can't handle b being a text node.  We work around this                                          // 472
    // by doing a direct parent test now.                                                                 // 473
    b = b.parentNode;                                                                                     // 474
    if (! (b && b.nodeType === 1)) // ELEMENT                                                             // 475
      return false;                                                                                       // 476
    if (a === b)                                                                                          // 477
      return true;                                                                                        // 478
                                                                                                          // 479
    return a.contains(b);                                                                                 // 480
  }                                                                                                       // 481
};                                                                                                        // 482
                                                                                                          // 483
////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                        //
// packages\blaze\events.js                                                                               //
//                                                                                                        //
////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                          //
var EventSupport = Blaze.EventSupport = {};                                                               // 1
                                                                                                          // 2
var DOMBackend = Blaze.DOMBackend;                                                                        // 3
                                                                                                          // 4
// List of events to always delegate, never capture.                                                      // 5
// Since jQuery fakes bubbling for certain events in                                                      // 6
// certain browsers (like `submit`), we don't want to                                                     // 7
// get in its way.                                                                                        // 8
//                                                                                                        // 9
// We could list all known bubbling                                                                       // 10
// events here to avoid creating speculative capturers                                                    // 11
// for them, but it would only be an optimization.                                                        // 12
var eventsToDelegate = EventSupport.eventsToDelegate = {                                                  // 13
  blur: 1, change: 1, click: 1, focus: 1, focusin: 1,                                                     // 14
  focusout: 1, reset: 1, submit: 1                                                                        // 15
};                                                                                                        // 16
                                                                                                          // 17
var EVENT_MODE = EventSupport.EVENT_MODE = {                                                              // 18
  TBD: 0,                                                                                                 // 19
  BUBBLING: 1,                                                                                            // 20
  CAPTURING: 2                                                                                            // 21
};                                                                                                        // 22
                                                                                                          // 23
var NEXT_HANDLERREC_ID = 1;                                                                               // 24
                                                                                                          // 25
var HandlerRec = function (elem, type, selector, handler, recipient) {                                    // 26
  this.elem = elem;                                                                                       // 27
  this.type = type;                                                                                       // 28
  this.selector = selector;                                                                               // 29
  this.handler = handler;                                                                                 // 30
  this.recipient = recipient;                                                                             // 31
  this.id = (NEXT_HANDLERREC_ID++);                                                                       // 32
                                                                                                          // 33
  this.mode = EVENT_MODE.TBD;                                                                             // 34
                                                                                                          // 35
  // It's important that delegatedHandler be a different                                                  // 36
  // instance for each handlerRecord, because its identity                                                // 37
  // is used to remove it.                                                                                // 38
  //                                                                                                      // 39
  // It's also important that the closure have access to                                                  // 40
  // `this` when it is not called with it set.                                                            // 41
  this.delegatedHandler = (function (h) {                                                                 // 42
    return function (evt) {                                                                               // 43
      if ((! h.selector) && evt.currentTarget !== evt.target)                                             // 44
        // no selector means only fire on target                                                          // 45
        return;                                                                                           // 46
      return h.handler.apply(h.recipient, arguments);                                                     // 47
    };                                                                                                    // 48
  })(this);                                                                                               // 49
                                                                                                          // 50
  // WHY CAPTURE AND DELEGATE: jQuery can't delegate                                                      // 51
  // non-bubbling events, because                                                                         // 52
  // event capture doesn't work in IE 8.  However, there                                                  // 53
  // are all sorts of new-fangled non-bubbling events                                                     // 54
  // like "play" and "touchenter".  We delegate these                                                     // 55
  // events using capture in all browsers except IE 8.                                                    // 56
  // IE 8 doesn't support these events anyway.                                                            // 57
                                                                                                          // 58
  var tryCapturing = elem.addEventListener &&                                                             // 59
        (! _.has(eventsToDelegate,                                                                        // 60
                 DOMBackend.Events.parseEventType(type)));                                                // 61
                                                                                                          // 62
  if (tryCapturing) {                                                                                     // 63
    this.capturingHandler = (function (h) {                                                               // 64
      return function (evt) {                                                                             // 65
        if (h.mode === EVENT_MODE.TBD) {                                                                  // 66
          // must be first time we're called.                                                             // 67
          if (evt.bubbles) {                                                                              // 68
            // this type of event bubbles, so don't                                                       // 69
            // get called again.                                                                          // 70
            h.mode = EVENT_MODE.BUBBLING;                                                                 // 71
            DOMBackend.Events.unbindEventCapturer(                                                        // 72
              h.elem, h.type, h.capturingHandler);                                                        // 73
            return;                                                                                       // 74
          } else {                                                                                        // 75
            // this type of event doesn't bubble,                                                         // 76
            // so unbind the delegation, preventing                                                       // 77
            // it from ever firing.                                                                       // 78
            h.mode = EVENT_MODE.CAPTURING;                                                                // 79
            DOMBackend.Events.undelegateEvents(                                                           // 80
              h.elem, h.type, h.delegatedHandler);                                                        // 81
          }                                                                                               // 82
        }                                                                                                 // 83
                                                                                                          // 84
        h.delegatedHandler(evt);                                                                          // 85
      };                                                                                                  // 86
    })(this);                                                                                             // 87
                                                                                                          // 88
  } else {                                                                                                // 89
    this.mode = EVENT_MODE.BUBBLING;                                                                      // 90
  }                                                                                                       // 91
};                                                                                                        // 92
EventSupport.HandlerRec = HandlerRec;                                                                     // 93
                                                                                                          // 94
HandlerRec.prototype.bind = function () {                                                                 // 95
  // `this.mode` may be EVENT_MODE_TBD, in which case we bind both. in                                    // 96
  // this case, 'capturingHandler' is in charge of detecting the                                          // 97
  // correct mode and turning off one or the other handlers.                                              // 98
  if (this.mode !== EVENT_MODE.BUBBLING) {                                                                // 99
    DOMBackend.Events.bindEventCapturer(                                                                  // 100
      this.elem, this.type, this.selector || '*',                                                         // 101
      this.capturingHandler);                                                                             // 102
  }                                                                                                       // 103
                                                                                                          // 104
  if (this.mode !== EVENT_MODE.CAPTURING)                                                                 // 105
    DOMBackend.Events.delegateEvents(                                                                     // 106
      this.elem, this.type,                                                                               // 107
      this.selector || '*', this.delegatedHandler);                                                       // 108
};                                                                                                        // 109
                                                                                                          // 110
HandlerRec.prototype.unbind = function () {                                                               // 111
  if (this.mode !== EVENT_MODE.BUBBLING)                                                                  // 112
    DOMBackend.Events.unbindEventCapturer(this.elem, this.type,                                           // 113
                                          this.capturingHandler);                                         // 114
                                                                                                          // 115
  if (this.mode !== EVENT_MODE.CAPTURING)                                                                 // 116
    DOMBackend.Events.undelegateEvents(this.elem, this.type,                                              // 117
                                       this.delegatedHandler);                                            // 118
};                                                                                                        // 119
                                                                                                          // 120
EventSupport.listen = function (element, events, selector, handler, recipient, getParentRecipient) {      // 121
                                                                                                          // 122
  var eventTypes = [];                                                                                    // 123
  events.replace(/[^ /]+/g, function (e) {                                                                // 124
    eventTypes.push(e);                                                                                   // 125
  });                                                                                                     // 126
                                                                                                          // 127
  var newHandlerRecs = [];                                                                                // 128
  for (var i = 0, N = eventTypes.length; i < N; i++) {                                                    // 129
    var type = eventTypes[i];                                                                             // 130
                                                                                                          // 131
    var eventDict = element.$blaze_events;                                                                // 132
    if (! eventDict)                                                                                      // 133
      eventDict = (element.$blaze_events = {});                                                           // 134
                                                                                                          // 135
    var info = eventDict[type];                                                                           // 136
    if (! info) {                                                                                         // 137
      info = eventDict[type] = {};                                                                        // 138
      info.handlers = [];                                                                                 // 139
    }                                                                                                     // 140
    var handlerList = info.handlers;                                                                      // 141
    var handlerRec = new HandlerRec(                                                                      // 142
      element, type, selector, handler, recipient);                                                       // 143
    newHandlerRecs.push(handlerRec);                                                                      // 144
    handlerRec.bind();                                                                                    // 145
    handlerList.push(handlerRec);                                                                         // 146
    // Move handlers of enclosing ranges to end, by unbinding and rebinding                               // 147
    // them.  In jQuery (or other DOMBackend) this causes them to fire                                    // 148
    // later when the backend dispatches event handlers.                                                  // 149
    if (getParentRecipient) {                                                                             // 150
      for (var r = getParentRecipient(recipient); r;                                                      // 151
           r = getParentRecipient(r)) {                                                                   // 152
        // r is an enclosing range (recipient)                                                            // 153
        for (var j = 0, Nj = handlerList.length;                                                          // 154
             j < Nj; j++) {                                                                               // 155
          var h = handlerList[j];                                                                         // 156
          if (h.recipient === r) {                                                                        // 157
            h.unbind();                                                                                   // 158
            h.bind();                                                                                     // 159
            handlerList.splice(j, 1); // remove handlerList[j]                                            // 160
            handlerList.push(h);                                                                          // 161
            j--; // account for removed handler                                                           // 162
            Nj--; // don't visit appended handlers                                                        // 163
          }                                                                                               // 164
        }                                                                                                 // 165
      }                                                                                                   // 166
    }                                                                                                     // 167
  }                                                                                                       // 168
                                                                                                          // 169
  return {                                                                                                // 170
    // closes over just `element` and `newHandlerRecs`                                                    // 171
    stop: function () {                                                                                   // 172
      var eventDict = element.$blaze_events;                                                              // 173
      if (! eventDict)                                                                                    // 174
        return;                                                                                           // 175
      // newHandlerRecs has only one item unless you specify multiple                                     // 176
      // event types.  If this code is slow, it's because we have to                                      // 177
      // iterate over handlerList here.  Clearing a whole handlerList                                     // 178
      // via stop() methods is O(N^2) in the number of handlers on                                        // 179
      // an element.                                                                                      // 180
      for (var i = 0; i < newHandlerRecs.length; i++) {                                                   // 181
        var handlerToRemove = newHandlerRecs[i];                                                          // 182
        var info = eventDict[handlerToRemove.type];                                                       // 183
        if (! info)                                                                                       // 184
          continue;                                                                                       // 185
        var handlerList = info.handlers;                                                                  // 186
        for (var j = handlerList.length - 1; j >= 0; j--) {                                               // 187
          if (handlerList[j] === handlerToRemove) {                                                       // 188
            handlerToRemove.unbind();                                                                     // 189
            handlerList.splice(j, 1); // remove handlerList[j]                                            // 190
          }                                                                                               // 191
        }                                                                                                 // 192
      }                                                                                                   // 193
      newHandlerRecs.length = 0;                                                                          // 194
    }                                                                                                     // 195
  };                                                                                                      // 196
};                                                                                                        // 197
                                                                                                          // 198
////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                        //
// packages\blaze\attrs.js                                                                                //
//                                                                                                        //
////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                          //
                                                                                                          // 1
// An AttributeHandler object is responsible for updating a particular attribute                          // 2
// of a particular element.  AttributeHandler subclasses implement                                        // 3
// browser-specific logic for dealing with particular attributes across                                   // 4
// different browsers.                                                                                    // 5
//                                                                                                        // 6
// To define a new type of AttributeHandler, use                                                          // 7
// `var FooHandler = AttributeHandler.extend({ update: function ... })`                                   // 8
// where the `update` function takes arguments `(element, oldValue, value)`.                              // 9
// The `element` argument is always the same between calls to `update` on                                 // 10
// the same instance.  `oldValue` and `value` are each either `null` or                                   // 11
// a Unicode string of the type that might be passed to the value argument                                // 12
// of `setAttribute` (i.e. not an HTML string with character references).                                 // 13
// When an AttributeHandler is installed, an initial call to `update` is                                  // 14
// always made with `oldValue = null`.  The `update` method can access                                    // 15
// `this.name` if the AttributeHandler class is a generic one that applies                                // 16
// to multiple attribute names.                                                                           // 17
//                                                                                                        // 18
// AttributeHandlers can store custom properties on `this`, as long as they                               // 19
// don't use the names `element`, `name`, `value`, and `oldValue`.                                        // 20
//                                                                                                        // 21
// AttributeHandlers can't influence how attributes appear in rendered HTML,                              // 22
// only how they are updated after materialization as DOM.                                                // 23
                                                                                                          // 24
AttributeHandler = function (name, value) {                                                               // 25
  this.name = name;                                                                                       // 26
  this.value = value;                                                                                     // 27
};                                                                                                        // 28
                                                                                                          // 29
AttributeHandler.prototype.update = function (element, oldValue, value) {                                 // 30
  if (value === null) {                                                                                   // 31
    if (oldValue !== null)                                                                                // 32
      element.removeAttribute(this.name);                                                                 // 33
  } else {                                                                                                // 34
    element.setAttribute(this.name, value);                                                               // 35
  }                                                                                                       // 36
};                                                                                                        // 37
                                                                                                          // 38
AttributeHandler.extend = function (options) {                                                            // 39
  var curType = this;                                                                                     // 40
  var subType = function AttributeHandlerSubtype(/*arguments*/) {                                         // 41
    AttributeHandler.apply(this, arguments);                                                              // 42
  };                                                                                                      // 43
  subType.prototype = new curType;                                                                        // 44
  subType.extend = curType.extend;                                                                        // 45
  if (options)                                                                                            // 46
    _.extend(subType.prototype, options);                                                                 // 47
  return subType;                                                                                         // 48
};                                                                                                        // 49
                                                                                                          // 50
/// Apply the diff between the attributes of "oldValue" and "value" to "element."                         // 51
//                                                                                                        // 52
// Each subclass must implement a parseValue method which takes a string                                  // 53
// as an input and returns a dict of attributes. The keys of the dict                                     // 54
// are unique identifiers (ie. css properties in the case of styles), and the                             // 55
// values are the entire attribute which will be injected into the element.                               // 56
//                                                                                                        // 57
// Extended below to support classes, SVG elements and styles.                                            // 58
                                                                                                          // 59
var DiffingAttributeHandler = AttributeHandler.extend({                                                   // 60
  update: function (element, oldValue, value) {                                                           // 61
    if (!this.getCurrentValue || !this.setValue || !this.parseValue)                                      // 62
      throw new Error("Missing methods in subclass of 'DiffingAttributeHandler'");                        // 63
                                                                                                          // 64
    var oldAttrsMap = oldValue ? this.parseValue(oldValue) : {};                                          // 65
    var newAttrsMap = value ? this.parseValue(value) : {};                                                // 66
                                                                                                          // 67
    // the current attributes on the element, which we will mutate.                                       // 68
                                                                                                          // 69
    var attrString = this.getCurrentValue(element);                                                       // 70
    var attrsMap = attrString ? this.parseValue(attrString) : {};                                         // 71
                                                                                                          // 72
    _.each(_.keys(oldAttrsMap), function (t) {                                                            // 73
      if (! (t in newAttrsMap))                                                                           // 74
        delete attrsMap[t];                                                                               // 75
    });                                                                                                   // 76
                                                                                                          // 77
    _.each(_.keys(newAttrsMap), function (t) {                                                            // 78
      attrsMap[t] = newAttrsMap[t];                                                                       // 79
    });                                                                                                   // 80
                                                                                                          // 81
    this.setValue(element, _.values(attrsMap).join(' '));                                                 // 82
  }                                                                                                       // 83
});                                                                                                       // 84
                                                                                                          // 85
var ClassHandler = DiffingAttributeHandler.extend({                                                       // 86
  // @param rawValue {String}                                                                             // 87
  getCurrentValue: function (element) {                                                                   // 88
    return element.className;                                                                             // 89
  },                                                                                                      // 90
  setValue: function (element, className) {                                                               // 91
    element.className = className;                                                                        // 92
  },                                                                                                      // 93
  parseValue: function (attrString) {                                                                     // 94
    var tokens = {};                                                                                      // 95
                                                                                                          // 96
    _.each(attrString.split(' '), function(token) {                                                       // 97
      if (token)                                                                                          // 98
        tokens[token] = token;                                                                            // 99
    });                                                                                                   // 100
    return tokens;                                                                                        // 101
  }                                                                                                       // 102
});                                                                                                       // 103
                                                                                                          // 104
var SVGClassHandler = ClassHandler.extend({                                                               // 105
  getCurrentValue: function (element) {                                                                   // 106
    return element.className.baseVal;                                                                     // 107
  },                                                                                                      // 108
  setValue: function (element, className) {                                                               // 109
    element.setAttribute('class', className);                                                             // 110
  }                                                                                                       // 111
});                                                                                                       // 112
                                                                                                          // 113
var StyleHandler = DiffingAttributeHandler.extend({                                                       // 114
  getCurrentValue: function (element) {                                                                   // 115
    return element.getAttribute('style');                                                                 // 116
  },                                                                                                      // 117
  setValue: function (element, style) {                                                                   // 118
    if (style === '') {                                                                                   // 119
      element.removeAttribute('style');                                                                   // 120
    } else {                                                                                              // 121
      element.setAttribute('style', style);                                                               // 122
    }                                                                                                     // 123
  },                                                                                                      // 124
                                                                                                          // 125
  // Parse a string to produce a map from property to attribute string.                                   // 126
  //                                                                                                      // 127
  // Example:                                                                                             // 128
  // "color:red; foo:12px" produces a token {color: "color:red", foo:"foo:12px"}                          // 129
  parseValue: function (attrString) {                                                                     // 130
    var tokens = {};                                                                                      // 131
                                                                                                          // 132
    // Regex for parsing a css attribute declaration, taken from css-parse:                               // 133
    // https://github.com/reworkcss/css-parse/blob/7cef3658d0bba872cde05a85339034b187cb3397/index.js#L219 // 134
    var regex = /(\*?[-#\/\*\\\w]+(?:\[[0-9a-z_-]+\])?)\s*:\s*(?:\'(?:\\\'|.)*?\'|"(?:\\"|.)*?"|\([^\)]*?\)|[^};])+[;\s]*/g;
    var match = regex.exec(attrString);                                                                   // 136
    while (match) {                                                                                       // 137
      // match[0] = entire matching string                                                                // 138
      // match[1] = css property                                                                          // 139
      // Prefix the token to prevent conflicts with existing properties.                                  // 140
                                                                                                          // 141
      // XXX No `String.trim` on Safari 4. Swap out $.trim if we want to                                  // 142
      // remove strong dep on jquery.                                                                     // 143
      tokens[' ' + match[1]] = match[0].trim ?                                                            // 144
        match[0].trim() : $.trim(match[0]);                                                               // 145
                                                                                                          // 146
      match = regex.exec(attrString);                                                                     // 147
    }                                                                                                     // 148
                                                                                                          // 149
    return tokens;                                                                                        // 150
  }                                                                                                       // 151
});                                                                                                       // 152
                                                                                                          // 153
var BooleanHandler = AttributeHandler.extend({                                                            // 154
  update: function (element, oldValue, value) {                                                           // 155
    var name = this.name;                                                                                 // 156
    if (value == null) {                                                                                  // 157
      if (oldValue != null)                                                                               // 158
        element[name] = false;                                                                            // 159
    } else {                                                                                              // 160
      element[name] = true;                                                                               // 161
    }                                                                                                     // 162
  }                                                                                                       // 163
});                                                                                                       // 164
                                                                                                          // 165
var ValueHandler = AttributeHandler.extend({                                                              // 166
  update: function (element, oldValue, value) {                                                           // 167
    element.value = value;                                                                                // 168
  }                                                                                                       // 169
});                                                                                                       // 170
                                                                                                          // 171
// attributes of the type 'xlink:something' should be set using                                           // 172
// the correct namespace in order to work                                                                 // 173
var XlinkHandler = AttributeHandler.extend({                                                              // 174
  update: function(element, oldValue, value) {                                                            // 175
    var NS = 'http://www.w3.org/1999/xlink';                                                              // 176
    if (value === null) {                                                                                 // 177
      if (oldValue !== null)                                                                              // 178
        element.removeAttributeNS(NS, this.name);                                                         // 179
    } else {                                                                                              // 180
      element.setAttributeNS(NS, this.name, this.value);                                                  // 181
    }                                                                                                     // 182
  }                                                                                                       // 183
});                                                                                                       // 184
                                                                                                          // 185
// cross-browser version of `instanceof SVGElement`                                                       // 186
var isSVGElement = function (elem) {                                                                      // 187
  return 'ownerSVGElement' in elem;                                                                       // 188
};                                                                                                        // 189
                                                                                                          // 190
var isUrlAttribute = function (tagName, attrName) {                                                       // 191
  // Compiled from http://www.w3.org/TR/REC-html40/index/attributes.html                                  // 192
  // and                                                                                                  // 193
  // http://www.w3.org/html/wg/drafts/html/master/index.html#attributes-1                                 // 194
  var urlAttrs = {                                                                                        // 195
    FORM: ['action'],                                                                                     // 196
    BODY: ['background'],                                                                                 // 197
    BLOCKQUOTE: ['cite'],                                                                                 // 198
    Q: ['cite'],                                                                                          // 199
    DEL: ['cite'],                                                                                        // 200
    INS: ['cite'],                                                                                        // 201
    OBJECT: ['classid', 'codebase', 'data', 'usemap'],                                                    // 202
    APPLET: ['codebase'],                                                                                 // 203
    A: ['href'],                                                                                          // 204
    AREA: ['href'],                                                                                       // 205
    LINK: ['href'],                                                                                       // 206
    BASE: ['href'],                                                                                       // 207
    IMG: ['longdesc', 'src', 'usemap'],                                                                   // 208
    FRAME: ['longdesc', 'src'],                                                                           // 209
    IFRAME: ['longdesc', 'src'],                                                                          // 210
    HEAD: ['profile'],                                                                                    // 211
    SCRIPT: ['src'],                                                                                      // 212
    INPUT: ['src', 'usemap', 'formaction'],                                                               // 213
    BUTTON: ['formaction'],                                                                               // 214
    BASE: ['href'],                                                                                       // 215
    MENUITEM: ['icon'],                                                                                   // 216
    HTML: ['manifest'],                                                                                   // 217
    VIDEO: ['poster']                                                                                     // 218
  };                                                                                                      // 219
                                                                                                          // 220
  if (attrName === 'itemid') {                                                                            // 221
    return true;                                                                                          // 222
  }                                                                                                       // 223
                                                                                                          // 224
  var urlAttrNames = urlAttrs[tagName] || [];                                                             // 225
  return _.contains(urlAttrNames, attrName);                                                              // 226
};                                                                                                        // 227
                                                                                                          // 228
// To get the protocol for a URL, we let the browser normalize it for                                     // 229
// us, by setting it as the href for an anchor tag and then reading out                                   // 230
// the 'protocol' property.                                                                               // 231
if (Meteor.isClient) {                                                                                    // 232
  var anchorForNormalization = document.createElement('A');                                               // 233
}                                                                                                         // 234
                                                                                                          // 235
var getUrlProtocol = function (url) {                                                                     // 236
  if (Meteor.isClient) {                                                                                  // 237
    anchorForNormalization.href = url;                                                                    // 238
    return (anchorForNormalization.protocol || "").toLowerCase();                                         // 239
  } else {                                                                                                // 240
    throw new Error('getUrlProtocol not implemented on the server');                                      // 241
  }                                                                                                       // 242
};                                                                                                        // 243
                                                                                                          // 244
// UrlHandler is an attribute handler for all HTML attributes that take                                   // 245
// URL values. It disallows javascript: URLs, unless                                                      // 246
// UI._allowJavascriptUrls() has been called. To detect javascript:                                       // 247
// urls, we set the attribute on a dummy anchor element and then read                                     // 248
// out the 'protocol' property of the attribute.                                                          // 249
var origUpdate = AttributeHandler.prototype.update;                                                       // 250
var UrlHandler = AttributeHandler.extend({                                                                // 251
  update: function (element, oldValue, value) {                                                           // 252
    var self = this;                                                                                      // 253
    var args = arguments;                                                                                 // 254
                                                                                                          // 255
    if (UI._javascriptUrlsAllowed()) {                                                                    // 256
      origUpdate.apply(self, args);                                                                       // 257
    } else {                                                                                              // 258
      var isJavascriptProtocol = (getUrlProtocol(value) === "javascript:");                               // 259
      if (isJavascriptProtocol) {                                                                         // 260
        Meteor._debug("URLs that use the 'javascript:' protocol are not " +                               // 261
                      "allowed in URL attribute values. " +                                               // 262
                      "Call UI._allowJavascriptUrls() " +                                                 // 263
                      "to enable them.");                                                                 // 264
        origUpdate.apply(self, [element, oldValue, null]);                                                // 265
      } else {                                                                                            // 266
        origUpdate.apply(self, args);                                                                     // 267
      }                                                                                                   // 268
    }                                                                                                     // 269
  }                                                                                                       // 270
});                                                                                                       // 271
                                                                                                          // 272
// XXX make it possible for users to register attribute handlers!                                         // 273
makeAttributeHandler = function (elem, name, value) {                                                     // 274
  // generally, use setAttribute but certain attributes need to be set                                    // 275
  // by directly setting a JavaScript property on the DOM element.                                        // 276
  if (name === 'class') {                                                                                 // 277
    if (isSVGElement(elem)) {                                                                             // 278
      return new SVGClassHandler(name, value);                                                            // 279
    } else {                                                                                              // 280
      return new ClassHandler(name, value);                                                               // 281
    }                                                                                                     // 282
  } else if (name === 'style') {                                                                          // 283
    return new StyleHandler(name, value);                                                                 // 284
  } else if ((elem.tagName === 'OPTION' && name === 'selected') ||                                        // 285
             (elem.tagName === 'INPUT' && name === 'checked')) {                                          // 286
    return new BooleanHandler(name, value);                                                               // 287
  } else if ((elem.tagName === 'TEXTAREA' || elem.tagName === 'INPUT')                                    // 288
             && name === 'value') {                                                                       // 289
    // internally, TEXTAREAs tracks their value in the 'value'                                            // 290
    // attribute just like INPUTs.                                                                        // 291
    return new ValueHandler(name, value);                                                                 // 292
  } else if (name.substring(0,6) === 'xlink:') {                                                          // 293
    return new XlinkHandler(name.substring(6), value);                                                    // 294
  } else if (isUrlAttribute(elem.tagName, name)) {                                                        // 295
    return new UrlHandler(name, value);                                                                   // 296
  } else {                                                                                                // 297
    return new AttributeHandler(name, value);                                                             // 298
  }                                                                                                       // 299
                                                                                                          // 300
  // XXX will need one for 'style' on IE, though modern browsers                                          // 301
  // seem to handle setAttribute ok.                                                                      // 302
};                                                                                                        // 303
                                                                                                          // 304
                                                                                                          // 305
ElementAttributesUpdater = function (elem) {                                                              // 306
  this.elem = elem;                                                                                       // 307
  this.handlers = {};                                                                                     // 308
};                                                                                                        // 309
                                                                                                          // 310
// Update attributes on `elem` to the dictionary `attrs`, whose                                           // 311
// values are strings.                                                                                    // 312
ElementAttributesUpdater.prototype.update = function(newAttrs) {                                          // 313
  var elem = this.elem;                                                                                   // 314
  var handlers = this.handlers;                                                                           // 315
                                                                                                          // 316
  for (var k in handlers) {                                                                               // 317
    if (! _.has(newAttrs, k)) {                                                                           // 318
      // remove attributes (and handlers) for attribute names                                             // 319
      // that don't exist as keys of `newAttrs` and so won't                                              // 320
      // be visited when traversing it.  (Attributes that                                                 // 321
      // exist in the `newAttrs` object but are `null`                                                    // 322
      // are handled later.)                                                                              // 323
      var handler = handlers[k];                                                                          // 324
      var oldValue = handler.value;                                                                       // 325
      handler.value = null;                                                                               // 326
      handler.update(elem, oldValue, null);                                                               // 327
      delete handlers[k];                                                                                 // 328
    }                                                                                                     // 329
  }                                                                                                       // 330
                                                                                                          // 331
  for (var k in newAttrs) {                                                                               // 332
    var handler = null;                                                                                   // 333
    var oldValue;                                                                                         // 334
    var value = newAttrs[k];                                                                              // 335
    if (! _.has(handlers, k)) {                                                                           // 336
      if (value !== null) {                                                                               // 337
        // make new handler                                                                               // 338
        handler = makeAttributeHandler(elem, k, value);                                                   // 339
        handlers[k] = handler;                                                                            // 340
        oldValue = null;                                                                                  // 341
      }                                                                                                   // 342
    } else {                                                                                              // 343
      handler = handlers[k];                                                                              // 344
      oldValue = handler.value;                                                                           // 345
    }                                                                                                     // 346
    if (oldValue !== value) {                                                                             // 347
      handler.value = value;                                                                              // 348
      handler.update(elem, oldValue, value);                                                              // 349
      if (value === null)                                                                                 // 350
        delete handlers[k];                                                                               // 351
    }                                                                                                     // 352
  }                                                                                                       // 353
};                                                                                                        // 354
                                                                                                          // 355
////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                        //
// packages\blaze\materializer.js                                                                         //
//                                                                                                        //
////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                          //
// new Blaze.DOMMaterializer(options)                                                                     // 1
//                                                                                                        // 2
// An HTML.Visitor that turns HTMLjs into DOM nodes and DOMRanges.                                        // 3
//                                                                                                        // 4
// Options: `parentView`                                                                                  // 5
Blaze.DOMMaterializer = HTML.Visitor.extend();                                                            // 6
Blaze.DOMMaterializer.def({                                                                               // 7
  visitNull: function (x, intoArray) {                                                                    // 8
    return intoArray;                                                                                     // 9
  },                                                                                                      // 10
  visitPrimitive: function (primitive, intoArray) {                                                       // 11
    var string = String(primitive);                                                                       // 12
    intoArray.push(document.createTextNode(string));                                                      // 13
    return intoArray;                                                                                     // 14
  },                                                                                                      // 15
  visitCharRef: function (charRef, intoArray) {                                                           // 16
    return this.visitPrimitive(charRef.str, intoArray);                                                   // 17
  },                                                                                                      // 18
  visitArray: function (array, intoArray) {                                                               // 19
    for (var i = 0; i < array.length; i++)                                                                // 20
      this.visit(array[i], intoArray);                                                                    // 21
    return intoArray;                                                                                     // 22
  },                                                                                                      // 23
  visitComment: function (comment, intoArray) {                                                           // 24
    intoArray.push(document.createComment(comment.sanitizedValue));                                       // 25
    return intoArray;                                                                                     // 26
  },                                                                                                      // 27
  visitRaw: function (raw, intoArray) {                                                                   // 28
    // Get an array of DOM nodes by using the browser's HTML parser                                       // 29
    // (like innerHTML).                                                                                  // 30
    var nodes = Blaze.DOMBackend.parseHTML(raw.value);                                                    // 31
    for (var i = 0; i < nodes.length; i++)                                                                // 32
      intoArray.push(nodes[i]);                                                                           // 33
                                                                                                          // 34
    return intoArray;                                                                                     // 35
  },                                                                                                      // 36
  visitTag: function (tag, intoArray) {                                                                   // 37
    var self = this;                                                                                      // 38
    var tagName = tag.tagName;                                                                            // 39
    var elem;                                                                                             // 40
    if ((HTML.isKnownSVGElement(tagName) || isSVGAnchor(tag))                                             // 41
        && document.createElementNS) {                                                                    // 42
      // inline SVG                                                                                       // 43
      elem = document.createElementNS('http://www.w3.org/2000/svg', tagName);                             // 44
    } else {                                                                                              // 45
      // normal elements                                                                                  // 46
      elem = document.createElement(tagName);                                                             // 47
    }                                                                                                     // 48
                                                                                                          // 49
    var rawAttrs = tag.attrs;                                                                             // 50
    var children = tag.children;                                                                          // 51
    if (tagName === 'textarea' && tag.children.length &&                                                  // 52
        ! (rawAttrs && ('value' in rawAttrs))) {                                                          // 53
      // Provide very limited support for TEXTAREA tags with children                                     // 54
      // rather than a "value" attribute.                                                                 // 55
      // Reactivity in the form of Views nested in the tag's children                                     // 56
      // won't work.  Compilers should compile textarea contents into                                     // 57
      // the "value" attribute of the tag, wrapped in a function if there                                 // 58
      // is reactivity.                                                                                   // 59
      if (typeof rawAttrs === 'function' ||                                                               // 60
          HTML.isArray(rawAttrs)) {                                                                       // 61
        throw new Error("Can't have reactive children of TEXTAREA node; " +                               // 62
                        "use the 'value' attribute instead.");                                            // 63
      }                                                                                                   // 64
      rawAttrs = _.extend({}, rawAttrs || null);                                                          // 65
      rawAttrs.value = Blaze._expand(children, self.parentView);                                          // 66
      children = [];                                                                                      // 67
    }                                                                                                     // 68
                                                                                                          // 69
    if (rawAttrs) {                                                                                       // 70
      var attrUpdater = new ElementAttributesUpdater(elem);                                               // 71
      var updateAttributes = function () {                                                                // 72
        var parentView = self.parentView;                                                                 // 73
        var expandedAttrs = Blaze._expandAttributes(rawAttrs, parentView);                                // 74
        var flattenedAttrs = HTML.flattenAttributes(expandedAttrs);                                       // 75
        var stringAttrs = {};                                                                             // 76
        for (var attrName in flattenedAttrs) {                                                            // 77
          stringAttrs[attrName] = Blaze.toText(flattenedAttrs[attrName],                                  // 78
                                               parentView,                                                // 79
                                               HTML.TEXTMODE.STRING);                                     // 80
        }                                                                                                 // 81
        attrUpdater.update(stringAttrs);                                                                  // 82
      };                                                                                                  // 83
      var updaterComputation;                                                                             // 84
      if (self.parentView) {                                                                              // 85
        updaterComputation = self.parentView.autorun(updateAttributes);                                   // 86
      } else {                                                                                            // 87
        updaterComputation = Deps.nonreactive(function () {                                               // 88
          return Deps.autorun(function () {                                                               // 89
            Deps.withCurrentView(self.parentView, updateAttributes);                                      // 90
          });                                                                                             // 91
        });                                                                                               // 92
      }                                                                                                   // 93
      Blaze.DOMBackend.Teardown.onElementTeardown(elem, function attrTeardown() {                         // 94
        updaterComputation.stop();                                                                        // 95
      });                                                                                                 // 96
    }                                                                                                     // 97
                                                                                                          // 98
    var childNodesAndRanges = self.visit(children, []);                                                   // 99
    for (var i = 0; i < childNodesAndRanges.length; i++) {                                                // 100
      var x = childNodesAndRanges[i];                                                                     // 101
      if (x instanceof Blaze.DOMRange)                                                                    // 102
        x.attach(elem);                                                                                   // 103
      else                                                                                                // 104
        elem.appendChild(x);                                                                              // 105
    }                                                                                                     // 106
                                                                                                          // 107
    intoArray.push(elem);                                                                                 // 108
                                                                                                          // 109
    return intoArray;                                                                                     // 110
  },                                                                                                      // 111
  visitObject: function (x, intoArray) {                                                                  // 112
    if (Blaze.isTemplate(x))                                                                              // 113
      x = Blaze.runTemplate(x);                                                                           // 114
    if (x instanceof Blaze.View) {                                                                        // 115
      intoArray.push(Blaze.materializeView(x, this.parentView));                                          // 116
      return intoArray;                                                                                   // 117
    }                                                                                                     // 118
                                                                                                          // 119
    // throw the default error                                                                            // 120
    return HTML.Visitor.prototype.visitObject.call(this, x);                                              // 121
  }                                                                                                       // 122
});                                                                                                       // 123
                                                                                                          // 124
var isSVGAnchor = function (node) {                                                                       // 125
  // We generally aren't able to detect SVG <a> elements because                                          // 126
  // if "A" were in our list of known svg element names, then all                                         // 127
  // <a> nodes would be created using                                                                     // 128
  // `document.createElementNS`. But in the special case of <a                                            // 129
  // xlink:href="...">, we can at least detect that attribute and                                         // 130
  // create an SVG <a> tag in that case.                                                                  // 131
  //                                                                                                      // 132
  // However, we still have a general problem of knowing when to                                          // 133
  // use document.createElementNS and when to use                                                         // 134
  // document.createElement; for example, font tags will always                                           // 135
  // be created as SVG elements which can cause other                                                     // 136
  // problems. #1977                                                                                      // 137
  return (node.tagName === "a" &&                                                                         // 138
          node.attrs &&                                                                                   // 139
          node.attrs["xlink:href"] !== undefined);                                                        // 140
};                                                                                                        // 141
                                                                                                          // 142
////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                        //
// packages\blaze\exceptions.js                                                                           //
//                                                                                                        //
////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                          //
var debugFunc;                                                                                            // 1
                                                                                                          // 2
// We call into user code in many places, and it's nice to catch exceptions                               // 3
// propagated from user code immediately so that the whole system doesn't just                            // 4
// break.  Catching exceptions is easy; reporting them is hard.  This helper                              // 5
// reports exceptions.                                                                                    // 6
//                                                                                                        // 7
// Usage:                                                                                                 // 8
//                                                                                                        // 9
// ```                                                                                                    // 10
// try {                                                                                                  // 11
//   // ... someStuff ...                                                                                 // 12
// } catch (e) {                                                                                          // 13
//   reportUIException(e);                                                                                // 14
// }                                                                                                      // 15
// ```                                                                                                    // 16
//                                                                                                        // 17
// An optional second argument overrides the default message.                                             // 18
                                                                                                          // 19
// Set this to `true` to cause `reportException` to throw                                                 // 20
// the next exception rather than reporting it.  This is                                                  // 21
// useful in unit tests that test error messages.                                                         // 22
Blaze._throwNextException = false;                                                                        // 23
                                                                                                          // 24
Blaze.reportException = function (e, msg) {                                                               // 25
  if (Blaze._throwNextException) {                                                                        // 26
    Blaze._throwNextException = false;                                                                    // 27
    throw e;                                                                                              // 28
  }                                                                                                       // 29
                                                                                                          // 30
  if (! debugFunc)                                                                                        // 31
    // adapted from Deps                                                                                  // 32
    debugFunc = function () {                                                                             // 33
      return (typeof Meteor !== "undefined" ? Meteor._debug :                                             // 34
              ((typeof console !== "undefined") && console.log ? console.log :                            // 35
               function () {}));                                                                          // 36
    };                                                                                                    // 37
                                                                                                          // 38
  // In Chrome, `e.stack` is a multiline string that starts with the message                              // 39
  // and contains a stack trace.  Furthermore, `console.log` makes it clickable.                          // 40
  // `console.log` supplies the space between the two arguments.                                          // 41
  debugFunc()(msg || 'Exception caught in template:', e.stack || e.message);                              // 42
};                                                                                                        // 43
                                                                                                          // 44
Blaze.wrapCatchingExceptions = function (f, where) {                                                      // 45
  if (typeof f !== 'function')                                                                            // 46
    return f;                                                                                             // 47
                                                                                                          // 48
  return function () {                                                                                    // 49
    try {                                                                                                 // 50
      return f.apply(this, arguments);                                                                    // 51
    } catch (e) {                                                                                         // 52
      Blaze.reportException(e, 'Exception in ' + where + ':');                                            // 53
    }                                                                                                     // 54
  };                                                                                                      // 55
};                                                                                                        // 56
                                                                                                          // 57
////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                        //
// packages\blaze\reactivevar.js                                                                          //
//                                                                                                        //
////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                          //
/**                                                                                                       // 1
 * ## [new] Blaze.ReactiveVar(initialValue, [equalsFunc])                                                 // 2
 *                                                                                                        // 3
 * A ReactiveVar holds a single value that can be get and set,                                            // 4
 * such that calling `set` will invalidate any Computations that                                          // 5
 * called `get`, according to the usual contract for reactive                                             // 6
 * data sources.                                                                                          // 7
 *                                                                                                        // 8
 * A ReactiveVar is much like a Session variable -- compare `foo.get()`                                   // 9
 * to `Session.get("foo")` -- but it doesn't have a global name and isn't                                 // 10
 * automatically migrated across hot code pushes.  Also, while Session                                    // 11
 * variables can only hold JSON or EJSON, ReactiveVars can hold any value.                                // 12
 *                                                                                                        // 13
 * An important property of ReactiveVars, which is sometimes the reason                                   // 14
 * to use one, is that setting the value to the same value as before has                                  // 15
 * no effect, meaning ReactiveVars can be used to absorb extra                                            // 16
 * invalidations that wouldn't serve a purpose.  However, by default,                                     // 17
 * ReactiveVars are extremely conservative about what changes they                                        // 18
 * absorb.  Calling `set` with an object argument will *always* trigger                                   // 19
 * invalidations, because even if the new value is `===` the old value,                                   // 20
 * the object may have been mutated.  You can change the default behavior                                 // 21
 * by passing a function of two arguments, `oldValue` and `newValue`,                                     // 22
 * to the constructor as `equalsFunc`.                                                                    // 23
 *                                                                                                        // 24
 * This class is extremely basic right now, but the idea is to evolve                                     // 25
 * it into the ReactiveVar of Geoff's Lickable Forms proposal.                                            // 26
 */                                                                                                       // 27
                                                                                                          // 28
Blaze.ReactiveVar = function (initialValue, equalsFunc) {                                                 // 29
  if (! (this instanceof Blaze.ReactiveVar))                                                              // 30
    // called without `new`                                                                               // 31
    return new Blaze.ReactiveVar(initialValue, equalsFunc);                                               // 32
                                                                                                          // 33
  this.curValue = initialValue;                                                                           // 34
  this.equalsFunc = equalsFunc;                                                                           // 35
  this.dep = new Deps.Dependency;                                                                         // 36
};                                                                                                        // 37
                                                                                                          // 38
Blaze.ReactiveVar._isEqual = function (oldValue, newValue) {                                              // 39
  var a = oldValue, b = newValue;                                                                         // 40
  // Two values are "equal" here if they are `===` and are                                                // 41
  // number, boolean, string, undefined, or null.                                                         // 42
  if (a !== b)                                                                                            // 43
    return false;                                                                                         // 44
  else                                                                                                    // 45
    return ((!a) || (typeof a === 'number') || (typeof a === 'boolean') ||                                // 46
            (typeof a === 'string'));                                                                     // 47
};                                                                                                        // 48
                                                                                                          // 49
Blaze.ReactiveVar.prototype.get = function () {                                                           // 50
  if (Deps.active)                                                                                        // 51
    this.dep.depend();                                                                                    // 52
                                                                                                          // 53
  return this.curValue;                                                                                   // 54
};                                                                                                        // 55
                                                                                                          // 56
Blaze.ReactiveVar.prototype.set = function (newValue) {                                                   // 57
  var oldValue = this.curValue;                                                                           // 58
                                                                                                          // 59
  if ((this.equalsFunc || Blaze.ReactiveVar._isEqual)(oldValue, newValue))                                // 60
    // value is same as last time                                                                         // 61
    return;                                                                                               // 62
                                                                                                          // 63
  this.curValue = newValue;                                                                               // 64
  this.dep.changed();                                                                                     // 65
};                                                                                                        // 66
                                                                                                          // 67
Blaze.ReactiveVar.prototype.toString = function () {                                                      // 68
  return 'ReactiveVar{' + this.get() + '}';                                                               // 69
};                                                                                                        // 70
                                                                                                          // 71
////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                        //
// packages\blaze\view.js                                                                                 //
//                                                                                                        //
////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                          //
/// [new] Blaze.View([kind], renderMethod)                                                                // 1
///                                                                                                       // 2
/// Blaze.View is the building block of reactive DOM.  Views have                                         // 3
/// the following features:                                                                               // 4
///                                                                                                       // 5
/// * lifecycle callbacks - Views are created, rendered, and destroyed,                                   // 6
///   and callbacks can be registered to fire when these things happen.                                   // 7
///                                                                                                       // 8
/// * parent pointer - A View points to its parentView, which is the                                      // 9
///   View that caused it to be rendered.  These pointers form a                                          // 10
///   hierarchy or tree of Views.                                                                         // 11
///                                                                                                       // 12
/// * render() method - A View's render() method specifies the DOM                                        // 13
///   (or HTML) content of the View.  If the method establishes                                           // 14
///   reactive dependencies, it may be re-run.                                                            // 15
///                                                                                                       // 16
/// * a DOMRange - If a View is rendered to DOM, its position and                                         // 17
///   extent in the DOM are tracked using a DOMRange object.                                              // 18
///                                                                                                       // 19
/// When a View is constructed by calling Blaze.View, the View is                                         // 20
/// not yet considered "created."  It doesn't have a parentView yet,                                      // 21
/// and no logic has been run to initialize the View.  All real                                           // 22
/// work is deferred until at least creation time, when the onCreated                                     // 23
/// callbacks are fired, which happens when the View is "used" in                                         // 24
/// some way that requires it to be rendered.                                                             // 25
///                                                                                                       // 26
/// ...more lifecycle stuff                                                                               // 27
///                                                                                                       // 28
/// `kind` is an optional string tag identifying the View.  The only                                      // 29
/// time it's used is when looking in the View tree for a View of a                                       // 30
/// particular kind; for example, data contexts are stored on Views                                       // 31
/// of kind "with".  Kinds are also useful when debugging, so in                                          // 32
/// general it's good for functions that create Views to set the kind.                                    // 33
/// Templates have kinds of the form "Template.foo".                                                      // 34
Blaze.View = function (kind, render) {                                                                    // 35
  if (! (this instanceof Blaze.View))                                                                     // 36
    // called without `new`                                                                               // 37
    return new Blaze.View(kind, render);                                                                  // 38
                                                                                                          // 39
  if (typeof kind === 'function') {                                                                       // 40
    // omitted "kind" argument                                                                            // 41
    render = kind;                                                                                        // 42
    kind = '';                                                                                            // 43
  }                                                                                                       // 44
  this.kind = kind;                                                                                       // 45
  this.render = render;                                                                                   // 46
                                                                                                          // 47
  this._callbacks = {                                                                                     // 48
    created: null,                                                                                        // 49
    materialized: null,                                                                                   // 50
    rendered: null,                                                                                       // 51
    destroyed: null                                                                                       // 52
  };                                                                                                      // 53
                                                                                                          // 54
  // Setting all properties here is good for readability,                                                 // 55
  // and also may help Chrome optimize the code by keeping                                                // 56
  // the View object from changing shape too much.                                                        // 57
  this.isCreated = false;                                                                                 // 58
  this.isCreatedForExpansion = false;                                                                     // 59
  this.isDestroyed = false;                                                                               // 60
  this.isInRender = false;                                                                                // 61
  this.parentView = null;                                                                                 // 62
  this.domrange = null;                                                                                   // 63
                                                                                                          // 64
  this.renderCount = 0;                                                                                   // 65
};                                                                                                        // 66
                                                                                                          // 67
Blaze.View.prototype.render = function () { return null; };                                               // 68
                                                                                                          // 69
Blaze.View.prototype.onCreated = function (cb) {                                                          // 70
  this._callbacks.created = this._callbacks.created || [];                                                // 71
  this._callbacks.created.push(cb);                                                                       // 72
};                                                                                                        // 73
Blaze.View.prototype.onMaterialized = function (cb) {                                                     // 74
  this._callbacks.materialized = this._callbacks.materialized || [];                                      // 75
  this._callbacks.materialized.push(cb);                                                                  // 76
};                                                                                                        // 77
Blaze.View.prototype.onRendered = function (cb) {                                                         // 78
  this._callbacks.rendered = this._callbacks.rendered || [];                                              // 79
  this._callbacks.rendered.push(cb);                                                                      // 80
};                                                                                                        // 81
Blaze.View.prototype.onDestroyed = function (cb) {                                                        // 82
  this._callbacks.destroyed = this._callbacks.destroyed || [];                                            // 83
  this._callbacks.destroyed.push(cb);                                                                     // 84
};                                                                                                        // 85
                                                                                                          // 86
/// View#autorun(func)                                                                                    // 87
///                                                                                                       // 88
/// Sets up a Deps autorun that is "scoped" to this View in two                                           // 89
/// important ways: 1) Blaze.currentView is automatically set                                             // 90
/// on every re-run, and 2) the autorun is stopped when the                                               // 91
/// View is destroyed.  As with Deps.autorun, the first run of                                            // 92
/// the function is immediate, and a Computation object that can                                          // 93
/// be used to stop the autorun is returned.                                                              // 94
///                                                                                                       // 95
/// View#autorun is meant to be called from View callbacks like                                           // 96
/// onCreated, or from outside the rendering process.  It may not                                         // 97
/// be called before the onCreated callbacks are fired (too early),                                       // 98
/// or from a render() method (too confusing).                                                            // 99
///                                                                                                       // 100
/// Typically, autoruns that update the state                                                             // 101
/// of the View (as in Blaze.With) should be started from an onCreated                                    // 102
/// callback.  Autoruns that update the DOM should be started                                             // 103
/// from either onCreated (guarded against the absence of                                                 // 104
/// view.domrange), onMaterialized, or onRendered.                                                        // 105
Blaze.View.prototype.autorun = function (f, _inViewScope) {                                               // 106
  var self = this;                                                                                        // 107
                                                                                                          // 108
  // The restrictions on when View#autorun can be called are in order                                     // 109
  // to avoid bad patterns, like creating a Blaze.View and immediately                                    // 110
  // calling autorun on it.  A freshly created View is not ready to                                       // 111
  // have logic run on it; it doesn't have a parentView, for example.                                     // 112
  // It's when the View is materialized or expanded that the onCreated                                    // 113
  // handlers are fired and the View starts up.                                                           // 114
  //                                                                                                      // 115
  // Letting the render() method call `this.autorun()` is problematic                                     // 116
  // because of re-render.  The best we can do is to stop the old                                         // 117
  // autorun and start a new one for each render, but that's a pattern                                    // 118
  // we try to avoid internally because it leads to helpers being                                         // 119
  // called extra times, in the case where the autorun causes the                                         // 120
  // view to re-render (and thus the autorun to be torn down and a                                        // 121
  // new one established).                                                                                // 122
  //                                                                                                      // 123
  // We could lift these restrictions in various ways.  One interesting                                   // 124
  // idea is to allow you to call `view.autorun` after instantiating                                      // 125
  // `view`, and automatically wrap it in `view.onCreated`, deferring                                     // 126
  // the autorun so that it starts at an appropriate time.  However,                                      // 127
  // then we can't return the Computation object to the caller, because                                   // 128
  // it doesn't exist yet.                                                                                // 129
  if (! self.isCreated) {                                                                                 // 130
    throw new Error("View#autorun must be called from the created callback at the earliest");             // 131
  }                                                                                                       // 132
  if (this.isInRender) {                                                                                  // 133
    throw new Error("Can't call View#autorun from inside render(); try calling it from the created or rendered callback");
  }                                                                                                       // 135
  if (Deps.active) {                                                                                      // 136
    throw new Error("Can't call View#autorun from a Deps Computation; try calling it from the created or rendered callback");
  }                                                                                                       // 138
                                                                                                          // 139
  var c = Deps.autorun(function viewAutorun(c) {                                                          // 140
    return Blaze.withCurrentView(_inViewScope || self, function () {                                      // 141
      return f.call(self, c);                                                                             // 142
    });                                                                                                   // 143
  });                                                                                                     // 144
  self.onDestroyed(function () { c.stop(); });                                                            // 145
                                                                                                          // 146
  return c;                                                                                               // 147
};                                                                                                        // 148
                                                                                                          // 149
Blaze._fireCallbacks = function (view, which) {                                                           // 150
  Blaze.withCurrentView(view, function () {                                                               // 151
    Deps.nonreactive(function fireCallbacks() {                                                           // 152
      var cbs = view._callbacks[which];                                                                   // 153
      for (var i = 0, N = (cbs && cbs.length); i < N; i++)                                                // 154
        cbs[i].call(view);                                                                                // 155
    });                                                                                                   // 156
  });                                                                                                     // 157
};                                                                                                        // 158
                                                                                                          // 159
Blaze.materializeView = function (view, parentView) {                                                     // 160
  view.parentView = (parentView || null);                                                                 // 161
                                                                                                          // 162
  if (view.isCreated)                                                                                     // 163
    throw new Error("Can't render the same View twice");                                                  // 164
  view.isCreated = true;                                                                                  // 165
                                                                                                          // 166
  Blaze._fireCallbacks(view, 'created');                                                                  // 167
                                                                                                          // 168
  var domrange;                                                                                           // 169
                                                                                                          // 170
  var needsRenderedCallback = false;                                                                      // 171
  var scheduleRenderedCallback = function () {                                                            // 172
    if (needsRenderedCallback && ! view.isDestroyed &&                                                    // 173
        view._callbacks.rendered && view._callbacks.rendered.length) {                                    // 174
      Deps.afterFlush(function callRendered() {                                                           // 175
        if (needsRenderedCallback && ! view.isDestroyed) {                                                // 176
          needsRenderedCallback = false;                                                                  // 177
          Blaze._fireCallbacks(view, 'rendered');                                                         // 178
        }                                                                                                 // 179
      });                                                                                                 // 180
    }                                                                                                     // 181
  };                                                                                                      // 182
                                                                                                          // 183
  var lastHtmljs;                                                                                         // 184
  // We don't expect to be called in a Computation, but just in case,                                     // 185
  // wrap in Deps.nonreactive.                                                                            // 186
  Deps.nonreactive(function () {                                                                          // 187
    view.autorun(function doRender(c) {                                                                   // 188
      // `view.autorun` sets the current view.                                                            // 189
      // Any dependencies that should invalidate this Computation come                                    // 190
      // from this line:                                                                                  // 191
      view.renderCount++;                                                                                 // 192
      view.isInRender = true;                                                                             // 193
      var htmljs = view.render();                                                                         // 194
      view.isInRender = false;                                                                            // 195
                                                                                                          // 196
      Deps.nonreactive(function doMaterialize() {                                                         // 197
        var materializer = new Blaze.DOMMaterializer({parentView: view});                                 // 198
        var rangesAndNodes = materializer.visit(htmljs, []);                                              // 199
        if (c.firstRun || ! Blaze._isContentEqual(lastHtmljs, htmljs)) {                                  // 200
          if (c.firstRun) {                                                                               // 201
            domrange = new Blaze.DOMRange(rangesAndNodes);                                                // 202
            view.domrange = domrange;                                                                     // 203
            domrange.view = view;                                                                         // 204
          } else {                                                                                        // 205
            domrange.setMembers(rangesAndNodes);                                                          // 206
          }                                                                                               // 207
          Blaze._fireCallbacks(view, 'materialized');                                                     // 208
          needsRenderedCallback = true;                                                                   // 209
          if (! c.firstRun)                                                                               // 210
            scheduleRenderedCallback();                                                                   // 211
        }                                                                                                 // 212
      });                                                                                                 // 213
      lastHtmljs = htmljs;                                                                                // 214
                                                                                                          // 215
      // Causes any nested views to stop immediately, not when we call                                    // 216
      // `setMembers` the next time around the autorun.  Otherwise,                                       // 217
      // helpers in the DOM tree to be replaced might be scheduled                                        // 218
      // to re-run before we have a chance to stop them.                                                  // 219
      Deps.onInvalidate(function () {                                                                     // 220
        domrange.destroyMembers();                                                                        // 221
      });                                                                                                 // 222
    });                                                                                                   // 223
                                                                                                          // 224
    var teardownHook = null;                                                                              // 225
                                                                                                          // 226
    domrange.onAttached(function attached(range, element) {                                               // 227
      teardownHook = Blaze.DOMBackend.Teardown.onElementTeardown(                                         // 228
        element, function teardown() {                                                                    // 229
          Blaze.destroyView(view, true /* _skipNodes */);                                                 // 230
        });                                                                                               // 231
                                                                                                          // 232
      scheduleRenderedCallback();                                                                         // 233
    });                                                                                                   // 234
                                                                                                          // 235
    // tear down the teardown hook                                                                        // 236
    view.onDestroyed(function () {                                                                        // 237
      teardownHook && teardownHook.stop();                                                                // 238
      teardownHook = null;                                                                                // 239
    });                                                                                                   // 240
  });                                                                                                     // 241
                                                                                                          // 242
  return domrange;                                                                                        // 243
};                                                                                                        // 244
                                                                                                          // 245
// Expands a View to HTMLjs, calling `render` recursively on all                                          // 246
// Views and evaluating any dynamic attributes.  Calls the `created`                                      // 247
// callback, but not the `materialized` or `rendered` callbacks.                                          // 248
// Destroys the view immediately, unless called in a Deps Computation,                                    // 249
// in which case the view will be destroyed when the Computation is                                       // 250
// invalidated.  If called in a Deps Computation, the result is a                                         // 251
// reactive string; that is, the Computation will be invalidated                                          // 252
// if any changes are made to the view or subviews that might affect                                      // 253
// the HTML.                                                                                              // 254
Blaze._expandView = function (view, parentView) {                                                         // 255
  view.parentView = (parentView || null);                                                                 // 256
                                                                                                          // 257
  if (view.isCreated)                                                                                     // 258
    throw new Error("Can't render the same View twice");                                                  // 259
  view.isCreated = true;                                                                                  // 260
  view.isCreatedForExpansion = true;                                                                      // 261
                                                                                                          // 262
  Blaze._fireCallbacks(view, 'created');                                                                  // 263
                                                                                                          // 264
  view.isInRender = true;                                                                                 // 265
  var htmljs = Blaze.withCurrentView(view, function () {                                                  // 266
    return view.render();                                                                                 // 267
  });                                                                                                     // 268
  view.isInRender = false;                                                                                // 269
                                                                                                          // 270
  var result = Blaze._expand(htmljs, view);                                                               // 271
                                                                                                          // 272
  if (Deps.active) {                                                                                      // 273
    Deps.onInvalidate(function () {                                                                       // 274
      Blaze.destroyView(view);                                                                            // 275
    });                                                                                                   // 276
  } else {                                                                                                // 277
    Blaze.destroyView(view);                                                                              // 278
  }                                                                                                       // 279
                                                                                                          // 280
  return result;                                                                                          // 281
};                                                                                                        // 282
                                                                                                          // 283
// Options: `parentView`                                                                                  // 284
Blaze.HTMLJSExpander = HTML.TransformingVisitor.extend();                                                 // 285
Blaze.HTMLJSExpander.def({                                                                                // 286
  visitObject: function (x) {                                                                             // 287
    if (Blaze.isTemplate(x))                                                                              // 288
      x = Blaze.runTemplate(x);                                                                           // 289
    if (x instanceof Blaze.View)                                                                          // 290
      return Blaze._expandView(x, this.parentView);                                                       // 291
                                                                                                          // 292
    // this will throw an error; other objects are not allowed!                                           // 293
    return HTML.TransformingVisitor.prototype.visitObject.call(this, x);                                  // 294
  },                                                                                                      // 295
  visitAttributes: function (attrs) {                                                                     // 296
    // expand dynamic attributes                                                                          // 297
    if (typeof attrs === 'function')                                                                      // 298
      attrs = Blaze.withCurrentView(this.parentView, attrs);                                              // 299
                                                                                                          // 300
    // call super (e.g. for case where `attrs` is an array)                                               // 301
    return HTML.TransformingVisitor.prototype.visitAttributes.call(this, attrs);                          // 302
  },                                                                                                      // 303
  visitAttribute: function (name, value, tag) {                                                           // 304
    // expand attribute values that are functions.  Any attribute value                                   // 305
    // that contains Views must be wrapped in a function.                                                 // 306
    if (typeof value === 'function')                                                                      // 307
      value = Blaze.withCurrentView(this.parentView, value);                                              // 308
                                                                                                          // 309
    return HTML.TransformingVisitor.prototype.visitAttribute.call(                                        // 310
      this, name, value, tag);                                                                            // 311
  }                                                                                                       // 312
});                                                                                                       // 313
                                                                                                          // 314
// Return Blaze.currentView, but only if it is being rendered                                             // 315
// (i.e. we are in its render() method).                                                                  // 316
var currentViewIfRendering = function () {                                                                // 317
  var view = Blaze.currentView;                                                                           // 318
  return (view && view.isInRender) ? view : null;                                                         // 319
};                                                                                                        // 320
                                                                                                          // 321
Blaze._expand = function (htmljs, parentView) {                                                           // 322
  parentView = parentView || currentViewIfRendering();                                                    // 323
  return (new Blaze.HTMLJSExpander(                                                                       // 324
    {parentView: parentView})).visit(htmljs);                                                             // 325
};                                                                                                        // 326
                                                                                                          // 327
Blaze._expandAttributes = function (attrs, parentView) {                                                  // 328
  parentView = parentView || currentViewIfRendering();                                                    // 329
  return (new Blaze.HTMLJSExpander(                                                                       // 330
    {parentView: parentView})).visitAttributes(attrs);                                                    // 331
};                                                                                                        // 332
                                                                                                          // 333
Blaze.destroyView = function (view, _skipNodes) {                                                         // 334
  if (view.isDestroyed)                                                                                   // 335
    return;                                                                                               // 336
  view.isDestroyed = true;                                                                                // 337
                                                                                                          // 338
  Blaze._fireCallbacks(view, 'destroyed');                                                                // 339
                                                                                                          // 340
  // Destroy views and elements recursively.  If _skipNodes,                                              // 341
  // only recurse up to views, not elements, for the case where                                           // 342
  // the backend (jQuery) is recursing over the elements already.                                         // 343
                                                                                                          // 344
  if (view.domrange)                                                                                      // 345
    view.domrange.destroyMembers();                                                                       // 346
};                                                                                                        // 347
                                                                                                          // 348
Blaze.destroyNode = function (node) {                                                                     // 349
  if (node.nodeType === 1)                                                                                // 350
    Blaze.DOMBackend.Teardown.tearDownElement(node);                                                      // 351
};                                                                                                        // 352
                                                                                                          // 353
// Are the HTMLjs entities `a` and `b` the same?  We could be                                             // 354
// more elaborate here but the point is to catch the most basic                                           // 355
// cases.                                                                                                 // 356
Blaze._isContentEqual = function (a, b) {                                                                 // 357
  if (a instanceof HTML.Raw) {                                                                            // 358
    return (b instanceof HTML.Raw) && (a.value === b.value);                                              // 359
  } else if (a == null) {                                                                                 // 360
    return (b == null);                                                                                   // 361
  } else {                                                                                                // 362
    return (a === b) &&                                                                                   // 363
      ((typeof a === 'number') || (typeof a === 'boolean') ||                                             // 364
       (typeof a === 'string'));                                                                          // 365
  }                                                                                                       // 366
};                                                                                                        // 367
                                                                                                          // 368
Blaze.currentView = null;                                                                                 // 369
                                                                                                          // 370
Blaze.withCurrentView = function (view, func) {                                                           // 371
  var oldView = Blaze.currentView;                                                                        // 372
  try {                                                                                                   // 373
    Blaze.currentView = view;                                                                             // 374
    return func();                                                                                        // 375
  } finally {                                                                                             // 376
    Blaze.currentView = oldView;                                                                          // 377
  }                                                                                                       // 378
};                                                                                                        // 379
                                                                                                          // 380
Blaze.isTemplate = function (t) {                                                                         // 381
  return t && (typeof t.__makeView === 'function');                                                       // 382
};                                                                                                        // 383
                                                                                                          // 384
Blaze.runTemplate = function (t/*, args*/) {                                                              // 385
  if (! Blaze.isTemplate(t))                                                                              // 386
    throw new Error("Not a template: " + t);                                                              // 387
  var restArgs = Array.prototype.slice.call(arguments, 1);                                                // 388
  return t.__makeView.apply(t, restArgs);                                                                 // 389
};                                                                                                        // 390
                                                                                                          // 391
Blaze.render = function (content, parentView) {                                                           // 392
  parentView = parentView || currentViewIfRendering();                                                    // 393
                                                                                                          // 394
  var view;                                                                                               // 395
  if (typeof content === 'function') {                                                                    // 396
    view = Blaze.View('render', content);                                                                 // 397
  } else if (Blaze.isTemplate(content)) {                                                                 // 398
    view = Blaze.runTemplate(content);                                                                    // 399
  } else {                                                                                                // 400
    if (! (content instanceof Blaze.View))                                                                // 401
      throw new Error("Expected a function, template, or View in Blaze.render");                          // 402
    view = content;                                                                                       // 403
  }                                                                                                       // 404
  return Blaze.materializeView(view, parentView);                                                         // 405
};                                                                                                        // 406
                                                                                                          // 407
Blaze.toHTML = function (htmljs, parentView) {                                                            // 408
  if (typeof htmljs === 'function')                                                                       // 409
    throw new Error("Blaze.toHTML doesn't take a function, just HTMLjs");                                 // 410
  parentView = parentView || currentViewIfRendering();                                                    // 411
  return HTML.toHTML(Blaze._expand(htmljs, parentView));                                                  // 412
};                                                                                                        // 413
                                                                                                          // 414
Blaze.toText = function (htmljs, parentView, textMode) {                                                  // 415
  if (typeof htmljs === 'function')                                                                       // 416
    throw new Error("Blaze.toText doesn't take a function, just HTMLjs");                                 // 417
                                                                                                          // 418
  if ((parentView != null) && ! (parentView instanceof Blaze.View)) {                                     // 419
    // omitted parentView argument                                                                        // 420
    textMode = parentView;                                                                                // 421
    parentView = null;                                                                                    // 422
  }                                                                                                       // 423
  parentView = parentView || currentViewIfRendering();                                                    // 424
                                                                                                          // 425
  if (! textMode)                                                                                         // 426
    throw new Error("textMode required");                                                                 // 427
  if (! (textMode === HTML.TEXTMODE.STRING ||                                                             // 428
         textMode === HTML.TEXTMODE.RCDATA ||                                                             // 429
         textMode === HTML.TEXTMODE.ATTRIBUTE))                                                           // 430
    throw new Error("Unknown textMode: " + textMode);                                                     // 431
                                                                                                          // 432
  return HTML.toText(Blaze._expand(htmljs, parentView), textMode);                                        // 433
};                                                                                                        // 434
                                                                                                          // 435
Blaze.getCurrentData = function () {                                                                      // 436
  var theWith = Blaze.getCurrentView('with');                                                             // 437
  return theWith ? theWith.dataVar.get() : null;                                                          // 438
};                                                                                                        // 439
                                                                                                          // 440
// Gets the current view or its nearest ancestor of kind                                                  // 441
// `kind`.                                                                                                // 442
Blaze.getCurrentView = function (kind) {                                                                  // 443
  var view = Blaze.currentView;                                                                           // 444
  // Better to fail in cases where it doesn't make sense                                                  // 445
  // to use Blaze.getCurrentView().  There will be a current                                              // 446
  // view anywhere it does.  You can check Blaze.currentView                                              // 447
  // if you want to know whether there is one or not.                                                     // 448
  if (! view)                                                                                             // 449
    throw new Error("There is no current view");                                                          // 450
                                                                                                          // 451
  if (kind) {                                                                                             // 452
    while (view && view.kind !== kind)                                                                    // 453
      view = view.parentView;                                                                             // 454
    return view || null;                                                                                  // 455
  } else {                                                                                                // 456
    // Blaze.getCurrentView() with no arguments just returns                                              // 457
    // Blaze.currentView.                                                                                 // 458
    return view;                                                                                          // 459
  }                                                                                                       // 460
};                                                                                                        // 461
                                                                                                          // 462
// Gets the nearest ancestor view that corresponds to a template                                          // 463
Blaze.getCurrentTemplateView = function () {                                                              // 464
  var view = Blaze.getCurrentView();                                                                      // 465
                                                                                                          // 466
  while (view && ! view.template)                                                                         // 467
    view = view.parentView;                                                                               // 468
                                                                                                          // 469
  return view || null;                                                                                    // 470
};                                                                                                        // 471
                                                                                                          // 472
Blaze.getParentView = function (view, kind) {                                                             // 473
  var v = view.parentView;                                                                                // 474
                                                                                                          // 475
  if (kind) {                                                                                             // 476
    while (v && v.kind !== kind)                                                                          // 477
      v = v.parentView;                                                                                   // 478
  }                                                                                                       // 479
                                                                                                          // 480
  return v || null;                                                                                       // 481
};                                                                                                        // 482
                                                                                                          // 483
Blaze.getElementView = function (elem, kind) {                                                            // 484
  var range = Blaze.DOMRange.forElement(elem);                                                            // 485
  var view = null;                                                                                        // 486
  while (range && ! view) {                                                                               // 487
    view = (range.view || null);                                                                          // 488
    if (! view) {                                                                                         // 489
      if (range.parentRange)                                                                              // 490
        range = range.parentRange;                                                                        // 491
      else                                                                                                // 492
        range = Blaze.DOMRange.forElement(range.parentElement);                                           // 493
    }                                                                                                     // 494
  }                                                                                                       // 495
                                                                                                          // 496
  if (kind) {                                                                                             // 497
    while (view && view.kind !== kind)                                                                    // 498
      view = view.parentView;                                                                             // 499
    return view || null;                                                                                  // 500
  } else {                                                                                                // 501
    return view;                                                                                          // 502
  }                                                                                                       // 503
};                                                                                                        // 504
                                                                                                          // 505
Blaze.getElementData = function (elem) {                                                                  // 506
  var theWith = Blaze.getElementView(elem, 'with');                                                       // 507
  return theWith ? theWith.dataVar.get() : null;                                                          // 508
};                                                                                                        // 509
                                                                                                          // 510
Blaze.getViewData = function (view) {                                                                     // 511
  var theWith = Blaze.getParentView(view, 'with');                                                        // 512
  return theWith ? theWith.dataVar.get() : null;                                                          // 513
};                                                                                                        // 514
                                                                                                          // 515
Blaze._addEventMap = function (view, eventMap, thisInHandler) {                                           // 516
  thisInHandler = (thisInHandler || null);                                                                // 517
  var handles = [];                                                                                       // 518
                                                                                                          // 519
  if (! view.domrange)                                                                                    // 520
    throw new Error("View must have a DOMRange");                                                         // 521
                                                                                                          // 522
  view.domrange.onAttached(function attached_eventMaps(range, element) {                                  // 523
    _.each(eventMap, function (handler, spec) {                                                           // 524
      var clauses = spec.split(/,\s+/);                                                                   // 525
      // iterate over clauses of spec, e.g. ['click .foo', 'click .bar']                                  // 526
      _.each(clauses, function (clause) {                                                                 // 527
        var parts = clause.split(/\s+/);                                                                  // 528
        if (parts.length === 0)                                                                           // 529
          return;                                                                                         // 530
                                                                                                          // 531
        var newEvents = parts.shift();                                                                    // 532
        var selector = parts.join(' ');                                                                   // 533
        handles.push(Blaze.EventSupport.listen(                                                           // 534
          element, newEvents, selector,                                                                   // 535
          function (evt) {                                                                                // 536
            if (! range.containsElement(evt.currentTarget))                                               // 537
              return null;                                                                                // 538
            var handlerThis = thisInHandler || this;                                                      // 539
            var handlerArgs = arguments;                                                                  // 540
            return Blaze.withCurrentView(view, function () {                                              // 541
              return handler.apply(handlerThis, handlerArgs);                                             // 542
            });                                                                                           // 543
          },                                                                                              // 544
          range, function (r) {                                                                           // 545
            return r.parentRange;                                                                         // 546
          }));                                                                                            // 547
      });                                                                                                 // 548
    });                                                                                                   // 549
  });                                                                                                     // 550
                                                                                                          // 551
  view.onDestroyed(function () {                                                                          // 552
    _.each(handles, function (h) {                                                                        // 553
      h.stop();                                                                                           // 554
    });                                                                                                   // 555
    handles.length = 0;                                                                                   // 556
  });                                                                                                     // 557
};                                                                                                        // 558
                                                                                                          // 559
////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                        //
// packages\blaze\builtins.js                                                                             //
//                                                                                                        //
////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                          //
Blaze._calculateCondition = function (cond) {                                                             // 1
  if (cond instanceof Array && cond.length === 0)                                                         // 2
    cond = false;                                                                                         // 3
  return !! cond;                                                                                         // 4
};                                                                                                        // 5
                                                                                                          // 6
Blaze.With = function (data, contentFunc) {                                                               // 7
  var view = Blaze.View('with', contentFunc);                                                             // 8
                                                                                                          // 9
  view.dataVar = new Blaze.ReactiveVar;                                                                   // 10
                                                                                                          // 11
  view.onCreated(function () {                                                                            // 12
    if (typeof data === 'function') {                                                                     // 13
      // `data` is a reactive function                                                                    // 14
      view.autorun(function () {                                                                          // 15
        view.dataVar.set(data());                                                                         // 16
      }, view.parentView);                                                                                // 17
    } else {                                                                                              // 18
      view.dataVar.set(data);                                                                             // 19
    }                                                                                                     // 20
  });                                                                                                     // 21
                                                                                                          // 22
  return view;                                                                                            // 23
};                                                                                                        // 24
                                                                                                          // 25
Blaze.If = function (conditionFunc, contentFunc, elseFunc, _not) {                                        // 26
  var conditionVar = new Blaze.ReactiveVar;                                                               // 27
                                                                                                          // 28
  var view = Blaze.View(_not ? 'unless' : 'if', function () {                                             // 29
    return conditionVar.get() ? contentFunc() :                                                           // 30
      (elseFunc ? elseFunc() : null);                                                                     // 31
  });                                                                                                     // 32
  view.__conditionVar = conditionVar;                                                                     // 33
  view.onCreated(function () {                                                                            // 34
    this.autorun(function () {                                                                            // 35
      var cond = Blaze._calculateCondition(conditionFunc());                                              // 36
      conditionVar.set(_not ? (! cond) : cond);                                                           // 37
    }, this.parentView);                                                                                  // 38
  });                                                                                                     // 39
                                                                                                          // 40
  return view;                                                                                            // 41
};                                                                                                        // 42
                                                                                                          // 43
Blaze.Unless = function (conditionFunc, contentFunc, elseFunc) {                                          // 44
  return Blaze.If(conditionFunc, contentFunc, elseFunc, true /*_not*/);                                   // 45
};                                                                                                        // 46
                                                                                                          // 47
Blaze.Each = function (argFunc, contentFunc, elseFunc) {                                                  // 48
  var eachView = Blaze.View('each', function () {                                                         // 49
    var subviews = this.initialSubviews;                                                                  // 50
    this.initialSubviews = null;                                                                          // 51
    if (this.isCreatedForExpansion) {                                                                     // 52
      this.expandedValueDep = new Deps.Dependency;                                                        // 53
      this.expandedValueDep.depend();                                                                     // 54
    }                                                                                                     // 55
    return subviews;                                                                                      // 56
  });                                                                                                     // 57
  eachView.initialSubviews = [];                                                                          // 58
  eachView.numItems = 0;                                                                                  // 59
  eachView.inElseMode = false;                                                                            // 60
  eachView.stopHandle = null;                                                                             // 61
  eachView.contentFunc = contentFunc;                                                                     // 62
  eachView.elseFunc = elseFunc;                                                                           // 63
  eachView.argVar = new Blaze.ReactiveVar;                                                                // 64
                                                                                                          // 65
  eachView.onCreated(function () {                                                                        // 66
    // We evaluate argFunc in an autorun to make sure                                                     // 67
    // Blaze.currentView is always set when it runs (rather than                                          // 68
    // passing argFunc straight to ObserveSequence).                                                      // 69
    eachView.autorun(function () {                                                                        // 70
      eachView.argVar.set(argFunc());                                                                     // 71
    }, eachView.parentView);                                                                              // 72
                                                                                                          // 73
    eachView.stopHandle = ObserveSequence.observe(function () {                                           // 74
      return eachView.argVar.get();                                                                       // 75
    }, {                                                                                                  // 76
      addedAt: function (id, item, index) {                                                               // 77
        Deps.nonreactive(function () {                                                                    // 78
          var newItemView = Blaze.With(item, eachView.contentFunc);                                       // 79
          eachView.numItems++;                                                                            // 80
                                                                                                          // 81
          if (eachView.expandedValueDep) {                                                                // 82
            eachView.expandedValueDep.changed();                                                          // 83
          } else if (eachView.domrange) {                                                                 // 84
            if (eachView.inElseMode) {                                                                    // 85
              eachView.domrange.removeMember(0);                                                          // 86
              eachView.inElseMode = false;                                                                // 87
            }                                                                                             // 88
                                                                                                          // 89
            var range = Blaze.materializeView(newItemView, eachView);                                     // 90
            eachView.domrange.addMember(range, index);                                                    // 91
          } else {                                                                                        // 92
            eachView.initialSubviews.splice(index, 0, newItemView);                                       // 93
          }                                                                                               // 94
        });                                                                                               // 95
      },                                                                                                  // 96
      removedAt: function (id, item, index) {                                                             // 97
        Deps.nonreactive(function () {                                                                    // 98
          eachView.numItems--;                                                                            // 99
          if (eachView.expandedValueDep) {                                                                // 100
            eachView.expandedValueDep.changed();                                                          // 101
          } else if (eachView.domrange) {                                                                 // 102
            eachView.domrange.removeMember(index);                                                        // 103
            if (eachView.elseFunc && eachView.numItems === 0) {                                           // 104
              eachView.inElseMode = true;                                                                 // 105
              eachView.domrange.addMember(                                                                // 106
                Blaze.materializeView(                                                                    // 107
                  Blaze.View('each_else',eachView.elseFunc),                                              // 108
                  eachView), 0);                                                                          // 109
            }                                                                                             // 110
          } else {                                                                                        // 111
            eachView.initialSubviews.splice(index, 1);                                                    // 112
          }                                                                                               // 113
        });                                                                                               // 114
      },                                                                                                  // 115
      changedAt: function (id, newItem, oldItem, index) {                                                 // 116
        Deps.nonreactive(function () {                                                                    // 117
          var itemView;                                                                                   // 118
          if (eachView.expandedValueDep) {                                                                // 119
            eachView.expandedValueDep.changed();                                                          // 120
          } else if (eachView.domrange) {                                                                 // 121
            itemView = eachView.domrange.getMember(index).view;                                           // 122
          } else {                                                                                        // 123
            itemView = eachView.initialSubviews[index];                                                   // 124
          }                                                                                               // 125
          itemView.dataVar.set(newItem);                                                                  // 126
        });                                                                                               // 127
      },                                                                                                  // 128
      movedTo: function (id, item, fromIndex, toIndex) {                                                  // 129
        Deps.nonreactive(function () {                                                                    // 130
          if (eachView.expandedValueDep) {                                                                // 131
            eachView.expandedValueDep.changed();                                                          // 132
          } else if (eachView.domrange) {                                                                 // 133
            eachView.domrange.moveMember(fromIndex, toIndex);                                             // 134
          } else {                                                                                        // 135
            var subviews = eachView.initialSubviews;                                                      // 136
            var itemView = subviews[fromIndex];                                                           // 137
            subviews.splice(fromIndex, 1);                                                                // 138
            subviews.splice(toIndex, 0, itemView);                                                        // 139
          }                                                                                               // 140
        });                                                                                               // 141
      }                                                                                                   // 142
    });                                                                                                   // 143
                                                                                                          // 144
    if (eachView.elseFunc && eachView.numItems === 0) {                                                   // 145
      eachView.inElseMode = true;                                                                         // 146
      eachView.initialSubviews[0] =                                                                       // 147
        Blaze.View('each_else', eachView.elseFunc);                                                       // 148
    }                                                                                                     // 149
  });                                                                                                     // 150
                                                                                                          // 151
  eachView.onDestroyed(function () {                                                                      // 152
    if (eachView.stopHandle)                                                                              // 153
      eachView.stopHandle.stop();                                                                         // 154
  });                                                                                                     // 155
                                                                                                          // 156
  return eachView;                                                                                        // 157
};                                                                                                        // 158
                                                                                                          // 159
Blaze.InOuterTemplateScope = function (templateView, contentFunc) {                                       // 160
  var view = Blaze.View('InOuterTemplateScope', contentFunc);                                             // 161
  var parentView = templateView.parentView;                                                               // 162
                                                                                                          // 163
  // Hack so that if you call `{{> foo bar}}` and it expands into                                         // 164
  // `{{#with bar}}{{> foo}}{{/with}}`, and then `foo` is a template                                      // 165
  // that inserts `{{> UI.contentBlock}}`, the data context for                                           // 166
  // `UI.contentBlock` is not `bar` but the one enclosing that.                                           // 167
  if (parentView.__isTemplateWith)                                                                        // 168
    parentView = parentView.parentView;                                                                   // 169
                                                                                                          // 170
  view.onCreated(function () {                                                                            // 171
    this.originalParentView = this.parentView;                                                            // 172
    this.parentView = parentView;                                                                         // 173
  });                                                                                                     // 174
  return view;                                                                                            // 175
};                                                                                                        // 176
                                                                                                          // 177
////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                        //
// packages\blaze\lookup.js                                                                               //
//                                                                                                        //
////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                          //
var bindIfIsFunction = function (x, target) {                                                             // 1
  if (typeof x !== 'function')                                                                            // 2
    return x;                                                                                             // 3
  return function () {                                                                                    // 4
    return x.apply(target, arguments);                                                                    // 5
  };                                                                                                      // 6
};                                                                                                        // 7
                                                                                                          // 8
var bindToCurrentDataIfIsFunction = function (x) {                                                        // 9
  if (typeof x === 'function') {                                                                          // 10
    return function () {                                                                                  // 11
      var data = Blaze.getCurrentData();                                                                  // 12
      if (data == null)                                                                                   // 13
        data = {};                                                                                        // 14
      return x.apply(data, arguments);                                                                    // 15
    };                                                                                                    // 16
  }                                                                                                       // 17
  return x;                                                                                               // 18
};                                                                                                        // 19
                                                                                                          // 20
var wrapHelper = function (f) {                                                                           // 21
  return Blaze.wrapCatchingExceptions(f, 'template helper');                                              // 22
};                                                                                                        // 23
                                                                                                          // 24
// Implements {{foo}} where `name` is "foo"                                                               // 25
// and `component` is the component the tag is found in                                                   // 26
// (the lexical "self," on which to look for methods).                                                    // 27
// If a function is found, it is bound to the object it                                                   // 28
// was found on.  Returns a function,                                                                     // 29
// non-function value, or null.                                                                           // 30
//                                                                                                        // 31
// NOTE: This function must not establish any reactive                                                    // 32
// dependencies.  If there is any reactivity in the                                                       // 33
// value, lookup should return a function.                                                                // 34
Blaze.View.prototype.lookup = function (name, _options) {                                                 // 35
  var template = this.template;                                                                           // 36
  var lookupTemplate = _options && _options.template;                                                     // 37
                                                                                                          // 38
  if (/^\./.test(name)) {                                                                                 // 39
    // starts with a dot. must be a series of dots which maps to an                                       // 40
    // ancestor of the appropriate height.                                                                // 41
    if (!/^(\.)+$/.test(name))                                                                            // 42
      throw new Error("id starting with dot must be a series of dots");                                   // 43
                                                                                                          // 44
    return Blaze._parentData(name.length - 1, true /*_functionWrapped*/);                                 // 45
                                                                                                          // 46
  } else if (template && (name in template)) {                                                            // 47
    return wrapHelper(bindToCurrentDataIfIsFunction(template[name]));                                     // 48
  } else if (lookupTemplate && Template.__lookup__(name)) {                                               // 49
    return Template.__lookup__(name);                                                                     // 50
  } else if (UI._globalHelpers[name]) {                                                                   // 51
    return wrapHelper(bindToCurrentDataIfIsFunction(UI._globalHelpers[name]));                            // 52
  } else {                                                                                                // 53
    return function () {                                                                                  // 54
      var isCalledAsFunction = (arguments.length > 0);                                                    // 55
      var data = Blaze.getCurrentData();                                                                  // 56
      if (lookupTemplate && ! (data && data[name])) {                                                     // 57
        throw new Error("No such template: " + name);                                                     // 58
      }                                                                                                   // 59
      if (isCalledAsFunction && ! (data && data[name])) {                                                 // 60
        throw new Error("No such function: " + name);                                                     // 61
      }                                                                                                   // 62
      if (! data)                                                                                         // 63
        return null;                                                                                      // 64
      var x = data[name];                                                                                 // 65
      if (typeof x !== 'function') {                                                                      // 66
        if (isCalledAsFunction) {                                                                         // 67
          throw new Error("Can't call non-function: " + x);                                               // 68
        }                                                                                                 // 69
        return x;                                                                                         // 70
      }                                                                                                   // 71
      return x.apply(data, arguments);                                                                    // 72
    };                                                                                                    // 73
  }                                                                                                       // 74
  return null;                                                                                            // 75
};                                                                                                        // 76
                                                                                                          // 77
// Implement Spacebars' {{../..}}.                                                                        // 78
// @param height {Number} The number of '..'s                                                             // 79
Blaze._parentData = function (height, _functionWrapped) {                                                 // 80
  var theWith = Blaze.getCurrentView('with');                                                             // 81
  for (var i = 0; (i < height) && theWith; i++) {                                                         // 82
    theWith = Blaze.getParentView(theWith, 'with');                                                       // 83
  }                                                                                                       // 84
                                                                                                          // 85
  if (! theWith)                                                                                          // 86
    return null;                                                                                          // 87
  if (_functionWrapped)                                                                                   // 88
    return function () { return theWith.dataVar.get(); };                                                 // 89
  return theWith.dataVar.get();                                                                           // 90
};                                                                                                        // 91
                                                                                                          // 92
                                                                                                          // 93
Blaze.View.prototype.lookupTemplate = function (name) {                                                   // 94
  return this.lookup(name, {template:true});                                                              // 95
};                                                                                                        // 96
                                                                                                          // 97
////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package.blaze = {
  Blaze: Blaze
};

})();

//# sourceMappingURL=e22f88e24055201b48b93258f0a0a8e7b8b3a415.map
