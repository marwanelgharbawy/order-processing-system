async function loadRestockSuggestions() {
    const tbody = document.getElementById('place-orders-table-body');
    
    try {
        // Fetching books that are below threshold
        const response = await fetch('/books/low-stock'); 
        const books = await response.json();

        if (books.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">All books are sufficiently stocked. ✅</td></tr>';
            return;
        }

        tbody.innerHTML = books.map(book => `
            <tr>
                <td>${book.ISBN}</td>
                <td>${book.Title}</td>
                <td>${book.PublisherName}</td>
                <td><b style="color:red;">${book.StockQuantity}</b></td>
                <td>${book.Threshold}</td>
                <td><strong>${book.DefaultOrderQty}</strong></td> 
                <td>
                    <button class="btn-add" onclick="placeOrder('${book.ISBN}', ${book.DefaultOrderQty})">
                        Place Order
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red;">Error loading restock data.</td></tr>';
    }
}

async function placeOrder(isbn, qty) {
    if (!confirm(`Place order for ${qty} copies?`)) return;

    try {
        const response = await fetch('/admin/orders/place', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isbn, quantity: qty })
        });

        if (response.ok) {
            alert("Order sent to publisher!");
            loadRestockSuggestions(); // Refresh the list
        }
    } catch (err) {
        alert("Failed to place order.");
    }
}