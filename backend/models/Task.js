const mongoose = require('mongoose');

/**
 * Task Schema for MongoDB using Mongoose
 * 
 * This schema defines the structure of the Task document in the MongoDB database.
 * It includes fields for title, description, status, owner, due date, visibility, 
 * creation date, and update date.
 */

const taskSchema = new mongoose.Schema({
    // Title of the task
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        minlength: [3, 'Title must be at least 3 characters long']
    },
    // Description of the task
    description: { 
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        minlength: [10, 'Description must be at least 10 characters long']
    },
    // Status of the task
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'behind-schedule', 'cancelled'],
        default: 'pending'
    },
    // Owner of the task (reference to User model)
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: false, // Change this from true to false
        ref: 'User'
    },
    // Due date of the task
    dueDate: {
        type: Date
    },
    // Replace visibility enum with an array
    visibleTo: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // Keep a field to indicate if task is globally visible
    isPublic: {
        type: Boolean,
        default: true
    },
    // Creation date of the task
    createdAt: {
        type: Date,
        default: Date.now
    },
    // Update date of the task
    updatedAt: {
        type: Date
    }
}, {
    // Enable timestamps for createdAt and updatedAt fields
    timestamps: true
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;