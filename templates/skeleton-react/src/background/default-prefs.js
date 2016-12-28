
weh.prefs.declare([{
    name: "myparam_string",
    type: "string",
    defaultValue: "Default value",
    maxLength: 15,
    regexp: "^[a-zA-Z ]+$"
},{
    name: "myparam_integer",
    type: "integer",
    defaultValue: 42,
    minimum: -10,
    maximum: 100
},{
    name: "myparam_float",
    type: "float",
    defaultValue: 3.14159,
    minimum: 1.5,
    maximum: 10.8
},{
    name: "myparam_boolean",
    type: "boolean",
    defaultValue: true
},{
    name: "myparam_choice",
    type: "choice",
    defaultValue: "second",
    choices: [{
        name: "First choice",
        value: "first"
    },{
        name: "Second choice",
        value: "second"
    },{
        name: "Third choice",
        value: "third"
    }]
}]);
