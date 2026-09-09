require('dotenv').config(); // Load environment variables
const express = require('express');
const db = require('./db'); 

const app = express();
const PORT = process.env.PORT || 3000;
const session = require('express-session');
const path = require('path');
const crypto = require('crypto');
const { hashPassword, checkPassword, publicUser, requireLogin, requireAdmin, validPassword } = require('./auth');

// Middleware to parse JSON bodies and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use files in public folder
app.use(session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'strict', maxAge: 8 * 60 * 60 * 1000 }
}));

// Reject browser writes coming from another website.
app.use((req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin &&
        req.headers.origin !== `${req.protocol}://${req.get('host')}`) {
        return res.status(403).json({ error: 'Requests must come from this website' });
    }
    next();
});

app.use('/admin', requireAdmin);
app.get('/admin_dashboard.html', requireAdmin);
app.get('/dashboard.html', requireLogin);
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.redirect('/login.html');
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

// List books needing stock before the generic ISBN route.
app.get('/books/low-stock', requireAdmin, async (req, res) => {
    const [rows] = await db.query('SELECT *, 10 AS DefaultOrderQty FROM BOOK WHERE StockQuantity < Threshold');
    res.json(rows);
});

app.post('/admin/orders/place', async (req, res) => {
    const { isbn, quantity } = req.body;
    if (typeof isbn !== 'string' || !isbn.trim() || !Number.isInteger(quantity) || quantity < 1 || quantity > 100000) {
        return res.status(400).json({ error: 'Invalid ISBN or quantity' });
    }
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [books] = await connection.query('SELECT ISBN FROM BOOK WHERE ISBN = ? FOR UPDATE', [isbn]);
        if (!books.length) {
            await connection.rollback();
            return res.status(404).json({ error: 'Book not found' });
        }
        const [pending] = await connection.query("SELECT RestockID FROM ADMIN_ORDER WHERE ISBN = ? AND Status = 'Pending'", [isbn]);
        if (pending.length) {
            await connection.rollback();
            return res.status(409).json({ error: 'A pending restock request already exists' });
        }
        await connection.query("INSERT INTO ADMIN_ORDER (OrderDate, Quantity, Status, ISBN) VALUES (NOW(), ?, 'Pending', ?)", [quantity, isbn]);
        await connection.commit();
        res.status(201).json({ message: 'Restock request recorded' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: 'Could not place restock request' });
    } finally { connection.release(); }
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
app.post('/register', async (req, res) => {
    const { username, password, firstName, lastName, email, phone, address } = req.body;
    if (!/^[a-zA-Z0-9_]{3,50}$/.test(username || '') || !validPassword(password) ||
        typeof email !== 'string' || email.length > 100 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return res.status(400).json({ error: 'Use a valid username, email and a password of 8-128 characters' });
    }
    try {
        await db.query(
            `INSERT INTO CUSTOMER (Username, Password, FirstName, LastName, Email, Phone, ShippingAddress)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [username, await hashPassword(password), firstName || '', lastName || '', email, phone || '', address || '']
        );
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(err.code === 'ER_DUP_ENTRY' ? 400 : 500).json({ error: 'Registration failed; check your details' });
    }
});

app.post('/login', async (req, res, next) => {
    const { username, password } = req.body;
    if (typeof username !== 'string' || typeof password !== 'string' || !password.length || password.length > 128) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }
    try {
        const [rows] = await db.query('SELECT * FROM CUSTOMER WHERE Username = ?', [username]);
        if (!rows.length || !await checkPassword(password, rows[0].Password)) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        // Create a fresh session after login.
        req.session.regenerate(err => {
            if (err) return next(err);
            req.session.user = publicUser(rows[0]);
            req.session.save(err => {
                if (err) return next(err);
                res.json({ message: 'Login successful', user: req.session.user });
            });
        });
    } catch (err) { next(err); }
});

app.get('/me', requireLogin, (req, res) => res.json({ user: req.session.user }));

app.post('/logout', (req, res, next) => {
    req.session.destroy(err => {
        if (err) return next(err);
        res.clearCookie('connect.sid');
        res.json({ message: 'Logged out' });
    });
});

// Update only the customer belonging to the current session.
app.put('/customer/profile', requireLogin, async (req, res) => {
    const username = req.session.user.Username;
    const { password, firstName, lastName, email, phone, shippingAddress } = req.body;
    if (typeof email !== 'string' || email.length > 100 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
        (password !== undefined && password !== '' && !validPassword(password))) {
        return res.status(400).json({ error: 'Invalid email or password' });
    }
    try {
        const passwordHash = password ? await hashPassword(password) : null;
        await db.query(`UPDATE CUSTOMER SET Password = COALESCE(?, Password), FirstName = ?,
            LastName = ?, Email = ?, Phone = ?, ShippingAddress = ? WHERE Username = ?`,
            [passwordHash, firstName || '', lastName || '', email, phone || '', shippingAddress || '', username]);
        const [rows] = await db.query('SELECT * FROM CUSTOMER WHERE Username = ?', [username]);
        if (!rows.length) return res.status(404).json({ error: 'User not found' });
        req.session.user = publicUser(rows[0]);
        res.json({ message: 'Profile updated successfully', user: req.session.user });
    } catch (err) {
        res.status(err.code === 'ER_DUP_ENTRY' ? 400 : 500).json({ error: 'Profile update failed' });
    }
});

// Add book (Admin)
app.post('/books', requireAdmin, async (req, res) => {
    const { isbn, title, category, publicationYear, sellingPrice, threshold, publisherName, stockQuantity, authors } = req.body;

    if (!validBook(title, sellingPrice, stockQuantity) || typeof isbn !== 'string' || !isbn.trim() || isbn.length > 20 ||
        !Number.isInteger(threshold) || threshold < 0 || !Number.isInteger(publicationYear) ||
        !['Science', 'Art', 'Religion', 'History', 'Geography'].includes(category) ||
        typeof publisherName !== 'string' || !Array.isArray(authors) ||
        authors.some(author => typeof author !== 'string' || !author.trim() || author.length > 100)) {
        return res.status(400).json({ error: 'Invalid book details' });
    }
    console.log("Adding new book:", title);

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        await connection.query(
            'INSERT INTO BOOK (ISBN, Title, Category, PublicationYear, SellingPrice, Threshold, PublisherName, StockQuantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [isbn, title, category, publicationYear, sellingPrice, threshold, publisherName, stockQuantity]
        );

        // Inserting authors
        if (authors && Array.isArray(authors) && authors.length > 0) {
            for (const author of authors) {
                console.log(`Inserting author: ${author}`);
                await connection.query( 
                    'INSERT INTO BOOK_AUTHORS (ISBN, AuthorName) VALUES (?, ?)',
                    [isbn, author]
                );
                console.log(`Author inserted: ${author}`);
            }
        }

        await connection.commit();
        console.log(`Book added successfully: ${isbn}`);
        res.status(201).json({ message: "Book added successfully" });

    } catch (err) {
        await connection.rollback();
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: "Book with this ISBN already exists" });
        } else {
            console.error("Add book failed:", err);
            res.status(500).json({ error: "Failed to add book" });
        }
    } finally {
        connection.release();
    }
});

// Modify book details (Admin)
app.put('/books/:isbn', requireAdmin, async (req, res) => {
    const { isbn } = req.params;
    const { title, sellingPrice, stockQuantity} = req.body;
    if (!validBook(title, sellingPrice, stockQuantity)) {
        return res.status(400).json({ error: 'Invalid title, price or stock quantity' });
    }

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

// Customer Orders (For Admin)
app.get('/admin/customer-orders', async (req, res) => {
    try {
        const query = `
            SELECT O.OrderNo, O.OrderDate, O.TotalPrice, O.CustomerUsername,
                   GROUP_CONCAT(B.Title SEPARATOR ', ') as Items
            FROM CUSTOMER_ORDER O
            JOIN ORDER_ITEMS OI ON O.OrderNo = OI.OrderNo
            JOIN BOOK B ON OI.ISBN = B.ISBN
            GROUP BY O.OrderNo, O.OrderDate, O.TotalPrice, O.CustomerUsername
            ORDER BY O.OrderDate DESC
        `;
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch customer orders" });
    }
});

// Checkout is a simulated order, with prices taken from the database.
app.post('/checkout', requireLogin, async (req, res) => {
    const { items } = req.body;
    const username = req.session.user.Username;
    if (!Array.isArray(items) || items.length === 0 || items.length > 100 || items.some(item =>
        !item || typeof item.isbn !== 'string' || !item.isbn.trim() || item.isbn.length > 20 ||
        !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100000) ||
        new Set(items.map(item => item.isbn)).size !== items.length) {
        return res.status(400).json({ error: 'Use a nonempty cart with unique books and positive whole quantities' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        let totalCents = 0;
        const orderItems = [];
        // Lock books in a stable order when multiple customers check out together.
        for (const item of [...items].sort((a, b) => a.isbn.localeCompare(b.isbn))) {
            const [books] = await connection.query(
                'SELECT StockQuantity, SellingPrice FROM BOOK WHERE ISBN = ? FOR UPDATE', [item.isbn]);
            if (!books.length || books[0].StockQuantity < item.quantity) {
                throw new Error(`Insufficient stock for ISBN: ${item.isbn}`);
            }
            const priceCents = Math.round(Number(books[0].SellingPrice) * 100);
            totalCents += priceCents * item.quantity;
            if (!Number.isSafeInteger(totalCents) || totalCents > 9999999999) {
                throw new Error('Order total is too large');
            }
            orderItems.push({ ...item, price: (priceCents / 100).toFixed(2) });
        }
        const [order] = await connection.query(
            'INSERT INTO CUSTOMER_ORDER (OrderDate, TotalPrice, CustomerUsername) VALUES (NOW(), ?, ?)',
            [(totalCents / 100).toFixed(2), username]);
        for (const item of orderItems) {
            await connection.query('INSERT INTO ORDER_ITEMS (OrderNo, ISBN, Quantity, UnitPrice) VALUES (?, ?, ?, ?)',
                [order.insertId, item.isbn, item.quantity, item.price]);
            await connection.query('UPDATE BOOK SET StockQuantity = StockQuantity - ? WHERE ISBN = ?',
                [item.quantity, item.isbn]);
        }
        await connection.commit();
        res.status(201).json({ message: 'Order placed successfully', orderId: order.insertId });
    } catch (err) {
        await connection.rollback();
        res.status(400).json({ error: err.sqlMessage ? 'Order could not be saved' : err.message });
    } finally { connection.release(); }
});

// -- Might need verification --
// View past orders (Customer)
// This retrieves all orders for a specific user with detailed book information
app.get('/orders/history/:username', requireLogin, async (req, res) => {
    const { username } = req.params;
    if (username !== req.session.user.Username) {
        return res.status(403).json({ error: 'You can only view your own orders' });
    }

    try {
        const query = `
            SELECT 
                O.OrderNo, 
                O.OrderDate, 
                O.TotalPrice, 
                OI.Quantity, 
                B.ISBN, 
                B.Title AS BookName, 
                OI.UnitPrice AS SellingPrice
            FROM CUSTOMER_ORDER O
            JOIN ORDER_ITEMS OI ON O.OrderNo = OI.OrderNo
            JOIN BOOK B ON OI.ISBN = B.ISBN
            WHERE O.CustomerUsername = ?
            ORDER BY O.OrderDate DESC
        `;

        const [rows] = await db.query(query, [username]);

        if (rows.length === 0) {
            return res.json([]); // No orders found, return empty array
        }

        // Grouping Logic -> using a map to group items by OrderNo
        const ordersMap = new Map();

        rows.forEach(row => {
            if (!ordersMap.has(row.OrderNo)) {
                ordersMap.set(row.OrderNo, {
                    orderNo: row.OrderNo,
                    totalPrice: row.TotalPrice,
                    orderDate: row.OrderDate,
                    items: [] 
                });
            }
            
            // Push item into the correct order's array
            ordersMap.get(row.OrderNo).items.push({
                title: row.BookName,
                isbn: row.ISBN,
                quantity: row.Quantity, // Added quantity
                price: row.SellingPrice
            });
        });

        const orders = Array.from(ordersMap.values());
        console.log(`Fetched ${orders.length} past orders for ${username}`);
        res.json(orders);

    } catch (err) {
        console.error("Fetch past orders failed:", err);
        res.status(500).json({ error: "Failed to fetch orders" });
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
            SELECT COALESCE(SUM(TotalPrice), 0) AS TotalSales
            FROM CUSTOMER_ORDER 
            WHERE OrderDate >= DATE_FORMAT(CURRENT_DATE - INTERVAL 1 MONTH, '%Y-%m-01')
              AND OrderDate < DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')
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
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
        return res.status(400).json({ error: 'Use a valid date in YYYY-MM-DD format' });
    }
    try {
        const query = `
            SELECT COALESCE(SUM(TotalPrice), 0) AS TotalSales
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
            GROUP BY B.ISBN, B.Title
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

function validBook(title, price, stock) {
    return typeof title === 'string' && title.trim().length > 0 && title.length <= 255 &&
        typeof price === 'number' && Number.isFinite(price) && price >= 0 && price <= 99999999.99 &&
        Number.isInteger(stock) && stock >= 0 && stock <= 2147483647;
}

app.use((err, req, res, next) => {
    console.error(err.message);
    res.status(err.status === 400 ? 400 : 500).json({ error: 'Request could not be completed' });
});

if (require.main === module) {
    app.listen(PORT, '127.0.0.1', () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

module.exports = app;
