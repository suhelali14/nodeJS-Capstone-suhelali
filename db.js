const mongoose = require('mongoose');


const bookSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'Book name is required'],
        trim: true
    },
    author: { 
        type: String, 
        required: [true, 'Author name is required'],
        trim: true
    },
    genre: { 
        type: String, 
        required: [true, 'Genre is required']
    },
    type: { 
        type: String, 
        required: [true, 'Book type is required']
    },
    available: { 
        type: Boolean, 
        default: true 
    },
}, { timestamps: true });

// User Schema
const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'Name is required'],
    },
    username: { 
        type: String, 
        required: [true, 'Username is required'],
        unique: true,
        minlength: [3, 'Username must be at least 3 characters']
    },
    password: { 
        type: String, 
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters']
    },
    email: { 
        type: String, 
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true
    },
    mobile: { 
        type: String, 
        required: [true, 'Mobile number is required'],
        unique: true,
        match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit mobile number']
    },
    admin: { 
        type: Boolean, 
        default: false 
    },
});



// Borrow Schema
const borrowSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: [true, 'Username is required'] 
    },
    bookid: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Book',
        required: [true, 'Book ID is required']
    },
    duedate: { 
        type: Date, 
        default: () => new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        required: 'Due date is required'
    },
}, { timestamps: true });

// Return Schema
const returnSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: [true, 'Username is required'] 
    },
    bookid: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Book',
        required: [true, 'Book ID is required']
    },
    duedate: { 
        type: Date, 
        ref: 'BorrowRecord',
        required: [true, 'Due date is required']
    },
    fine: { 
        type: Number, 
        default: 0 
    },
}, { timestamps: true });



const Book = mongoose.model('Book', bookSchema);
const User = mongoose.model('User', userSchema);
const Borrow = mongoose.model('Borrow', borrowSchema);
const Return = mongoose.model('Return', returnSchema);

module.exports = { Book, User, Borrow, Return };