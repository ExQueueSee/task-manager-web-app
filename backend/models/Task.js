const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        minlength: [3, 'Title must be at least 3 characters long']
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        minlength: [10, 'Description must be at least 10 characters long']
    },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'behind-schedule', 'cancelled'],
        default: 'pending'
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: false, // Change this from true to false
        ref: 'User'
    },
    dueDate: {
        type: Date
    },
    visibility: {
        type: String,
        enum: ['public', 'private', 'team'],
        default: 'public'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date
    }
}, {
    timestamps: true
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;