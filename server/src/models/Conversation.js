const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: 'New Conversation',
      trim: true,
      maxlength: 200,
    },
    persona: {
      type: String,
      required: true,
      enum: ['Legal Expert', 'Medical Consultant', 'Education Tutor'],
    },
  },
  {
    // Mongoose adds createdAt and updatedAt automatically
    timestamps: true,
  }
);

module.exports = mongoose.model('Conversation', conversationSchema);
