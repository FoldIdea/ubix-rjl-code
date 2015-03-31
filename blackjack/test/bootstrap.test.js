var Sails = require('sails');
var _ = require('lodash');

// Global before hook
before(function (done) {
    // Lift Sails with test database
    Sails.lift({
        port: 13377,
        log: {
            level: 'info'
        },
        models: {
            connection: 'test',
            migrate: 'drop'
        }
    }, function (err, sails) {
        if (err) return done(err);
        done(err, sails);
    });
});

// Global after hook
after(function (done) {
    console.log(); // Skip a line before displaying Sails lowering logs
    sails.lower(done);
});
