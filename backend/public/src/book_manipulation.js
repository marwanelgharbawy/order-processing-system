async function loadBooks(query = '', type = 'title', category = 'All Categories') {
    const container = document.getElementById('book-container');
    container.innerHTML = '<p style="padding:20px;">Loading books...</p>';

    let url = '/books'; 

    if (query) {
        if (type === 'isbn') {
            url = `/books/${encodeURIComponent(query)}`;
        } else if (type === 'title') {
            url = `/books/search/title/${encodeURIComponent(query)}`;
        } else if (type === 'author') {
            url = `/books/search/author/${encodeURIComponent(query)}`;
        } else if (type === 'publisher') {
            url = `/books/search/publisher/${encodeURIComponent(query)}`;
        }
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
            card.innerHTML = `
                <div style="height:120px; background:#f4f4f4; border-radius:4px; margin-bottom:10px; display:flex; align-items:center; justify-content:center; color:#888;">
                    ISBN: ${book.ISBN}
                </div>
                <h3>${book.Title}</h3>
                <p><strong>Publisher:</strong> ${book.PublisherName || 'Unknown'}</p>
                <div class="price" style="font-size: 1.2em; color: #27ae60; font-weight: bold; margin: 10px 0;">
                    $${parseFloat(book.SellingPrice).toFixed(2)}
                </div>
                <p style="font-size: 0.9em; color: ${book.StockQuantity > 5 ? 'green' : 'orange'};">
                    Stock: ${book.StockQuantity}
                </p>
            `;
            container.appendChild(card);
        });

    } catch (err) {
        console.error("Search Error:", err);
        container.innerHTML = '<p style="padding:20px; color:red;">Error connecting to server.</p>';
    }
}

function handleShopSearch() {
    const query = document.getElementById('shopSearchInput').value.trim();
    const type = document.getElementById('searchTypeSelect').value;
    const category = document.getElementById('shopCategorySelect').value;
    loadBooks(query, type, category);
}

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    // Only load if on the main dashboard page
    if(document.getElementById('book-container')) {
        loadBooks();
    }
});

const addBookForm = document.querySelector('#add_books form');

if (addBookForm) {
    addBookForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const authorsInput = document.getElementById('authors').value;
        const authorsArray = authorsInput
            .split(',')
            .map(author => author.trim())
            .filter(author => author.length > 0);
        
        if (authorsArray.length === 0) {
            alert("Please enter at least one author.");
            return;
        }

        const newBook = {
            isbn: document.getElementById('isbn').value,
            title: document.getElementById('title').value,
            authors: authorsArray, 
            category: document.getElementById('categorySelector').value,
            publicationYear: parseInt(document.getElementById('year').value),
            sellingPrice: parseFloat(document.getElementById('price').value),
            threshold: parseInt(document.getElementById('threshold').value),
            publisherName: document.getElementById('publisher').value,
            stockQuantity: 0 // Needs to be modified
        };

        try {
            const response = await fetch('/books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newBook)
            });

            if (response.ok) {
                alert("Book added successfully!");
                addBookForm.reset();
            } else {
                const error = await response.json();
                alert("Error: " + (error.error || "Unknown error"));
            }
        } catch (err) {
            console.error("Submission failed", err);
            alert("Failed to add book. Is the server running?");
        }
    });
}

async function searchBookToEdit() {
    const isbn = document.getElementById('editSearchIsbn').value.trim();
    if (!isbn) return alert("Please enter an ISBN");

    try {
        const response = await fetch(`/books/${isbn}`);
        
        if (!response.ok) {
            alert("Book not found!");
            return;
        }

        const book = await response.json();

        // Target the table body in the edit_books section
        const tbody = document.querySelector('#edit_books table tbody');
        
        // Store the category in a data attribute so we don't lose it on update
        // We also add price input here since backend supports updating it
        tbody.innerHTML = `
            <tr data-isbn="${book.ISBN}" data-category="${book.Category}">
                <td>${book.ISBN}</td>
                <td><input type="text" value="${book.Title}" class="title-input" style="width:100%"></td>
                <td><input type="number" value="${book.StockQuantity}" class="stock-input" style="width: 60px;"></td>
                <td><input type="number" value="${book.SellingPrice}" class="price-input" style="width: 60px;"></td>
                <td><button class="btn-add" onclick="updateBook('${book.ISBN}')">Save</button></td>
            </tr>
        `;
    } catch (err) {
        console.error(err);
        alert("Error finding book");
    }
}

async function updateBook(isbn) {
    const row = document.querySelector(`tr[data-isbn="${isbn}"]`);
    if (!row) return;

    const newTitle = row.querySelector('.title-input').value;
    const newStock = row.querySelector('.stock-input').value;
    const newPrice = row.querySelector('.price-input').value;
    // Retrieve the category we saved earlier
    const currentCategory = row.getAttribute('data-category'); 

    try {
        const response = await fetch(`/books/${isbn}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: newTitle,
                stockQuantity: parseInt(newStock),
                sellingPrice: parseFloat(newPrice),
                category: currentCategory // Backend requires this field
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