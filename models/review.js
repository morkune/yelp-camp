const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    rating: {
      // Setting the field type
      type: Number,
      // Making the star rating required
      required: 'Please provide a rating (1-5 stars).',
      // Defining min and max values
      min: 1,
      max: 5,
      // Adding validation to see if the entry is an integer
      validate: {
        // Validator accepts a function definition which it uses for validation
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value.',
      },
    },
    // Review text
    text: {
      type: String,
    },
    // Author id and username fields
    author: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      username: String,
    },
    // Campground associated with the review
    campground: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campground',
    },
  },
  {
    // If timestamps are set to true, mongoose assigns createdAt and updatedAt fields to your schema, the type assigned is Date.
    timestamps: true,
  },
);

module.exports = mongoose.model('Review', reviewSchema);
