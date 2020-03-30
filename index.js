const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');
const methodOverride = require('method-override');
const dotenv = require('dotenv');

dotenv.config(); // Get env variables from .env file

const PORT = process.env.PORT || 3000;
const DB_CONNECTION_STRING = process.env.DB_CONNECTION_STRING;

// Requiring routes
const commentRoutes = require('./routes/comments');
const campgroundRoutes = require('./routes/campgrounds');
const authRoutes = require('./routes/auth');

console.log('Connecting to Mongo DB...');
mongoose
  .connect(DB_CONNECTION_STRING, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useFindAndModify: false,
  })
  .then(
    () => {
      console.log('Successfully connected to Mongo DB');
    },
    (error) => {
      console.error(error);
    },
  );

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public')); // Serve static files in /public
app.use(methodOverride('_method'));
app.use(flash());

// Passport config
app.use(
  require('express-session')({
    secret: 'Once again it is secret message.',
    resave: false,
    saveUninitialized: false,
  }),
);

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.currentPath = req.path;
  res.locals.error = req.flash('error');
  res.locals.success = req.flash('success');
  app.locals.moment = require('moment');
  next();
});

app.use(authRoutes);
app.use('/campgrounds', campgroundRoutes);
app.use('/campgrounds/:id/comments', commentRoutes);

app.listen(PORT, () => {
  console.log('The Server Has Started!');
  console.log(`Listening on ${PORT}`);
});
