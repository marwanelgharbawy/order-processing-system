async function loadBooks(query = '', type = 'title', category = 'All Categories') {
    const container = document.getElementById('book-container');
    if (!container) return; // Guard clause

    container.innerHTML = '<p style="padding:20px;">Loading books...</p>';

    let url = '/books'; 

    if (query) {
        if (type === 'isbn') url = `/books/${encodeURIComponent(query)}`;
        else if (type === 'title') url = `/books/search/title/${encodeURIComponent(query)}`;
        else if (type === 'author') url = `/books/search/author/${encodeURIComponent(query)}`;
        else if (type === 'publisher') url = `/books/search/publisher/${encodeURIComponent(query)}`;
    } else if (category && category !== 'All Categories') {
        url = `/books/category/${encodeURIComponent(category)}`;
    }

    try {
        const response = await fetch(url);

        console.log("Fetch URL:", url);

        if (!response.ok) {
            if (response.status === 404) {
                container.innerHTML = '<p style="padding:20px;">No books found.</p>';
                return;
            }
            throw new Error(`Server Error: ${response.status}`);
        }

        const data = await response.json();
        const books = Array.isArray(data) ? data : [data];

        container.innerHTML = '';

        if (books.length === 0) {
            container.innerHTML = '<p style="padding:20px;">No books found.</p>';
            return;
        }

        books.forEach(book => {
            const card = document.createElement('div');
            card.className = 'book-card';
            
            // Escape title to prevent JS errors in the onclick
            const safeTitle = book.Title ? book.Title.replace(/'/g, "\\'") : "Unknown";
            
            // Only show "Add to Cart" if the addToCart function exists (Customer Page)
            let actionButton = '';
            if (typeof addToCart === 'function') {
                actionButton = `
                    <button class="btn-add" 
                        onclick="addToCart('${safeTitle}', ${book.SellingPrice}, '${book.ISBN}')">
                        Add to Cart
                    </button>
                `;
            }

            card.innerHTML = `
                <div style="height:120px; background:#f4f4f4; border-radius:4px; margin-bottom:10px; display:flex; align-items:center; justify-content:center; color:#888;">
                    ISBN: ${book.ISBN}
                </div>
                <h3>${book.Title}</h3>
                <p><strong>Publisher:</strong> ${book.PublisherName || 'Unknown'}</p>
                <div class="price" style="font-size: 1.2em; color: #27ae60; font-weight: bold; margin: 10px 0;">
                    $${parseFloat(book.SellingPrice).toFixed(2)}
                </div>
                <p style="font-size: 0.9em; color: ${book.StockQuantity > 0 ? 'green' : 'red'}; margin-bottom:10px;">
                    ${book.StockQuantity > 0 ? `In Stock: ${book.StockQuantity}` : 'Out of Stock'}
                </p>
                ${actionButton}
            `;
            container.appendChild(card);
        });

    } catch (err) {
        console.error("Search Error:", err);
        container.innerHTML = '<p style="padding:20px; color:red;">Error connecting to server.</p>';
    }
}

// Button Handler for the Search Bar
function handleShopSearch() {
    // We check if elements exist to avoid errors on pages that might miss them
    const searchInput = document.getElementById('shopSearchInput');
    const typeSelect = document.getElementById('searchTypeSelect');
    const categorySelect = document.getElementById('shopCategorySelect');

    const query = searchInput ? searchInput.value.trim() : '';
    const type = typeSelect ? typeSelect.value : 'title';
    const category = categorySelect ? categorySelect.value : 'All Categories';

    loadBooks(query, type, category);
}

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('book-container')) {
        loadBooks();
    }
});

const addBookForm = document.querySelector('#add_books form');
if (addBookForm) {
    addBookForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const authorsInput = document.getElementById('authors').value;
        const authorsArray = authorsInput.split(',').map(a => a.trim()).filter(a => a.length > 0);
        
        const newBook = {
            isbn: document.getElementById('isbn').value,
            title: document.getElementById('title').value,
            authors: authorsArray, 
            category: document.getElementById('categorySelector').value,
            publicationYear: parseInt(document.getElementById('year').value),
            sellingPrice: parseFloat(document.getElementById('price').value),
            threshold: parseInt(document.getElementById('threshold').value),
            publisherName: document.getElementById('publisher').value,
            stockQuantity: parseInt(document.getElementById('stock').value)
        };

        try {
            const response = await fetch('/books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newBook)
            });
            if (response.ok) { alert("Book added!"); addBookForm.reset(); } 
            else { const err = await response.json(); alert("Error: " + err.error); }
        } catch (err) { alert("Failed to add book."); }
    });
}

async function searchBookToEdit() {
    const isbnInput = document.getElementById('editSearchIsbn');
    const isbn = isbnInput.value.trim();
    
    if (!isbn) return alert("Please enter an ISBN");

    const tbody = document.getElementById('edit-book-body');
    tbody.innerHTML = '<tr><td colspan="5">Searching...</td></tr>';

    try {
        const response = await fetch(`/books/${isbn}`);
        
        if (!response.ok) {
            tbody.innerHTML = '<tr><td colspan="5" style="color:red;">Book not found.</td></tr>';
            return;
        }

        const book = await response.json();

        // Render the row with input fields
        // IMPORTANT: We store the Category in data-category because the Backend requires it on Update
        tbody.innerHTML = `
            <tr data-isbn="${book.ISBN}" data-category="${book.Category || ''}">
                <td>${book.ISBN}</td>
                <td><input type="text" value="${book.Title}" class="title-input" style="width:100%"></td>
                <td><input type="number" value="${book.StockQuantity}" class="stock-input" style="width:60px"></td>
                <td><input type="number" value="${book.SellingPrice}" class="price-input" style="width:60px"></td>
                <td><button class="btn-add" onclick="updateBook('${book.ISBN}')">Save Changes</button></td>
            </tr>
        `;
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="5" style="color:red;">Error connecting to server.</td></tr>';
    }
}

async function updateBook(isbn) {
    // 1. Find the specific row using the data attribute we set above
    const row = document.querySelector(`tr[data-isbn="${isbn}"]`);
    if (!row) return alert("Error: Could not find book row.");

    // 2. Get values from inputs
    const newTitle = row.querySelector('.title-input').value;
    const newStock = row.querySelector('.stock-input').value;
    const newPrice = row.querySelector('.price-input').value;
    const category = row.getAttribute('data-category'); // Retrieve hidden category

    try {
        const response = await fetch(`/books/${isbn}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: newTitle,
                stockQuantity: parseInt(newStock),
                sellingPrice: parseFloat(newPrice),
                category: category // REQUIRED by backend
            })
        });

        if (response.ok) {
            alert("Book updated successfully!");
        } else {
            const err = await response.json();
            alert("Update failed: " + err.error);
        }
    } catch (error) {
        console.error("Error updating book:", error);
        alert("Failed to connect to server");
    }
}