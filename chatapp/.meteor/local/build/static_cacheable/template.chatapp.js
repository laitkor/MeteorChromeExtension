(function(){ Meteor.startup(function(){document.body.appendChild(Spark.render(Meteor._def_template(null,Handlebars.json_ast_to_func(["<div class=\"container\" style=\"margin:20px;\">\r\n        ",[">","input"],"\r\n        <br />\r\n        ",[">","messages"],"\r\n    </div>"]))));});Meteor._def_template("hello",Handlebars.json_ast_to_func(["<h1>Hello World!</h1>\r\n    ",["{",[[0,"greeting"]]],"\r\n    <input type=\"button\" value=\"Click\" />"]));
Meteor._def_template("messages",Handlebars.json_ast_to_func(["<h3>Message List</h3>\r\n    <table class=\"table table-striped\">\r\n        <tr>\r\n            <th>Name</th>\r\n            <th>Message</th>\r\n        </tr>\r\n        ",["#",[[0,"each"],[0,"messages"]],["\r\n        <tr>\r\n            <td> ",["{",[[0,"name"]]]," </td>\r\n            <td> ",["{",[[0,"message"]]],"</td>\r\n        </tr>\r\n        "]],"\r\n    </table>"]));
Meteor._def_template("input",Handlebars.json_ast_to_func(["<div class=\"row\">\r\n        <div class=\"col-md-3\"></div>\r\n        <div class=\"col-md-2\">\r\n            New Message\r\n        </div>\r\n        <div class=\"col-md-2\">\r\n            <input type=\"text\" id=\"Message\" class=\"form-control\" />\r\n        </div>\r\n        <div class=\"col-md-2\">\r\n            <input type=\"button\" id=\"BtnPostMessage\" value=\"Send Message\" class=\"btn btn-primary\" />\r\n        </div>\r\n        <div class=\"col-md-3\"></div>\r\n    </div>"]));

}).call(this);