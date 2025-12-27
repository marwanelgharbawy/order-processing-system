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

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});