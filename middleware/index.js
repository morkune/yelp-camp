const Campground = require('../models/campground');
const Comment = require('../models/comment');
const Review = require('../models/review');

// All middleware goes here
const middlewareObj = {};

middlewareObj.checkCampgroundOwnership = (req, res, next) => {
  if (req.isAuthenticated()) {
    Campground.findById(req.params.id, (err, foundCampground) => {
      if (err) {
        req.flash('error', 'Campground not found');
        res.redirect('back');
      } else {
        // Does user own the campground?
        if (
          foundCampground.author.id.equals(req.user._id) ||
          req.user.isAdmin
        ) {
          next();
        } else {
          req.flash('error', "You don't have permission to do that");
          res.redirect('back');
        }
      }
    });
  } else {
    req.flash('error', 'You need to be logged in to do that');
    res.redirect('back');
  }
};

middlewareObj.checkCommentOwnership = (req, res, next) => {
  if (req.isAuthenticated()) {
    Comment.findById(req.params.comment_id, (err, foundComment) => {
      if (err) {
        res.redirect('back');
      } else {
        // Does user own the comment?
        if (foundComment.author.id.equals(req.user._id) || req.user.isAdmin) {
          next();
        } else {
          req.flash('error', "You don't have permission to do that");
          res.redirect('back');
        }
      }
    });
  } else {
    req.flash('error', 'You need to be logged in to do that');
    res.redirect('back');
  }
};

middlewareObj.checkUserOwnership = (req, res, next) => {
  if (req.isAuthenticated()) {
    const canEditUser =
      req.user &&
      (req.params.id === req.user._id.toString() || req.user.isAdmin);
    if (canEditUser) {
      next();
    } else {
      req.flash('error', "You don't have permission to do that");
      res.redirect('back');
    }
  } else {
    req.flash('error', 'You need to be logged in to do that');
    res.redirect('back');
  }
};

middlewareObj.checkReviewOwnership = (req, res, next) => {
  if (req.isAuthenticated()) {
    Review.findById(req.params.review_id, (err, foundReview) => {
      if (err || !foundReview) {
        res.redirect('back');
      } else {
        // Does user own the comment?
        if (foundReview.author.id.equals(req.user._id)) {
          next();
        } else {
          req.flash('error', "You don't have permission to do that");
          res.redirect('back');
        }
      }
    });
  } else {
    req.flash('error', 'You need to be logged in to do that');
    res.redirect('back');
  }
};

middlewareObj.checkReviewExistence = (req, res, next) => {
  if (req.isAuthenticated()) {
    Campground.findById(req.params.id)
      .populate('reviews')
      .exec((err, foundCampground) => {
        if (err || !foundCampground) {
          req.flash('error', 'Campground not found.');
          res.redirect('back');
        } else {
          // check if req.user._id exists in foundCampground.reviews
          var foundUserReview = foundCampground.reviews.some((review) => {
            return review.author.id.equals(req.user._id);
          });
          if (foundUserReview) {
            req.flash('error', 'You already wrote a review.');
            return res.redirect('/campgrounds/' + foundCampground._id);
          }
          // if the review was not found, go to the next middleware
          next();
        }
      });
  } else {
    req.flash('error', 'You need to login first.');
    res.redirect('back');
  }
};

middlewareObj.isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error', 'You need to be logged in to do that');
  res.redirect('/login');
};

module.exports = middlewareObj;
