module.exports = app => {
    app.use("/api/login", require('./login'));
    app.use("/api/signup", require('./signup'));
    app.use("/api/contactus", require('./contactus'));
    app.use("/api/userfeedback", require('./userfeedback'));
    app.use("/api/appointments", require('./appointment'));
<<<<<<< HEAD
    app.use("/api/predict", require('./prediction'));
=======
    app.use("/api/fooddata", require('./fooddata'));
>>>>>>> upstream/master
};