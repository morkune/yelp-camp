const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/user');
const async = require('async');
const nodemailer = require('nodemailer');
const mg = require('nodemailer-mailgun-transport');
const crypto = require('crypto');
const Campground = require('../models/campground');
const middleware = require('../middleware');

const emailTransport = nodemailer.createTransport(
  mg({
    auth: {
      api_key: process.env.MG_API_KEY,
      domain: process.env.MG_DOMAIN,
    },
  }),
);

// Root route
router.get('/', (req, res) => {
  res.render('landing');
});

// Auth routes

// Show register form
router.get('/register', (req, res) => {
  res.render('register', { isAdmin: req.query.admin === 'true' });
});

// Handle sign up logic
router.post('/register', (req, res) => {
  // Get data from form and add to user array
  const username = req.body.username;
  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const email = req.body.email;
  const avatar = req.body.avatar;

  const newUser = new User({
    username: username.trim(),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim(),
    avatar: avatar.trim(),
  });

  if (req.body.adminCode === process.env.ADMIN_CODE) {
    newUser.isAdmin = true;
  }

  User.register(newUser, req.body.password, (err, user) => {
    if (err) {
      return res.render('register', {
        isAdmin: req.query.admin === 'true',
        error: err.message,
      });
    }
    passport.authenticate('local')(req, res, () => {
      req.flash(
        'success',
        'Successfully Signed Up! Nice to meet you ' + req.body.username,
      );
      res.redirect('/campgrounds');
    });
  });
});

// Show login form
router.get('/login', (req, res) => {
  res.render('login');
});

// Login route responsible for handling login logic
router.post(
  '/login',
  passport.authenticate('local', {
    successRedirect: '/campgrounds',
    failureRedirect: '/login',
  }),
  (req, res) => {},
);

// Logout route
router.get('/logout', (req, res) => {
  req.logout();
  req.flash('success', 'Logged you out!');
  res.redirect('/campgrounds');
});

// User Profile
router.get('/users/:id', (req, res) => {
  User.findById(req.params.id, (err, foundUser) => {
    if (err || !(foundUser && foundUser._id)) {
      req.flash('error', 'Something went wrong');
      res.redirect('/');
    } else {
      Campground.find()
        .where('author.id')
        .equals(foundUser._id)
        .exec((err, campgrounds) => {
          if (err) {
            req.flash('error', 'Something went wrong');
            res.redirect('/');
            return;
          }
          res.render('users/profile', {
            user: foundUser,
            campgrounds: campgrounds,
          });
        });
    }
  });
});

// User profile edit route
router.get('/users/:id/edit', middleware.checkUserOwnership, (req, res) => {
  User.findById(req.params.id, (err, foundUser) => {
    if (err || !(foundUser && foundUser._id)) {
      req.flash('error', 'Something went wrong');
      res.redirect('/');
    } else {
      res.render('users/profile-edit', {
        user: foundUser,
      });
    }
  });
});

// Update profile route
router.put('/users/:id', middleware.checkUserOwnership, (req, res) => {
  // Find and update the correct user
  const user = req.body.user;
  // Prevent unnecessary spaces in the form except for non-string values
  Object.keys(user).forEach((key) => {
    if (typeof user[key] === 'string') {
      user[key] = user[key].trim();
    }
  });
  User.findByIdAndUpdate(req.params.id, user, (err) => {
    if (err) {
      res.redirect('/campgrounds');
    } else {
      res.redirect('/users/' + req.params.id);
    }
  });
});

// Forgot route
router.get('/forgot', (req, res) => {
  res.render('forgot');
});

router.post('/forgot', (req, res, next) => {
  async.waterfall(
    [
      (done) => {
        crypto.randomBytes(20, (err, buf) => {
          const token = buf.toString('hex');
          done(err, token);
        });
      },
      (token, done) => {
        User.findOne({ email: req.body.email }, (err, user) => {
          if (!user) {
            req.flash('error', 'No account with that email address exists.');
            return res.redirect('/forgot');
          }

          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; //1 hour

          user.save((err) => {
            done(err, token, user);
          });
        });
      },
      (token, user, done) => {
        const mailOptions = {
          to: user.email,
          from: 'noreply@campgrounds.com',
          subject: 'Password reset request',
          text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.

                    Please click on the following link, or paste this into your browser to complete the process:
                    http://${req.headers.host}/reset/${token}

                    If you did not request this, please ignore this email and your password will remain unchanged.`,
          html: `You are receiving this because you (or someone else) have requested the reset of the password for your account.<br><br>
                Please click on the following link, or paste this into your browser to complete the process:<br>
                <a href="http://${req.headers.host}/reset/${token}">http://${req.headers.host}/reset/${token}</a><br><br>
                If you did not request this, please ignore this email and your password will remain unchanged.`,
        };
        emailTransport.sendMail(mailOptions, (err) => {
          console.log(`Mail sent to ${user.email}`);
          req.flash(
            'success',
            `An e-mail has been sent to ${user.email} with further instructions.`,
          );
          done(err, 'done');
        });
      },
    ],
    (err) => {
      if (err) return next(err);
      res.redirect('/forgot');
    },
  );
});

// Route that loads the view route
router.get('/reset/:token', (req, res) => {
  User.findOne(
    {
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    },
    (err, user) => {
      if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired.');
        return res.redirect('/forgot');
      }
      res.render('reset', { token: req.params.token });
    },
  );
});

router.post('/reset/:token', (req, res) => {
  async.waterfall(
    [
      (done) => {
        User.findOne(
          {
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() },
          },
          (err, user) => {
            if (!user) {
              req.flash(
                'error',
                'Password reset token is invalid or has expired.',
              );
              return res.redirect('back');
            }
            // If the first password is the same as the second passw, so we can go ahead and reset passw
            if (req.body.password === req.body.confirm) {
              user.setPassword(req.body.password, (err) => {
                user.resetPasswordToken = undefined;
                user.resetPasswordExpires = undefined;
                // Save the user new passw (in database)
                user.save((err) => {
                  req.logIn(user, (err) => {
                    done(err, user);
                  });
                });
              });
            } else {
              req.flash('error', 'Passwords do not match.');
              return res.redirect('back');
            }
          },
        );
      },

      (user, done) => {
        const mailOptions = {
          to: user.email,
          from: 'noreply@campgrounds.com',
          subject: 'Your password has been changed',
          text: `Hello,
          This is a confirmation that the password for your account ${user.email} has just been changed.`,
        };
        emailTransport.sendMail(mailOptions, (err) => {
          req.flash('success', 'Success! Your password has been changed.');
          done(err);
        });
      },
    ],
    (err) => {
      res.redirect('/campgrounds');
    },
  );
});

module.exports = router;
