
const mongoose = require("mongoose");

const leaveRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  type: {
    type: String,
    enum: ["casual", "medical"],
    required: true
  },
  days: {
    type: Number,
    required: true,
    min: 1,
    validate: {
      validator: Number.isInteger,
      message: "Leave days must be a whole number"
    }
  },
  status: {
    type: String,
    enum: ["pending", "processing", "approved", "rejected"],
    default: "pending"
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("LeaveRequest", leaveRequestSchema);
