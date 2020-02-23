const express = require('express');
const router = express.Router({ mergeParams: true });
const Campground = require('../models/campground')
const Comment = require('../models/comment')
const middleware = require ('../middleware')

// comments new
router.get('/new', middleware.isLoggedIn, (req, res) => {
    // find campground by id
    Campground.findById(req.params.id, (err, campground) => {
        if (err) {
            console.log(err);
        } else {
            res.render('comments/new', { campground: campground });
        }
    });
});

// Comments create
router.post('/', middleware.isLoggedIn, (req, res) => {
    // lookup campground using id
    Campground.findById(req.params.id, (err, campground) => {
        if (err) {
            console.log(err);
            res.redirect('/campgrounds');
        } else {
            // create new comment
            Comment.create(req.body.comment, (err, comment) => {
                if (err) {
                    req.flash('error', 'Something went wrong');
                    console.log(err);
                } else {
                    comment.author.id = req.user._id;
                    comment.author.username = req.user.username;
                    comment.save();
                    // connect new comment to campground
                    campground.comments.push(comment);
                    campground.save();
                    // redirect campground show page
                    req.flash('success', 'Successfully added comment');
                    res.redirect('/campgrounds/' + campground._id);
                };
            });
        };
    });
});

// comments edit route
router.get('/:comment_id/edit', middleware.checkCommentOwnership, (req, res) => {
    Comment.findById(req.params.comment_id, (err, foundComments) => {
        if (err) {
            res.redirect('back');
        } else {
            res.render('comments/edit', { campground_id: req.params.id, comment: foundComments });
        }
    });
});

// comments update route
router.put('/:comment_id', middleware.checkCommentOwnership, (req, res) => {
    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, (err, updatedComments) => {
        if (err) {
            res.redirect('back');
        } else {
            req.flash('success', "Comment updated");
            res.redirect('/campgrounds/' + req.params.id);
        }
    });
});

// comments delete route
router.delete('/:comment_id', middleware.checkCommentOwnership, (req, res) => {
    //find by id and remove
    Comment.findByIdAndRemove(req.params.comment_id, (err) => {
        if (err) {
            res.redirect('back');
        } else {
            req.flash('success', "Comment deleted");
            res.redirect('/campgrounds/' + req.params.id);
        }
    });
})

module.exports = router;