const express = require('express');
const middleware = require('../middleware');
const passport = require('passport');
const router = express.Router();
const Campground = require('../models/campground');

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

router.get('/campgrounds', (req, res) => {
  let dbFilter = {};
  if (req.query.search) {
    const regex = new RegExp(escapeRegex(req.query.search), 'gi');
    dbFilter = { name: regex };
  }

  // Get all campgrounds from DB
  Campground.find(dbFilter).exec((err, allCampgrounds) => {
    res.json(allCampgrounds); // Return campgrounds as JSON
  });
});

// CREATE - add new campground to DB
router.post('/campgrounds', middleware.isLoggedIn, (req, res) => {
    console.log(req.body);
  // Get some data from form
  const name = req.body.name;
  const price = req.body.price;
  const desc = req.body.description;
  const author = {
    id: req.user._id,
    username: req.user.username,
  };
  const image = req.body.image;
  const imageId = req.body.imageId;
  const newCampground = {
    name: name.trim(),
    price: price.trim(),
    description: desc.trim(),
    author: author,
    image: image.trim(),
    imageId: imageId.trim(),
  };
  // Create a new campground and save it to DB
  Campground.create(newCampground, (err, newCampground) => {
    res.json(newCampground);
  });
});

router.post('/login', passport.authenticate('local'),
    (req, res) => {
        res.json(req.user);
    },
  );

module.exports = router;
