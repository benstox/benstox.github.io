// generate new melodies using Markov chains

var load_melody_data = function(data, order) {
    // Process all the data provided for Markov chaining.
    // Yields initials, full chains and finals.
    var initials = _.map(
        _.values(data),
        function(melody) {return(melody.substring(0, order));
    });

    var chains = _.reduce(
        _.map(_.values(data), function(melody) {
            return(
                _.reduce(
                    _.split(melody, ""),
                    function(acc, value, index, coll) {
                        if (index < coll.length - order) {
                            var key = _.join(coll.slice(0 + index, order + index), "");
                            if (acc[key]) {
                                acc[key].push(coll[order + index]);
                            } else {
                                acc[key] = [coll[order + index]];
                            };
                        };
                        return(acc);
                    },
                    {}
                )
            );
        }),
        function(acc, value) {
            _.forEach(value, function(next_values, key, coll) {
                if (acc[key]) {
                    acc[key].concat(next_values);
                } else {
                    acc[key] = next_values;
                };
            });
            return(acc);
        }
    );

    var finals = _.uniq(
        _.map(
            _.values(data),
            function(melody) {return(melody.substring(melody.length - order));}
        )
    );

    return({
        initials: initials,
        chains: chains,
        finals: finals,
    });
};

var generate_markov = function(data, order, min_length) {
    min_length = min_length || 30;
    if (data["initials"] && data["chains"] && data["finals"]) {
        var processed = data;
    } else {
        var processed = load_melody_data(data, order);
    };
    var s = randChoice(processed.initials);
    while (s.length < min_length || !(_.some(processed.finals, function(final) {return(_.endsWith(s, final));}))) {
        if (processed.chains[s.substring(s.length - order)]) {
            s = s + randChoice(processed.chains[s.substring(s.length - order)]);
        } else {
            s = s + randChoice(processed.initials);
        };
    };
    return(s);
};

var process_markov_score = function(score) {
    // add durations to the score provided by the Markov chains
    var with_durations = _.reduce(_.split(score, ""), function(acc, value, index, coll) {
        if (value == "." || value == "_") {
            return(acc);
        } else {
            var duration_variation = 15;
            var velocity_variation = 25;
            if (coll[index-1] == "." && coll[index+1] == ".") {
                var duration = 800;
            } else if (coll[index-1] == "_" && coll[index+1] == ".") {
                var duration = 750;
            } else if (coll[index-1] == "_" && coll[index+1] == "_") {
                var duration = 700;
            } else if (coll[index+1] == ".") {
                var duration = 600;
            } else if (coll[index+1] == "_") {
                var duration = 525;
            } else {
                var duration = 300;
            };
            duration = duration + _.random(-duration_variation, duration_variation);
            duration = duration * melody_speed;
            var velocity = 75 + _.random(-velocity_variation, velocity_variation);
            acc.push({
                shorthand : (value == "!" ? "ix" : value),
                duration  : duration,
                velocity  : velocity
            });
        };
        return(acc);
    }, []);
    return(with_durations);
};
