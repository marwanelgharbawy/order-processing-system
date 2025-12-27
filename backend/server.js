require('dotenv').config(); // Load environment variables
const express = require('express');
const db = require('./db'); 

const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send("Backend server is running");
});

// Test books endpoint
app.get('/books', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM BOOK');
        console.log("Fetched all books.");
        res.json(rows);
    } catch (err) {
        console.log("Error fetching books:", err);
        res.status(500).json({ error: "Failed to fetch books" });
    }
});

// Search by ISBN
// req.params: parameters from the URL
app.get('/books/:isbn', async (req, res) => {
    try {
        const { isbn } = req.params;
        const [rows] = await db.query('SELECT * FROM BOOK WHERE ISBN = ?', [isbn]);
        console.log(`Fetched book with ISBN: ${isbn}`);
        if (rows.length === 0) {
            console.log(`Book with ISBN ${isbn} not found`);
            return res.status(404).json({ error: "Book not found" });
        }
        console.log("Book details:", rows[0]);
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Database error" });
    }
});

// Search by Category
app.get('/books/category/:categoryName', async (req, res) => {
    try {
        const { categoryName } = req.params;
        const [rows] = await db.query('SELECT * FROM BOOK WHERE Category = ?', [categoryName]);
        res.json(rows);
        console.log(`Books fetched for category: ${categoryName}`);
    } catch (err) {
        res.status(500).json({ error: "Database error" });
    }
});

// User registration
// POST request to /register with JSON body
// Get data from req.body
app.post('/register', async (req, res) => {
    const { username, password, firstName, lastName, email, phone, address } = req.body;

    try {
        await db.query(
            `INSERT INTO CUSTOMER (Username, Password, FirstName, LastName, Email, Phone, ShippingAddress) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [username, password, firstName, lastName, email, phone, address]
        );
        res.status(201).json({ message: "User registered successfully" });
        console.log("New user registered:", username);
    } catch (err) {
        // Check for duplicate entry error
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: "Username or Email already exists" });
            console.log("Registration failed. Duplicate entry:", username);
        } else {
            console.error(err);
            res.status(500).json({ error: "Registration failed" });
        }
    }
});

// User login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const [rows] = await db.query(
            'SELECT * FROM CUSTOMER WHERE Username = ? AND Password = ?', 
            [username, password]
        );

        if (rows.length > 0) {
            res.json({ message: "Login successful", user: rows[0] });
            console.log("User logged in:", username);
        } else {
            res.status(401).json({ error: "Invalid username or password" });
            console.log("Login failed for user:", username);
        }
    } catch (err) {
        res.status(500).json({ error: "Login failed" });
    }
});

// Admin Orders
app.get('/admin/orders', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM ADMIN_ORDER');
        res.json(rows);
        if (rows.length === 0) {
            console.log("No admin orders found.");
        } else {
            console.log(`Fetched ${rows.length} admin orders.`);
        }
        console.log("Fetched all admin orders.");
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch admin orders" });
    }
});



app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});