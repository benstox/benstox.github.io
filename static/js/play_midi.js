// https://www.keithmcmillen.com/blog/making-music-in-the-browser-web-midi-api/

// variables from the tutorial
var log = console.log.bind(console);
var keyData = $('#key_data');
var deviceInfoInputs = $('#inputs');
var deviceInfoOutputs = $('#outputs');
var midi;
var AudioContext = AudioContext || webkitAudioContext; // for ios/safari
var context = new AudioContext();
var activeNotes = [];
var btnBox = $('#content');
var btn = $('.button');
var data;
var cmd;
var channel;
var type;
var note;
var velocity;

var melody_timeouts = [];
var melody_speed = 1.1;
var NOTES = {
    z: {name: "G3"},
    a: {name: "A3"},
    B: {name: "Bb3"},
    b: {name: "B3"},
    c: {name: "C4"},
    D: {name: "Db4"},
    d: {name: "D4"},
    E: {name: "Eb4"},
    e: {name: "E4"},
    f: {name: "F4"},
    G: {name: "Gb4"},
    g: {name: "G4"},
    H: {name: "Ab4"},
    h: {name: "A4"},
    I: {name: "Bb4"},
    i: {name: "B4"},
    j: {name: "C5"},
    K: {name: "Db5"},
    k: {name: "D5"},
    l: {name: "E5"},
    m: {name: "F5"},
    n: {name: "G5"},
    o: {name: "A5"},
    p: {name: "B5"},
};

// user interaction --------------------------------------------------------------
var turnButtonOff = function(button) {
    button.data("pressed", "up");
    button.text("&#9658;"); // play symbol (triangle)
    button.removeClass("btn-light");
    button.addClass("btn-dark");
};

var turnButtonOn = function(button) {
    button.data("pressed", "down");
    button.text("&#9608;"); // stop symbol (square)
    button.removeClass("btn-dark");
    button.addClass("btn-light");
};

var getSetting = function(settingType) {
    // get settings, e.g. instrument or Markov order
    var alreadyPressed = _.filter($("#" + settingType + " button"), function(x) {if ($.data(x)["pressed"] == "down") {return(x)}});
    if (alreadyPressed.length != 0) {
        var settingButton = $(alreadyPressed[0]);
    } else {
        var settingButton = $($("#" + settingType + " button")[0])
        turnButtonOn(settingButton);
    };
    var setting = settingButton.data(settingType);
    return(setting);
};

var setUpInstrument = function(instrument) {
    window.notes = _.mapValues(
        NOTES,
        function(v) {
            return(_.set(v, "source", "static/audio/" + instrument + "/" + v.name + ".mp3"));
        }
    );
    // prepare audio files
    _.forEach(window.notes, addAudioProperties);
};

var clickPlayButton = function(e) {
    var button = $(this);
    var pressed = button.data("pressed");
    var buttonText = button.text();
    if (pressed == "down") {
        turnButtonOff(button);
        stop_music();
    } else if (pressed == "up") {
        // first turn off the ones already on
        var alreadyPressed = _.filter($("button.play-button"), function(x) {if ($.data(x)["pressed"] == "down") {return(x)}});
        _.forEach(alreadyPressed, function(playingButton) {
            playingButton = $(playingButton);
            turnButtonOff(playingButton);
        });
        stop_music();
        // then play this button
        turnButtonOn(button);
        var instrument = getSetting("instrument");
        setUpInstrument(instrument);
        var mode_selected = button.data("mode");
        var markov_order = getSetting("order");
        console.log("Mode: " + mode_selected + "; Order: " + markov_order);
        var processed_melodies = load_melody_data(MODES[mode_selected], markov_order);
        play_markov_melody(processed_melodies);
    } else {
        alert("The button had a playing state that was neither down nor up!!");
    };
};

var clickRadioButton = function(settingType) {
    // click a settings radio button, e.g. for an instrument or Markov order
    var button = $(this);
    var pressed = button.data("pressed");
    if (pressed == "down") {
        turnButtonOff(button);
    } else if (pressed == "up") {
        // first turn off the ones already on
        var alreadyPressed = _.filter($("#" + settingType + " button"), function(x) {if ($.data(x)["pressed"] == "down") {return(x)}});
        _.forEach(alreadyPressed, function(pressedButton) {
            pressedButton = $(pressedButton);
            turnButtonOff(pressedButton);
        });
        // then turn this one on
        turnButtonOn(button);
    } else {
        alert("The button had a state that was neither down nor up!!");
    };
};

// midi functions --------------------------------------------------------------
var onMIDISuccess = function(midiAccess) {
    midi = midiAccess;
    var inputs = midi.inputs.values();
    // loop through all inputs
    for(var input = inputs.next(); input && !input.done; input = inputs.next()){
        // listen for midi messages
        input.value.onmidimessage = onMIDIMessage;

        listInputs(input);
    }
    // listen for connect/disconnect message
    midi.onstatechange = onStateChange;

    showMIDIPorts(midi);
};

var onMIDIMessage = function(event) {
    data = event.data,
    cmd = data[0] >> 4,
    channel = data[0] & 0xf,
    type = data[0] & 0xf0, // channel agnostic message type. Thanks, Phil Burk.
    note = data[1],
    velocity = data[2];
    // with pressure and tilt off
    // note off: 128, cmd: 8 
    // note on: 144, cmd: 9
    // pressure / tilt on
    // pressure: 176, cmd 11: 
    // bend: 224, cmd: 14
    log('MIDI data', data);
    switch(type) {
        case 144: // noteOn message 
            noteOn(note, velocity);
            break;
        case 128: // noteOff message 
            noteOff(note, velocity);
            break;
    };
    
    //log('data', data, 'cmd', cmd, 'channel', channel);
    logger(keyData, 'key data', data);
};

var onStateChange = function(event) {
    showMIDIPorts(midi);
    var port = event.port, state = port.state, name = port.name, type = port.type;
    if(type == "input"){
            log("name", name, "port", port, "state", state);}
};

var listInputs = function(inputs) {
    var input = inputs.value;
        log("Input port : [ type:'" + input.type + "' id: '" + input.id + 
                "' manufacturer: '" + input.manufacturer + "' name: '" + input.name + 
                "' version: '" + input.version + "']");
};

var noteOn = function(midiNote, velocity) {
    player(midiNote, velocity);
};

var noteOff = function(midiNote, velocity) {
    player(midiNote, velocity);
};

var player = function(note, velocity) {
    var sample = sampleMap['key'+note];
    if(sample) {
        if(type == (0x80 & 0xf0) || velocity == 0) { // needs to be fixed for QuNexus, which always returns 144
            btn[sample - 1].classList.remove('active');
            return;
        };
        btn[sample - 1].classList.add('active');
        btn[sample - 1].play(velocity);
    };
};

var onMIDIFailure = function(e) {
    log("No access to MIDI devices or your browser doesn't support WebMIDI API. Please use WebMIDIAPIShim " + e);
};

// MIDI utility functions --------------------------------------------------------------
var showMIDIPorts = function(midiAccess) {
    var inputs = midiAccess.inputs,
            outputs = midiAccess.outputs, 
            html;
    html = '<h4>MIDI Inputs:</h4><div class="info">';
    inputs.forEach(function(port){
        html += '<p>' + port.name + '<p>';
        html += '<p class="small">connection: ' + port.connection + '</p>';
        html += '<p class="small">state: ' + port.state + '</p>';
        html += '<p class="small">manufacturer: ' + port.manufacturer + '</p>';
        if(port.version){
            html += '<p class="small">version: ' + port.version + '</p>';
        }
    });
    deviceInfoInputs.innerHTML = html + '</div>';

    html = '<h4>MIDI Outputs:</h4><div class="info">';
    outputs.forEach(function(port){
        html += '<p>' + port.name + '<br>';
        html += '<p class="small">manufacturer: ' + port.manufacturer + '</p>';
        if(port.version){
            html += '<p class="small">version: ' + port.version + '</p>';
        }
    });
    deviceInfoOutputs.innerHTML = html + '</div>';
};

// audio functions --------------------------------------------------------------
var loadAudio = function(object, url) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';
    request.onload = function(){
        context.decodeAudioData(request.response, function(buffer){
            object.buffer = buffer;
        });
    }
    request.send();
};

var addAudioProperties = function(object) {
    loadAudio(object, object.source);
    object.play = function(volume) {
        var s = context.createBufferSource();
        var g = context.createGain();
        var v;
        s.buffer = object.buffer;
        // s.playbackRate.value = randomRange(0.5, 2); // random pitch
        s.playbackRate.value = 1;
        if (volume) {
            v = rangeMap(volume, 1, 127, 0.2, 2);
            s.connect(g);
            g.gain.value = v * v;
            g.connect(context.destination);
        } else {
            s.connect(context.destination); 
        };
        
        s.start();
        object.s = s;
    };

    object.stop = function() {
        if(object.s) {
            object.s.stop();
        };
    };
};

var play_markov_melody = function(processed_melodies) {
    // get a Markov melody!
    
    var score = generate_markov(processed_melodies);
    // $("#print-melody").text(score);

    // turn the Markov score into a list of notes and durations
    var melody = process_markov_score(score);

    // work out the temporal position of each note in the melody
    // based on cummulative durations
    melody = _.reduce(
        melody,
        function (acc, n) {
            acc.push(
                _.set(n, "position", (acc.length > 0 ? acc[acc.length-1].position + acc[acc.length-1].duration : 0)));
            return(acc);
        }, []);

    // play the melody!!
    var start_time = new Date().getTime();
    var melody_loop = function(i) {
        if (melody[i]) {
            // get the current note from the melody
            var note_to_play = melody[i];
            // play the note!
            window.notes[note_to_play.shorthand].play(note_to_play.velocity);
            // recur, compensating for lag
            var diff = (new Date().getTime() - start_time) -  note_to_play.position;
            melody_timeouts.push(setTimeout(
                function() {melody_loop(i+1);},
                note_to_play.duration - diff
            ));
        } else {
            // melody over
            // recur the whole play_markov_melody thing
            melody_timeouts.push(setTimeout(
                function() {play_markov_melody(processed_melodies);},
                2000 * melody_speed
            ));
        };
    };
    // start the loop detailed above
    melody_loop(0);
};

var stop_music = function() {
    _.forEach(window.notes, function(note) {
        note.stop();
    });
    _.forEach(melody_timeouts, function(timeout_id) {
        clearTimeout(timeout_id);
    });
    melody_timeouts = [];
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

// add event listeners
$(document).ready(function() {
    // request MIDI access
    if(navigator.requestMIDIAccess){
        navigator.requestMIDIAccess({sysex: false}).then(onMIDISuccess, onMIDIFailure);
    }
    else {
        alert("No MIDI support in your browser.");
    }

    // print markov order
    // $("#print-markov-order").text(markov_order)

    $("button.play-button").click(clickPlayButton);
    $("#instrument button").click(
        function() {clickRadioButton("#instrument")}
    );
    $("#markov-order button").click(
        function() {clickRadioButton("#markov-order")}
    );
});
