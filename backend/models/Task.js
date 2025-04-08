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
        required: false, // Owner is not required for task creation
        ref: 'User'
    },
    // Due date of the task
    dueDate: {
        type: Date
    },
    // Field to track the last due date notification
    lastDueDateNotification: {
        type: Date,
        default: null
    },
    // Field to track the last due date notification
    visibleTo: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // Keep a field to indicate if task is globally visible
    isPublic: {
        type: Boolean,
        default: true
    },
    //Field to track task history
    history: [{
        action: {
            type: String,
            enum: ['created', 'assigned', 'updated', 'completed']
        },
        date: {
            type: Date,
            default: Date.now
        },
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    // Add attachment field
    attachment: {
        filename: String,
        contentType: String,
        data: Buffer,
        size: Number,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
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