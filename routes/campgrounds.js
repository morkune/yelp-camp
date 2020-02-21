const express = require('express');
const router = express.Router();
const Campground = require('../models/campground')

// INDEX - show all campgrounds in the web
router.get('/', (req, res) => {
    Campground.find({}, (err, allCampgrounds) => {
        if (err) {
            console.log(err);
        } else {
            res.render('campgrounds/index', { campgrounds: allCampgrounds});
        }
    });
});

// CREATE - add new campground to DB
router.post('/',isLoggedIn, (req, res) => {
    // get data from form and add to campgrounds array
    const name = req.body.name;
    const image = req.body.image;
    const desc = req.body.description;
    const author ={
        id: req.user._id,
        username: req.user.username
    }
    const newCampground = { name: name, image: image, description: desc, author: author }
    // Create a new campground and save it to DB
    Campground.create(newCampground, (err, newlyCreated) => {
        if (err) {
            console.log(err);
        } else {
            //redirect back to campground page
            res.redirect('/campgrounds');
        }
    });
});

// NEW- show form to create new campground
router.get('/new',isLoggedIn, (req, res) => {
    res.render('campgrounds/new.ejs');
});

// SHOW - shows more info about the camp
router.get('/:id', (req, res) => {
    // find the campground with provided id
    Campground.findById(req.params.id).populate('comments').exec((err, foundCampground) => {
        if (err) {
            console.log(err);
        } else {
            // render show template with that campground
            res.render('campgrounds/show', { campground: foundCampground });
        }
    });
});

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

module.exports = router;