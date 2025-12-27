document.addEventListener('DOMContentLoaded', () => {
    loadBooks();
});

async function loadBooks() {
    const container = document.getElementById('book-container');
    
    try {
        // endpoint app.get('/books')
        const response = await fetch('/books'); 
        
        if (!response.ok) throw new Error("Failed to fetch");

        const books = await response.json();
        renderBooks(books);
    } catch (err) {
        console.error("Error:", err);
        container.innerHTML = `<p style="color:red;">Unable to load books. Please check backend.</p>`;
    }
}

function renderBooks(books) {
    const container = document.getElementById('book-container');
    container.innerHTML = ''; // Clear the grid

    if (books.length === 0) {
        container.innerHTML = '<p>No books found in the database.</p>';
        return;
    }

    books.forEach(book => {
        const card = document.createElement('div');
        card.className = 'book-card';
        card.innerHTML = `
            <div style="height:150px; background:#ddd; border-radius:4px; margin-bottom:10px;"></div>
            <h3>${book.Title || 'Untitled'}</h3>
            <p>Author: ${book.PublisherName || 'N/A'}</p>
            <div class="price">$${book.SellingPrice || '0.00'}</div>
            <button class="btn-add" onclick="addToCart('${book.ISBN}')">Add to Cart</button>
        `;
        container.appendChild(card);
    });
}

function addToCart(isbn) {
    alert("Added book ISBN: " + isbn + " to cart!");
}