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

// Searching

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

// Search by Title (Partial Match)
app.get('/books/search/title/:title', async (req, res) => {
    try {
        const { title } = req.params;
        const searchTerm = `%${title}%`; // Wildcard for partial match to be put in query

        const [rows] = await db.query('SELECT * FROM BOOK WHERE Title LIKE ?', [searchTerm]);
        
        console.log(`Books found for title search "${title}": ${rows.length}`);
        res.json(rows);
    } catch (err) {
        console.error("Search by title error:", err);
        res.status(500).json({ error: "Database error" });
    }
});

// Search by author
app.get('/books/search/author/:author', async (req, res) => {
    try {
        const { author } = req.params;
        const searchTerm = `%${author}%`;

        // Requires JOIN because authors are in a separate table
        const query = `
            SELECT DISTINCT B.* FROM BOOK B 
            JOIN BOOK_AUTHORS A ON B.ISBN = A.ISBN 
            WHERE A.AuthorName LIKE ?
        `;

        const [rows] = await db.query(query, [searchTerm]);
        
        console.log(`Books found for author search "${author}": ${rows.length}`);
        res.json(rows);
    } catch (err) {
        console.error("Search by author error:", err);
        res.status(500).json({ error: "Database error" });
    }
});

// Search by publisher
app.get('/books/search/publisher/:publisher', async (req, res) => {
    try {
        const { publisher } = req.params;
        const searchTerm = `%${publisher}%`;

        const [rows] = await db.query('SELECT * FROM BOOK WHERE PublisherName LIKE ?', [searchTerm]);
        
        console.log(`Books found for publisher search "${publisher}": ${rows.length}`);
        res.json(rows);
    } catch (err) {
        console.error("Search by publisher error:", err);
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

// Edit user profile
// Updates password, names, phone, address
app.put('/customer/:username', async (req, res) => {
    // We expect the username to be passed in the body
    const { username } = req.params;
    const { password, firstName, lastName, phone, shippingAddress } = req.body;

    try {

        const query = `
            UPDATE CUSTOMER 
            SET Password = ?, FirstName = ?, LastName = ?, Phone = ?, ShippingAddress = ? 
            WHERE Username = ?
        `;

        const [result] = await db.query(query, [password, firstName, lastName, phone, shippingAddress, username]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        console.log(`Customer profile updated: ${username}`);
        res.json({ message: "Profile updated successfully" });
    } catch (err) {
        console.error("Profile update failed:", err);
        res.status(500).json({ error: "Failed to update profile" });
    }
});

// Add book (Admin)
app.post('/books', async (req, res) => {
    const { isbn, title, category, publicationYear, sellingPrice, threshold, publisherName, stockQuantity } = req.body;

    console.log("Adding new book:", isbn, title, category, publicationYear, sellingPrice, threshold, publisherName, stockQuantity);

    try {
        await db.query(
            'INSERT INTO BOOK (ISBN, Title, Category, PublicationYear, SellingPrice, Threshold, PublisherName, StockQuantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [isbn, title, category, publicationYear, sellingPrice, threshold, publisherName, stockQuantity]
        );
        console.log(`Book added successfully: ${isbn}`);
        res.status(201).json({ message: "Book added successfully" });
    } catch (err) {
        console.error("Insertion failed:", err);
        res.status(500).json({ error: "Failed to add book" });
    }
});

// Modify book details (Admin)
app.put('/books/:isbn', async (req, res) => {
    const { isbn } = req.params;
    const { title, sellingPrice, stockQuantity} = req.body;

    try {
        // execute the update
        const [result] = await db.query(
            'UPDATE BOOK SET Title = ?, SellingPrice = ?, StockQuantity = ? WHERE ISBN = ?',
            [title, sellingPrice, stockQuantity, isbn]
        );

        // If no rows were affected, the ISBN doesn't exist
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Book not found" });
        }

        console.log(`Book updated successfully: ${isbn}`);
        res.json({ message: "Book updated successfully" });

    } catch (err) {
        console.error("Update failed:", err);
        res.status(500).json({ error: "Failed to update book" });
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

// Customer Orders
// Checking out requires a series of operations that must all succeed
// If any fail, we need to rollback everything -> transaction
app.post('/checkout', async (req, res) => {
    const { username, items } = req.body; 

    // items = array of book objects { isbn, quantity, price }

    // Start transaction -> get connection
    const connection = await db.getConnection(); 

    try {
        await connection.beginTransaction();

        // Calculate Total
        let totalPrice = 0;
        items.forEach(item => totalPrice += item.price * item.quantity);

        // Create Order Record
        const [orderResult] = await connection.query(
            'INSERT INTO CUSTOMER_ORDER (OrderDate, TotalPrice, CustomerUsername) VALUES (NOW(), ?, ?)',
            [totalPrice, username]
        );
        const orderId = orderResult.insertId;

        // Process Items & Deduct Stock
        for (const item of items) {
            // Check stock first
            const [stockRows] = await connection.query(
                'SELECT StockQuantity FROM BOOK WHERE ISBN = ? FOR UPDATE', 
                [item.isbn]
            );
            
            // If no stock such thing or insufficient stock
            if (stockRows.length === 0 || stockRows[0].StockQuantity < item.quantity) {
                throw new Error(`Insufficient stock for ISBN: ${item.isbn}`);
            }

            // Sufficient stock exists, proceed

            // Add Order Item
            await connection.query(
                'INSERT INTO ORDER_ITEMS (OrderNo, ISBN, Quantity) VALUES (?, ?, ?)',
                [orderId, item.isbn, item.quantity]
            );

            // Update Stock (Might trigger something)
            await connection.query(
                'UPDATE BOOK SET StockQuantity = StockQuantity - ? WHERE ISBN = ?',
                [item.quantity, item.isbn]
            );
        }

        await connection.commit(); // Confirm transaction
        console.log(`Order ${orderId} placed successfully for user ${username}.`);
        res.status(201).json({ message: "Order placed successfully!", orderId });

    } catch (err) {
        await connection.rollback(); // Undo everything if error
        console.error("Checkout failed:", err);
        res.status(400).json({ error: err.message || "Checkout failed" });
    } finally {
        connection.release();
    }
});

// -- Might need verification --
// View past orders (Customer)
// This retrieves all orders for a specific user with detailed book information
app.get('/orders/history/:username', async (req, res) => {
    const { username } = req.params;

    try {
        const query = `
            SELECT 
                CO.OrderNo, 
                CO.OrderDate, 
                CO.TotalPrice, 
                B.ISBN, 
                B.Title AS BookName, 
                OI.Quantity
            FROM CUSTOMER_ORDER CO
            JOIN ORDER_ITEMS OI ON CO.OrderNo = OI.OrderNo
            JOIN BOOK B ON OI.ISBN = B.ISBN
            WHERE CO.CustomerUsername = ?
            ORDER BY CO.OrderDate DESC;
        `;

        const [rows] = await db.query(query, [username]);

        if (rows.length === 0) {
            console.log(`No past orders found for user: ${username}`);
            return res.json({ message: "No past orders found.", orders: [] });
        }

        console.log(`Fetched past orders for user: ${username}`);
        res.json(rows);
    } catch (err) {
        console.error("Error fetching order history:", err);
        res.status(500).json({ error: "Failed to fetch order history" });
    }
});



// Confirm Admin Restock Order (Transaction)
app.post('/admin/orders/confirm/:restockId', async (req, res) => {
    const { restockId } = req.params;

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Lock row
        const [orders] = await connection.query(
            'SELECT * FROM ADMIN_ORDER WHERE RestockID = ? FOR UPDATE',
            [restockId]
        );

        if (orders.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: "Order not found" });
        }

        const order = orders[0];

        // If it was already confirmed, return
        if (order.Status === 'Confirmed') {
            await connection.rollback();
            return res.status(400).json({ error: "Order is already confirmed" });
        }

        // Change order status to Confirmed
        await connection.query(
            'UPDATE ADMIN_ORDER SET Status = ? WHERE RestockID = ?',
            ['Confirmed', restockId]
        );

        // Add restock quantity
        await connection.query(
            'UPDATE BOOK SET StockQuantity = StockQuantity + ? WHERE ISBN = ?',
            [order.Quantity, order.ISBN]
        );

        // Commit the transaction
        await connection.commit();
        console.log(`Restock order ${restockId} confirmed. Added ${order.Quantity} copies to ISBN ${order.ISBN}.`);
        res.json({ message: "Order confirmed and stock updated successfully" });

    } catch (err) {
        // If anything fails, rollback
        await connection.rollback();
        console.error("Order confirmation failed:", err);
        res.status(500).json({ error: "Failed to confirm order" });
    } finally {
        connection.release();
    }
});

// System Reports (Admin Only)
// Few SQL queries
// Total sales for books in the previous month
app.get('/admin/reports/sales/previous-month', async (req, res) => {
    try {
        const query = `
            SELECT SUM(TotalPrice) AS TotalSales 
            FROM CUSTOMER_ORDER 
            WHERE OrderDate >= LAST_DAY(CURRENT_DATE - INTERVAL 2 MONTH) + INTERVAL 1 DAY
            AND OrderDate < LAST_DAY(CURRENT_DATE - INTERVAL 1 MONTH) + INTERVAL 1 DAY
        `;
        const [rows] = await db.query(query);
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to generate report" });
    }
});

// Total sales for books on a certain day
// param: /admin/reports/sales/day?date=2025-12-25
app.get('/admin/reports/sales/day', async (req, res) => {
    const { date } = req.query; 
    try {
        const query = `
            SELECT SUM(TotalPrice) AS TotalSales 
            FROM CUSTOMER_ORDER 
            WHERE DATE(OrderDate) = ?
        `;
        const [rows] = await db.query(query, [date]);
        res.json(rows[0] || { TotalSales: 0 });
    } catch (err) {
        res.status(500).json({ error: "Failed to generate report" });
    }
});

// Top 5 Customers (For the Last 3 Months)
app.get('/admin/reports/top-customers', async (req, res) => {
    try {
        const query = `
            SELECT CustomerUsername, SUM(TotalPrice) AS TotalSpent
            FROM CUSTOMER_ORDER
            WHERE OrderDate >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
            GROUP BY CustomerUsername
            ORDER BY TotalSpent DESC
            LIMIT 5
        `;
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to generate report" });
    }
});

// Top 10 Selling Books (For the Last 3 Months)
app.get('/admin/reports/top-books', async (req, res) => {
    try {
        const query = `
            SELECT B.Title, B.ISBN, SUM(OI.Quantity) AS TotalCopiesSold
            FROM ORDER_ITEMS OI
            JOIN CUSTOMER_ORDER CO ON OI.OrderNo = CO.OrderNo
            JOIN BOOK B ON OI.ISBN = B.ISBN
            WHERE CO.OrderDate >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
            GROUP BY B.ISBN
            ORDER BY TotalCopiesSold DESC
            LIMIT 10
        `;
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to generate report" });
    }
});

// Total Number of Times a Specific Book Has Been Ordered (Replenishment)
// param: /admin/reports/replenishment/978-0134685991
app.get('/admin/reports/replenishment/:isbn', async (req, res) => {
    const { isbn } = req.params;
    try {
        const query = `
            SELECT COUNT(*) AS TimesOrdered, SUM(Quantity) AS TotalQuantityRequested
            FROM ADMIN_ORDER
            WHERE ISBN = ?
        `;
        const [rows] = await db.query(query, [isbn]);
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Failed to generate report" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});