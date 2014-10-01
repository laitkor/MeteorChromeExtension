(function(){
Template.__body__.__contentParts.push(Blaze.View('body_content_'+Template.__body__.__contentParts.length, (function() {
  var view = this;
  return HTML.DIV({
    "class": "container",
    style: "margin:20px;"
  }, "\n        ", Spacebars.include(view.lookupTemplate("input")), HTML.Raw("\n        <br>\n        "), Spacebars.include(view.lookupTemplate("messages")), "\n    ");
})));
Meteor.startup(Template.__body__.__instantiate);

Template.__define__("hello", (function() {
  var view = this;
  return [ HTML.Raw("<h1>Hello World!</h1>\n    "), Blaze.View(function() {
    return Spacebars.mustache(view.lookup("greeting"));
  }), HTML.Raw('\n    <input type="button" value="Click">') ];
}));

Template.__define__("messages", (function() {
  var view = this;
  return [ HTML.Raw("<h3>Message List</h3>\n    "), HTML.TABLE({
    "class": "table table-striped"
  }, "\n        ", HTML.TR("\n            ", HTML.TH("Name"), "\n            ", HTML.TH("Message"), "\n        "), "\n        ", Blaze.Each(function() {
    return Spacebars.call(view.lookup("messages"));
  }, function() {
    return [ "\n        ", HTML.TR("\n            ", HTML.TD(" ", Blaze.View(function() {
      return Spacebars.mustache(view.lookup("name"));
    }), " "), "\n            ", HTML.TD(" ", Blaze.View(function() {
      return Spacebars.mustache(view.lookup("message"));
    })), "\n        "), "\n        " ];
  }), "\n    ") ];
}));

Template.__define__("input", (function() {
  var view = this;
  return HTML.Raw('<div class="row">\n        <div class="col-md-3"></div>\n        <div class="col-md-2">\n            New Message\n        </div>\n        <div class="col-md-2">\n            <input type="text" id="Message" class="form-control">\n        </div>\n        <div class="col-md-2">\n            <input type="button" id="BtnPostMessage" value="Send Message" class="btn btn-primary">\n        </div>\n        <div class="col-md-3"></div>\n    </div>');
}));

})();
