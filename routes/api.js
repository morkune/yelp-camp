const express = require('express');
const passport = require('passport');
const cloudinary = require('cloudinary');
const router = express.Router();
const middleware = require('../middleware');
const Campground = require('../models/campground');
const Review = require('../models/review');

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
  // Get some data from form
  const name = req.body.name;
  const price = req.body.price;
  const desc = req.body.description;
  const author = {
    id: req.user._id,
    username: req.user.username,
  };
  const image = req.body.image;
  const newCampground = {
    name: name.trim(),
    price: price.trim(),
    description: desc.trim(),
    author: author,
    image: image.trim(),
  };
  if (req.body.imageId) {
    newCampground.imageId = req.body.imageId.trim();
  }
  // Create a new campground and save it to DB
  Campground.create(newCampground, (err, newCampground) => {
    res.json(newCampground);
  });
});

// Delete campground route from DB
router.delete(
  '/campgrounds/:id',
  middleware.checkCampgroundOwnership,
  (req, res) => {
    Campground.findById(req.params.id, async (err, campground) => {
      if (!campground) {
        return res.sendStatus(200);
      }
      if (err) {
        console.error(err);
        return res.status(500).send(err);
      }
      try {
        if (campground.imageId) {
          await cloudinary.v2.uploader.destroy(campground.imageId);
        }
        Review.remove({ _id: { $in: campground.reviews } }, () => {
          campground.remove();
        });
        return res.sendStatus(200);
      } catch (err) {
        console.error(err);
        return res.status(500).send(err);
      }
    });
  },
);

router.post('/login', passport.authenticate('local'), (req, res) => {
  res.json(req.user);
});

module.exports = router;
