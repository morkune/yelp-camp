const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/user');

// root route
router.get('/', (req, res) => {
    res.render('landing');
});

// Auth routes

// show register form
router.get('/register', (req, res) => {
    res.render('register');
});
// handle sign up login
router.post('/register', (req, res) => {
    const newUser = new User({ username: req.body.username });
    User.register(newUser, req.body.password, (err, user) => {
        if (err) {
            console.log(err)
            return res.render('register',{error: err.message});
        }
        passport.authenticate('local')(req, res, () => {
            req.flash('success', 'Successfully Signed Up! Nice to meet you ' + req.body.username);
            res.redirect('/campgrounds');
        });
    });
});

// show login form
router.get('/login', (req, res) => {
    res.render('login');
});

// login route responsible for handling login logic
router.post('/login', passport.authenticate('local',
    {
        successRedirect: '/campgrounds',
        failureRedirect: '/login'
    }), (req, res) => {
    });

// logout route
router.get('/logout', (req, res) => {
    req.logout();
    req.flash('success', 'Logged you out!')
    res.redirect('/campgrounds');
});

module.exports = router;
