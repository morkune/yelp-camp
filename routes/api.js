const express = require('express');
const passport = require('passport');
const cloudinary = require('cloudinary');
const router = express.Router();
const middleware = require('../middleware');
const Campground = require('../models/campground');
const Review = require('../models/review');
const User = require('../models/user');

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
    name: name && name.trim(),
    price: price && price.trim(),
    description: desc && desc.trim(),
    author: author,
    image: image && image.trim(),
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

// Delete user route from DB
router.delete('/users/:id', (req, res) => {
  if (!req.user.isAdmin) {
    return res.sendStatus(401);
  }
  User.findById(req.params.id, (err, foundUser) => {
    if (err || !(foundUser && foundUser._id)) {
      return res.sendStatus(404);
    } else {
      Campground.find()
        .where('author.id')
        .equals(foundUser._id)
        .exec((err, campgrounds) => {
          campgrounds.forEach(async (campground) => {
            if (err) {
              return res.sendStatus(500);
            }
            try {
              if (campground.imageId) {
                await cloudinary.v2.uploader.destroy(campground.imageId);
              }
              Review.remove({ _id: { $in: campground.reviews } }, () => {
                campground.remove();
              });
            } catch (err) {
              console.error(err);
            }
          });
          try {
            foundUser.remove();
            return res.sendStatus(200);
          } catch (err) {
            console.error(err);
            res.sendStatus(500);
          }
        });
    }
  });
});

router.post('/login', passport.authenticate('local'), (req, res) => {
  res.json(req.user);
});

router.get('/users', (req, res) => {
  let dbFilter = {};
  if (req.query.firstName) {
    const regex = new RegExp(escapeRegex(req.query.firstName), 'gi');
    dbFilter = { firstName: regex };
  }

  // Get all users from DB
  User.find(dbFilter).exec((err, allUsers) => {
    res.json(allUsers); // Return users as JSON
  });
});

router.post('/users', (req, res) => {
  if (!req.user.isAdmin) {
    return res.sendStatus(401);
  }
  const username = req.body.username;
  const password = req.body.password;
  const firstname = req.body.firstName;
  const lastname = req.body.lastName;
  const email = req.body.email;
  const avatar = req.body.avatar;
  const newUser = {
    username: username && username.trim(),
    password: password && password.trim(),
    firstName: firstname && firstname.trim(),
    lastName: lastname && lastname.trim(),
    email: email && email.trim(),
    avatar: avatar && avatar.trim(),
  };

  // Create a new user and save it to DB
  User.create(newUser, (err, newUser) => {
    if (err) {
      return res.sendStatus(500);
    }
    res.json(newUser);
  });
});

module.exports = router;
