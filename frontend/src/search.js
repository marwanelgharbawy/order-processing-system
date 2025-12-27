document.addEventListener('DOMContentLoaded', () => {
    loadBooks();
});

// 2. Fetch the data from your existing Backend endpoint
async function loadBooks() {
    const container = document.getElementById('book-container');
    
    try {
        // This hits your app.get('/books') exactly as you wrote it
        const response = await fetch('/books'); 
        
        if (!response.ok) throw new Error("Failed to fetch");

        const books = await response.json();
        renderBooks(books);
    } catch (err) {
        console.error("Error:", err);
        container.innerHTML = `<p style="color:red;">Unable to load books. Please check backend.</p>`;
    }
}

// 3. Put the data into the HTML
function renderBooks(books) {
    const container = document.getElementById('book-container');
    container.innerHTML = ''; // Clear the grid

    if (books.length === 0) {
        container.innerHTML = '<p>No books found in the database.</p>';
        return;
    }

    books.forEach(book => {
        // Note: Using uppercase keys (TITLE, AUTHOR, etc) to match SQL defaults
        const card = document.createElement('div');
        card.className = 'book-card';
        card.innerHTML = `
            <div style="height:150px; background:#ddd; border-radius:4px; margin-bottom:10px;"></div>
            <h3>${book.TITLE || 'Untitled'}</h3>
            <p>Author: ${book.AUTHOR || 'N/A'}</p>
            <div class="price">$${book.SELLING_PRICE || '0.00'}</div>
            <button class="btn-add" onclick="addToCart('${book.ISBN}')">Add to Cart</button>
        `;
        container.appendChild(card);
    });
}

// Placeholder for the cart function
function addToCart(isbn) {
    alert("Added book ISBN: " + isbn + " to cart!");
}