const express = require('express');
const router = express.Router();
const Campground = require('../models/campground');
const middleware = require('../middleware');
const Review = require('../models/review');
const multer = require('multer');
const storage = multer.diskStorage({
  filename: (req, file, callback) => {
    callback(null, Date.now() + file.originalname);
  },
});
const imageFilter = (req, file, cb) => {
  // accept image files only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};
const upload = multer({ storage: storage, fileFilter: imageFilter });

const cloudinary = require('cloudinary');
cloudinary.config({
  cloud_name: 'da8mojpxv',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// INDEX - show all campgrounds in the web
router.get('/', (req, res) => {
  const perPage = 8;
  const pageNumber = parseInt(req.query.page) || 1;
  let noMatch = null;
  const pagesToSkip = perPage * pageNumber - perPage;
  if (req.query.search) {
    const regex = new RegExp(escapeRegex(req.query.search), 'gi');
    // Get all campgrounds from DB
    Campground.find({ name: regex })
      .skip(pagesToSkip)
      .limit(perPage)
      .exec((err, allCampgrounds) => {
        Campground.count({ name: regex }).exec((err, count) => {
          if (err) {
            console.log(err);
            res.redirect('back');
          } else {
            if (!allCampgrounds.length) {
              noMatch = `No campgrounds match "${req.query.search}" query, please try again.`;
            }
            res.render('campgrounds/index', {
              campgrounds: allCampgrounds,
              current: pageNumber,
              pages: Math.ceil(count / perPage),
              noMatch: noMatch,
              search: req.query.search,
            });
          }
        });
      });
  } else {
    // Get all campgrounds from DB
    Campground.find({})
      .skip(pagesToSkip)
      .limit(perPage)
      .exec((err, allCampgrounds) => {
        Campground.count().exec((err, count) => {
          if (err) {
            console.log(err);
          } else {
            res.render('campgrounds/index', {
              campgrounds: allCampgrounds,
              current: pageNumber,
              pages: Math.ceil(count / perPage),
              noMatch: noMatch,
              search: false,
            });
          }
        });
      });
  }
});

// CREATE - add new campground to DB
router.post('/', middleware.isLoggedIn, upload.single('image'), (req, res) => {
  // Get some data from form
  const name = req.body.name;
  const price = req.body.price;
  const desc = req.body.description;
  const author = {
    id: req.user._id,
    username: req.user.username,
  };
  cloudinary.v2.uploader.upload(req.file.path, (err, result) => {
    if (err) {
      req.flash('error', err.message);
      return res.redirect('back');
    }
    const image = result.secure_url;
    const imageId = result.public_id;
    const newCampground = {
      name: name.trim(),
      price: price.trim(),
      description: desc.trim(),
      author: author,
      image,
      imageId,
    };
    // Create a new campground and save it to DB
    Campground.create(newCampground, (err, newCampground) => {
      if (err) {
        req.flash('error', err.message);
        return res.redirect('back');
      } else {
        //redirect back to campground page
        res.redirect(`/campgrounds/${newCampground._id}`);
      }
    });
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
    .populate({
      path: 'reviews',
      options: { sort: { createdAt: -1 } },
    })
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
router.put(
  '/:id',
  middleware.checkCampgroundOwnership,
  upload.single('image'),
  (req, res) => {
    delete req.body.campground.rating;
    // Find and update the correct campground
    const { name, price, image, desc } = req.body.campground;
    const campground = { name, price, image, desc };
    // Prevent unnecessary spaces in the form except for non-string values
    Object.keys(campground).forEach((key) => {
      if (typeof campground[key] === 'string') {
        campground[key] = campground[key].trim();
      }
    });

    Campground.findById(req.params.id, async (err, campground) => {
      if (err) {
        req.flash('error', err.message);
        res.redirect('back');
      } else {
        if (req.file) {
          try {
            if (campground.imageId) {
              await cloudinary.v2.uploader.destroy(campground.imageId);
            }
            const result = await cloudinary.v2.uploader.upload(req.file.path);
            campground.imageId = result.public_id;
            campground.image = result.secure_url;
          } catch (err) {
            req.flash('error', err.message);
            return res.redirect('back');
          }
        }
        campground.name = req.body.campground.name.trim();
        campground.price = req.body.campground.price.trim();
        campground.description = req.body.campground.description.trim();
        campground.save();
        req.flash('success', 'Successfully Updated!');
        res.redirect('/campgrounds/' + campground._id);
      }
    });
  },
);

// Delete campground route
router.delete('/:id', middleware.checkCampgroundOwnership, (req, res) => {
  Campground.findById(req.params.id, async (err, campground) => {
    if (err) {
      req.flash('error', err.message);
      return res.redirect('back');
    }
    try {
      await cloudinary.v2.uploader.destroy(campground.imageId);
      // Deletes all reviews associated with the campground
      Review.remove({ _id: { $in: campground.reviews } }, (err) => {
        if (err) {
          console.log(err);
          return res.redirect('/campgrounds');
        }
        campground.remove();
        req.flash('success', 'Campground deleted successfully!');
        res.redirect('/campgrounds');
      });
    } catch (err) {
      if (err) {
        req.flash('error', err.message);
      }
      return res.redirect('back');
    }
  });
});

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

module.exports = router;
