require('dotenv').config(); // Load environment variables
const express = require('express');
const db = require('./db'); 

const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

app.get('/', (req, res) => {
    res.send("Backend server is running");
});

// Test books endpoint
app.get('/books', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM BOOK');
        
        res.json(rows);
    } catch (err) {
        console.error("Error fetching books:", err);
        res.status(500).json({ error: "Failed to fetch books" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});