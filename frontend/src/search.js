
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