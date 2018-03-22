// ------------------- RANDOM NUMBERS -------------------

// get a random integer
// randInt(1) can only return 0
// randInt(2) can return 0 or 1
var randInt = function(number1, number2) {
    number2 = number2 || 0;
    if (number1 == number2) {
        return number1;
    } else if (number1 > number2) {
        var great = number1;
        var less = number2;
    } else {
        var great = number2;
        var less = number1;
    };
    var diff = great - less;
    // return less + Math.floor(ROT.RNG.getUniform() * diff);
    return less + Math.floor(Math.random() * diff); // DEBUG
};

var randChoice = function(choice_list) {
    var index = randInt(choice_list.length);
    return( choice_list[index] );
};

var rangeMap = function(x, a1, a2, b1, b2) {
    return ((x - a1)/(a2-a1)) * (b2 - b1) + b1;
};

var frequencyFromNoteNumber = function(note) {
    return 440 * Math.pow(2,(note-69)/12);
};

var logger = function(container, label, data) {
    messages = label + " [channel: " + (data[0] & 0xf) + ", cmd: " + (data[0] >> 4) + ", type: " + (data[0] & 0xf0) + " , note: " + data[1] + " , velocity: " + data[2] + "]";
    container.textContent = messages;
};
