const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { Book, User, Borrow, Return } = require('./db');
require('dotenv').config();

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;


const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }

            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

const checkAdminAccess = (req, res, next) => {
    if (!req.user.admin) {
        return res.status(403).send('Access denied. Admin privileges required.');
    }
    next();
};

const MONGO_STRING=process.env.MONGO_STRING
mongoose.connect(MONGO_STRING, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Failed to connect to MongoDB:', err));

// 1. Register User
app.post('/register', async (req, res) => {
    try {
        const { name, username, password, email, mobile } = req.body;

        const existingUser = await User.findOne({ 
            $or: [{ username }, { email }, { mobile }] 
        });
        
        if (existingUser) {
            return res.status(400).send('Username, email, or mobile already exists');
        }

        const user = new User({ 
            name, 
            username, 
            password, 
            email, 
            mobile 
        });

        await user.save();
        res.status(201).send('User registered successfully');
    } catch (err) {
        res.status(400).send(err.message);
    }
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(401).send('Invalid username or password');
        }

        const isMatch = (password===user.password);

        if (!isMatch) {
            return res.status(401).send('Invalid username or password');
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user._id, 
                username: user.username, 
                admin: user.admin 
            }, 
            JWT_SECRET, 
            { expiresIn: '1h' }
        );

        res.status(200).json({ 
            message: 'Login successful', 
            token,
            isAdmin: user.admin 
        });
    } catch (err) {
        res.status(400).send(err.message);
    }
});
// 3. Get All Books (authenticated)
app.get('/books', authenticateJWT, async (req, res) => {
    const books = await Book.find();
    res.status(200).json(books);
});
// 4. Get All Users (admin only)
app.get('/users', authenticateJWT, checkAdminAccess, async (req, res) => {
    const users = await User.find().select('-password');
    res.status(200).json(users);
});
// 5. Create Book (admin only)
app.post('/books', authenticateJWT, checkAdminAccess, async (req, res) => {
    try {
        const book = new Book(req.body);
        await book.save();
        res.status(201).send('Book created successfully');
    } catch (err) {
        res.status(400).send(err.message);
    }
});
// 6. Borrow Book (authenticated)
app.post('/borrow', authenticateJWT, async (req, res) => {
    try {
        const { username, bookid } = req.body;

        // Verify the username matches the authenticated user
        if (username !== req.user.username) {
            return res.status(403).send('Unauthorized to borrow for another user');
        }

        const book = await Book.findById(bookid);
        if (!book || !book.available) {
            return res.status(400).send('Book not available');
        }

        // Check if user already has borrowed this book
        const existingBorrow = await Borrow.findOne({ username, bookid });
        if (existingBorrow) {
            return res.status(400).send('Book already borrowed by this user');
        }

        const borrow = new Borrow({ username, bookid });
        await borrow.save();

        book.available = false;
        await book.save();

        res.status(201).send('Book borrowed successfully');
    } catch (err) {
        res.status(400).send(err.message);
    }
});
// 7. Return Book (authenticated)
app.post('/return', authenticateJWT, async (req, res) => {
    try {
        const { username, bookid } = req.body;

        // Verify the username matches the authenticated user
        if (username !== req.user.username) {
            return res.status(403).send('Unauthorized to return for another user');
        }
        const borrow = await Borrow.findOne({ username, bookid });
        if (!borrow) {
            return res.status(400).send('No borrow record found');
        }
        const fine = calculateFine(borrow.duedate);
        const returnRecord = new Return({ 
            username, 
            bookid, 
            duedate: borrow.duedate, 
            fine 
        });
        await returnRecord.save();

        const book = await Book.findById(bookid);
        book.available = true;
        await book.save();

        // Remove the borrow record
        await Borrow.findByIdAndDelete(borrow._id);

        res.status(201).send(`Book returned successfully. Fine: $${fine}`);
    } catch (err) {
        res.status(400).send(err.message);
    }
});
// 8. Update Book Details (admin only)
app.put('/books/:id', authenticateJWT, checkAdminAccess, async (req, res) => {
    try {
        const book = await Book.findByIdAndUpdate(req.params.id, req.body, { 
            new: true,
            runValidators: true 
        });
        res.status(200).json(book);
    } catch (err) {
        res.status(400).send(err.message);
    }
});
function calculateFine(duedate) {
    const today = new Date();
    const due = new Date(duedate);
    
    if (today <= due) return 0;
    return 100;
}
app.listen(3000, () => console.log('Server running on port 3000'));