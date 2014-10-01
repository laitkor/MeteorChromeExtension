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
var UI = Package.ui.UI;
var Handlebars = Package.ui.Handlebars;
var HTML = Package.htmljs.HTML;
var Blaze = Package.blaze.Blaze;

/* Package-scope variables */
var Template;

(function () {

/////////////////////////////////////////////////////////////////////////////////////
//                                                                                 //
// packages\templating\templating.js                                               //
//                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////
                                                                                   //
// Create an empty template object. Packages and apps add templates on             // 1
// to this object.                                                                 // 2
Template = {};                                                                     // 3
                                                                                   // 4
// `Template` is not a function so this is not a real function prototype,          // 5
// but it is used as the prototype of all `Template.foo` objects.                  // 6
// Naming a template "prototype" will cause an error.                              // 7
Template.prototype = (function () {                                                // 8
  // IE 8 exposes function names in the enclosing scope, so                        // 9
  // use this IIFE to catch it.                                                    // 10
  return (function Template() {}).prototype;                                       // 11
})();                                                                              // 12
                                                                                   // 13
Template.prototype.helpers = function (dict) {                                     // 14
  for (var k in dict)                                                              // 15
    this[k] = dict[k];                                                             // 16
};                                                                                 // 17
                                                                                   // 18
Template.__updateTemplateInstance = function (view) {                              // 19
  // Populate `view.templateInstance.{firstNode,lastNode,data}`                    // 20
  // on demand.                                                                    // 21
  var tmpl = view._templateInstance;                                               // 22
  if (! tmpl) {                                                                    // 23
    tmpl = view._templateInstance = {                                              // 24
      $: function (selector) {                                                     // 25
        if (! view.domrange)                                                       // 26
          throw new Error("Can't use $ on component with no DOM");                 // 27
        return view.domrange.$(selector);                                          // 28
      },                                                                           // 29
      findAll: function (selector) {                                               // 30
        return Array.prototype.slice.call(this.$(selector));                       // 31
      },                                                                           // 32
      find: function (selector) {                                                  // 33
        var result = this.$(selector);                                             // 34
        return result[0] || null;                                                  // 35
      },                                                                           // 36
      data: null,                                                                  // 37
      firstNode: null,                                                             // 38
      lastNode: null,                                                              // 39
      autorun: function (f) {                                                      // 40
        return view.autorun(f);                                                    // 41
      },                                                                           // 42
      __view__: view                                                               // 43
    };                                                                             // 44
  }                                                                                // 45
                                                                                   // 46
  tmpl.data = Blaze.getViewData(view);                                             // 47
                                                                                   // 48
  if (view.domrange && !view.isDestroyed) {                                        // 49
    tmpl.firstNode = view.domrange.firstNode();                                    // 50
    tmpl.lastNode = view.domrange.lastNode();                                      // 51
  } else {                                                                         // 52
    // on 'created' or 'destroyed' callbacks we don't have a DomRange              // 53
    tmpl.firstNode = null;                                                         // 54
    tmpl.lastNode = null;                                                          // 55
  }                                                                                // 56
                                                                                   // 57
  return tmpl;                                                                     // 58
};                                                                                 // 59
                                                                                   // 60
UI._templateInstance = function () {                                               // 61
  var templateView = Blaze.getCurrentTemplateView();                               // 62
  if (! templateView)                                                              // 63
    throw new Error("No current template");                                        // 64
                                                                                   // 65
  return Template.__updateTemplateInstance(templateView);                          // 66
};                                                                                 // 67
                                                                                   // 68
Template.prototype.events = function (eventMap) {                                  // 69
  var template = this;                                                             // 70
  template.__eventMaps = (template.__eventMaps || []);                             // 71
  var eventMap2 = {};                                                              // 72
  for (var k in eventMap) {                                                        // 73
    eventMap2[k] = (function (k, v) {                                              // 74
      return function (event/*, ...*/) {                                           // 75
        var view = this; // passed by EventAugmenter                               // 76
        var data = Blaze.getElementData(event.currentTarget);                      // 77
        if (data == null)                                                          // 78
          data = {};                                                               // 79
        var args = Array.prototype.slice.call(arguments);                          // 80
        var tmplInstance = Template.__updateTemplateInstance(view);                // 81
        args.splice(1, 0, tmplInstance);                                           // 82
        return v.apply(data, args);                                                // 83
      };                                                                           // 84
    })(k, eventMap[k]);                                                            // 85
  }                                                                                // 86
                                                                                   // 87
  template.__eventMaps.push(eventMap2);                                            // 88
};                                                                                 // 89
                                                                                   // 90
Template.prototype.__makeView = function (contentFunc, elseFunc) {                 // 91
  var template = this;                                                             // 92
  var view = Blaze.View(this.__viewName, this.__render);                           // 93
  view.template = template;                                                        // 94
                                                                                   // 95
  view.templateContentBlock = (                                                    // 96
    contentFunc ? Template.__create__('(contentBlock)', contentFunc) : null);      // 97
  view.templateElseBlock = (                                                       // 98
    elseFunc ? Template.__create__('(elseBlock)', elseFunc) : null);               // 99
                                                                                   // 100
  if (template.__eventMaps ||                                                      // 101
      typeof template.events === 'object') {                                       // 102
    view.onMaterialized(function () {                                              // 103
      if (! template.__eventMaps &&                                                // 104
          typeof template.events === "object") {                                   // 105
        // Provide limited back-compat support for `.events = {...}`               // 106
        // syntax.  Pass `template.events` to the original `.events(...)`          // 107
        // function.  This code must run only once per template, in                // 108
        // order to not bind the handlers more than once, which is                 // 109
        // ensured by the fact that we only do this when `__eventMaps`             // 110
        // is falsy, and we cause it to be set now.                                // 111
        Template.prototype.events.call(template, template.events);                 // 112
      }                                                                            // 113
                                                                                   // 114
      _.each(template.__eventMaps, function (m) {                                  // 115
        Blaze._addEventMap(view, m, view);                                         // 116
      });                                                                          // 117
    });                                                                            // 118
  }                                                                                // 119
                                                                                   // 120
  if (template.__initView)                                                         // 121
    template.__initView(view);                                                     // 122
                                                                                   // 123
  if (template.created) {                                                          // 124
    view.onCreated(function () {                                                   // 125
      var inst = Template.__updateTemplateInstance(view);                          // 126
      template.created.call(inst);                                                 // 127
    });                                                                            // 128
  }                                                                                // 129
                                                                                   // 130
  if (template.rendered) {                                                         // 131
    view.onRendered(function () {                                                  // 132
      var inst = Template.__updateTemplateInstance(view);                          // 133
      template.rendered.call(inst);                                                // 134
    });                                                                            // 135
  }                                                                                // 136
                                                                                   // 137
  if (template.destroyed) {                                                        // 138
    view.onDestroyed(function () {                                                 // 139
      var inst = Template.__updateTemplateInstance(view);                          // 140
      template.destroyed.call(inst);                                               // 141
    });                                                                            // 142
  }                                                                                // 143
                                                                                   // 144
  return view;                                                                     // 145
};                                                                                 // 146
                                                                                   // 147
var _hasOwnProperty = Object.prototype.hasOwnProperty;                             // 148
                                                                                   // 149
Template.__lookup__ = function (templateName) {                                    // 150
  if (! _hasOwnProperty.call(Template, templateName))                              // 151
    return null;                                                                   // 152
  var tmpl = Template[templateName];                                               // 153
  if (Template.__isTemplate__(tmpl))                                               // 154
    return tmpl;                                                                   // 155
  return null;                                                                     // 156
};                                                                                 // 157
                                                                                   // 158
Template.__create__ = function (viewName, templateFunc, initView) {                // 159
  var tmpl = new Template.prototype.constructor;                                   // 160
  tmpl.__viewName = viewName;                                                      // 161
  tmpl.__render = templateFunc;                                                    // 162
  if (initView)                                                                    // 163
    tmpl.__initView = initView;                                                    // 164
                                                                                   // 165
  return tmpl;                                                                     // 166
};                                                                                 // 167
                                                                                   // 168
Template.__define__ = function (templateName, templateFunc) {                      // 169
  if (_hasOwnProperty.call(Template, templateName)) {                              // 170
    if (Template[templateName].__makeView)                                         // 171
      throw new Error("There are multiple templates named '" + templateName + "'. Each template needs a unique name.");
    throw new Error("This template name is reserved: " + templateName);            // 173
  }                                                                                // 174
                                                                                   // 175
  var tmpl = Template.__create__('Template.' + templateName, templateFunc);        // 176
  tmpl.__templateName = templateName;                                              // 177
                                                                                   // 178
  Template[templateName] = tmpl;                                                   // 179
  return tmpl;                                                                     // 180
};                                                                                 // 181
                                                                                   // 182
Template.__isTemplate__ = function (x) {                                           // 183
  return x && x.__makeView;                                                        // 184
};                                                                                 // 185
                                                                                   // 186
// Define a template `Template.__body__` that renders its                          // 187
// `__contentParts`.                                                               // 188
Template.__define__('__body__', function () {                                      // 189
  var parts = Template.__body__.__contentParts;                                    // 190
  // enable lookup by setting `view.template`                                      // 191
  for (var i = 0; i < parts.length; i++)                                           // 192
    parts[i].template = Template.__body__;                                         // 193
  return parts;                                                                    // 194
});                                                                                // 195
Template.__body__.__contentParts = []; // array of Blaze.Views                     // 196
                                                                                   // 197
// Define `Template.__body__.__instantiate()` as a function that                   // 198
// renders `Template.__body__` into `document.body`, at most once                  // 199
// (calling it a second time does nothing).  This function does                    // 200
// not use `this`, so you can safely call:                                         // 201
// `Meteor.startup(Template.__body__.__instantiate)`.                              // 202
Template.__body__.__isInstantiated = false;                                        // 203
var instantiateBody = function () {                                                // 204
  if (Template.__body__.__isInstantiated)                                          // 205
    return;                                                                        // 206
  Template.__body__.__isInstantiated = true;                                       // 207
  var range = Blaze.render(Template.__body__);                                     // 208
  Template.__body__.__view = range.view;                                           // 209
  range.attach(document.body);                                                     // 210
};                                                                                 // 211
Template.__body__.__instantiate = instantiateBody;                                 // 212
                                                                                   // 213
                                                                                   // 214
// Renders a template (eg `Template.foo`), returning a DOMRange. The               // 215
// range will keep updating reactively.                                            // 216
UI.render = function (tmpl) {                                                      // 217
  if (! Template.__isTemplate__(tmpl))                                             // 218
    throw new Error("Template required here");                                     // 219
                                                                                   // 220
  return Blaze.render(tmpl);                                                       // 221
};                                                                                 // 222
                                                                                   // 223
// Same as `UI.render` with a data context passed in.                              // 224
UI.renderWithData = function (tmpl, data) {                                        // 225
  if (! Template.__isTemplate__(tmpl))                                             // 226
    throw new Error("Template required here");                                     // 227
  if (typeof data === 'function')                                                  // 228
    throw new Error("Data argument can't be a function"); // XXX or can it?        // 229
                                                                                   // 230
  return Blaze.render(Blaze.With(data, function () {                               // 231
    return tmpl;                                                                   // 232
  }));                                                                             // 233
};                                                                                 // 234
                                                                                   // 235
// The publicly documented API for inserting a DOMRange returned from              // 236
// `UI.render` or `UI.renderWithData` into the DOM. If you then remove             // 237
// `parentElement` using jQuery, all reactive updates on the rendered              // 238
// template will stop.                                                             // 239
UI.insert = function (range, parentElement, nextNode) {                            // 240
  // parentElement must be a DOM node. in particular, can't be the                 // 241
  // result of a call to `$`. Can't check if `parentElement instanceof             // 242
  // Node` since 'Node' is undefined in IE8.                                       // 243
  if (! parentElement || typeof parentElement.nodeType !== 'number')               // 244
    throw new Error("'parentElement' must be a DOM node");                         // 245
  if (nextNode && typeof nextNode.nodeType !== 'number') // 'nextNode' is optional // 246
    throw new Error("'nextNode' must be a DOM node");                              // 247
  if (! range instanceof Blaze.DOMRange)                                           // 248
    throw new Error("Expected template rendered with UI.render");                  // 249
                                                                                   // 250
  range.attach(parentElement, nextNode);                                           // 251
};                                                                                 // 252
                                                                                   // 253
// XXX test and document                                                           // 254
UI.remove = function (range) {                                                     // 255
  if (! range instanceof Blaze.DOMRange)                                           // 256
    throw new Error("Expected template rendered with UI.render");                  // 257
                                                                                   // 258
  if (range.attached)                                                              // 259
    range.detach();                                                                // 260
  range.destroy();                                                                 // 261
};                                                                                 // 262
                                                                                   // 263
UI.body = Template.__body__;                                                       // 264
                                                                                   // 265
/////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package.templating = {
  Template: Template
};

})();

//# sourceMappingURL=dfcfc10b55e1421997389f9c7a24ebad7a3ace6f.map
