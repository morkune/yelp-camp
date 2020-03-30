const express = require('express');
const router = express.Router();
const Campground = require('../models/campground');
const middleware = require('../middleware');

// INDEX - show all campgrounds in the web
router.get('/', (req, res) => {
  let noMatch = null;
  if (req.query.search) {
    const regex = new RegExp(escapeRegex(req.query.search), 'gi');
    // Get all campgrounds from DB
    Campground.find({ name: regex }, (err, allCampgrounds) => {
      if (err) {
        console.log(err);
      } else {
        if (!allCampgrounds.length) {
          noMatch = `No campgrounds match "${req.query.search}" query, please try again.`;
        }
        res.render('campgrounds/index', {
          campgrounds: allCampgrounds,
          noMatch: noMatch,
        });
      }
    });
  } else {
    // Get all campgrounds from DB
    Campground.find({}, function (err, allCampgrounds) {
      if (err) {
        console.log(err);
      } else {
        res.render('campgrounds/index', {
          campgrounds: allCampgrounds,
          noMatch: noMatch,
        });
      }
    });
  }
});

// CREATE - add new campground to DB
router.post('/', middleware.isLoggedIn, (req, res) => {
  // Get data from form and add to campgrounds array
  const name = req.body.name;
  const price = req.body.price;
  const image = req.body.image;
  const desc = req.body.description;
  const author = {
    id: req.user._id,
    username: req.user.username,
  };
  const newCampground = {
    name: name.trim(),
    price: price.trim(),
    image: image.trim(),
    description: desc.trim(),
    author: author,
  };
  // Create a new campground and save it to DB
  Campground.create(newCampground, (err) => {
    if (err) {
      console.log(err);
    } else {
      //redirect back to campground page
      res.redirect('/campgrounds');
    }
  });
});

// NEW- show form to create new campground
router.get('/new', middleware.isLoggedIn, (req, res) => {
  res.render('campgrounds/new.ejs');
});

// SHOW - shows more info about the camp
router.get('/:id', (req, res) => {
  // Find the campground with provided id
  Campground.findById(req.params.id)
    .populate('comments')
    .exec((err, foundCampground) => {
      if (err) {
        console.log(err);
      } else {
        // Render show template with that campground
        res.render('campgrounds/show', { campground: foundCampground });
      }
    });
});

// Edit campground route
router.get('/:id/edit', middleware.checkCampgroundOwnership, (req, res) => {
  Campground.findById(req.params.id, (err, foundCampground) => {
    res.render('campgrounds/edit', { campground: foundCampground });
  });
});

// Update campground route
router.put('/:id', middleware.checkCampgroundOwnership, (req, res) => {
  // Find and update the correct campground
  const campground = req.body.campground;
  // Prevent unnecessary spaces in the form except for non-string values
  Object.keys(campground).forEach((key) => {
    if (typeof campground[key] === 'string') {
      campground[key] = campground[key].trim();
    }
  });
  Campground.findByIdAndUpdate(
    req.params.id,
    campground,
    (err, updatedCampground) => {
      if (err) {
        res.redirect('/campgrounds');
      } else {
        res.redirect('/campgrounds/' + req.params.id);
      }
    },
  );
  //Redirect somewhere(show page)
});

// Delete campground route
router.delete('/:id', middleware.checkCampgroundOwnership, (req, res) => {
  Campground.findByIdAndRemove(req.params.id, () => {
    res.redirect('/campgrounds');
  });
});

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

module.exports = router;
