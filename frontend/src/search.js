
async function loadBooks(query = '', type = 'all') {
    const container = document.getElementById('book-container');
    let url = '/books';

    if (type === 'isbn' && query) url = `/books/${query}`;
    else if (type === 'category' && query && query !== 'All Categories') {
        url = `/books/category/${encodeURIComponent(query)}`;
    }

    try {
        const response = await fetch(url);
        const data = await response.json();
        const books = Array.isArray(data) ? data : [data];
        
        container.innerHTML = '';
        
        if (!books[0]) {
            container.innerHTML = '<p>No books found.</p>';
            return;
        }

        books.forEach(book => {
            const card = document.createElement('div');
            card.className = 'book-card';
            card.innerHTML = `
                <div style="height:120px; background:#eee; border-radius:4px; margin-bottom:10px; display:flex; align-items:center; justify-content:center; font-size:12px; color:#999;">
                    ISBN: ${book.ISBN}
                </div>
                <h3>${book.Title}</h3>
                <p>Publisher: ${book.PublisherName || 'Unknown'}</p>
                <p><small>Stock: ${book.StockQuantity}</small></p>
                <div class="price">$${parseFloat(book.SellingPrice).toFixed(2)}</div>
                <button class="btn-add" onclick="addToCart('${book.ISBN}')">Add to Cart</button>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        container.innerHTML = '<p>Error connecting to server.</p>';
    }
}

//helper function
function handleShopSearch() {
    const isbn = document.getElementById('shopSearchInput').value.trim();
    const category = document.getElementById('shopCategorySelect').value;

    if (isbn) {
        // Search by ISBN
        loadBooks(isbn, 'isbn');
    } else if (category !== 'All Categories') {
        // Search by Category
        loadBooks(category, 'category');
    } else {
        // Show everything
        loadBooks();
    }
}



async function searchBookToEdit() {
    const isbn = document.getElementById('editSearchIsbn').value.trim();
    if (!isbn) return alert("Please enter an ISBN");

    try {
        const response = await fetch(`/books/${isbn}`);
        const book = await response.json();

        if (response.status === 404) {
            alert("Book not found!");
            return;
        }

        // Target the table body in the edit_books section
        const tbody = document.querySelector('#edit_books table tbody');
        tbody.innerHTML = `
            <tr>
                <td>${book.ISBN}</td>
                <td><input type="text" value="${book.Title}" class="title-input"></td>
                <td><input type="number" value="${book.StockQuantity}" class="stock-input" style="width: 60px;"></td>
                <td><input type="number" value="${book.MinThreshold}" class="threshold-input" style="width: 60px;"></td>
                <td><button class="btn-add" onclick="updateBook('${book.ISBN}')">Save Changes</button></td>
            </tr>
        `;
    } catch (err) {
        alert("Error finding book");
    }
}