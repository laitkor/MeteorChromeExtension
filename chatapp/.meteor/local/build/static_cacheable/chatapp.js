(function(){ if (Meteor.isClient) {

    Template.messages.messages = function () {
        return Messages.find({}, { sort: { time: 1 } });
    };

    Template.input.events = {
        'click input#BtnPostMessage': function (event) {
            console.log('Btn Click Fired');
            var name = "Guest";
            var message = document.getElementById('Message');
            if (message.value != '') {
                Messages.insert({
                    name: name,
                    message: message.value,
                    time : Date.now()
                });
            }
            document.getElementById('Message').valueOf = '';
            message.valueOf = '';
        }
    };


    Template.hello.greeting = function () {
        return "Welcome to chatapp.";
    };

    Template.hello.events({
        'click input': function () {
            // template data, if any, is available in 'this'
            if (typeof console !== 'undefined')
                console.log("You pressed the button");
        }
    });
}

if (Meteor.isServer) {
    Meteor.startup(function () {
        // code to run on server at startup
    });
}

}).call(this);
