const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/user');
const async = require('async');
const nodemailer = require('nodemailer');
const mg = require('nodemailer-mailgun-transport');
const crypto = require('crypto');

const emailTransport = nodemailer.createTransport(
  mg({
    auth: {
      api_key: process.env.MG_API_KEY,
      domain: process.env.MG_DOMAIN,
    },
  }),
);

// root route
router.get('/', (req, res) => {
  res.render('landing');
});

// Auth routes

// show register form
router.get('/register', (req, res) => {
  res.render('register', { isAdmin: req.query.admin === 'true' });
});

// handle sign up logic
router.post('/register', (req, res) => {
  const newUser = new User({
    username: req.body.username,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    avatar: req.body.avatar,
  });

  if (req.body.adminCode === process.env.ADMIN_CODE) {
    newUser.isAdmin = true;
  }

  User.register(newUser, req.body.password, (err, user) => {
    if (err) {
      return res.render('register', { error: err.message });
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

// show login form
router.get('/login', (req, res) => {
  res.render('login');
});

// login route responsible for handling login logic
router.post(
  '/login',
  passport.authenticate('local', {
    successRedirect: '/campgrounds',
    failureRedirect: '/login',
  }),
  (req, res) => {},
);

// logout route
router.get('/logout', (req, res) => {
  req.logout();
  req.flash('success', 'Logged you out!');
  res.redirect('/campgrounds');
});

// forgot route
router.get('/forgot', (req, res) => {
  res.render('forgot');
});

router.post('/forgot', (req, res, next) => {
  async.waterfall(
    [
      done => {
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

          user.save(err => {
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
        emailTransport.sendMail(mailOptions, err => {
          console.log(`Mail sent to ${user.email}`);
          req.flash(
            'success',
            `An e-mail has been sent to ${user.email} with further instructions.`,
          );
          done(err, 'done');
        });
      },
    ],
    err => {
      if (err) return next(err);
      res.redirect('/forgot');
    },
  );
});

// route that loads the view route
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
      done => {
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
            // if the first password is the same as the second passw, so we can go ahead and reset passw
            if (req.body.password === req.body.confirm) {
              user.setPassword(req.body.password, err => {
                user.resetPasswordToken = undefined;
                user.resetPasswordExpires = undefined;
                // save the user new passw (in database)
                user.save(err => {
                  req.logIn(user, err => {
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
        emailTransport.sendMail(mailOptions, err => {
          req.flash('success', 'Success! Your password has been changed.');
          done(err);
        });
      },
    ],
    err => {
      res.redirect('/campgrounds');
    },
  );
});

module.exports = router;
