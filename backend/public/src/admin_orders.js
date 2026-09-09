document.getElementById('nav-orders').addEventListener('click', loadAllCustomerOrders);
document.getElementById('nav-place_orders').addEventListener('click', loadLowStockBooks);
document.getElementById('nav-confirm_orders').addEventListener('click', loadRestockRequests);

// Customer orders
async function loadAllCustomerOrders() {
    const tbody = document.getElementById('all-orders-body');
    tbody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';

    try {
        const response = await fetch('/admin/customer-orders');
        if (!response.ok) throw new Error("Failed to fetch sales");
        const orders = await response.json();

        tbody.innerHTML = '';
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">No sales found.</td></tr>';
            return;
        }

        orders.forEach(order => {
            const dateStr = new Date(order.OrderDate).toLocaleDateString();
            tbody.innerHTML += `
                <tr>
                    <td>#${order.OrderNo}</td>
                    <td><strong>${escapeHtml(order.CustomerUsername)}</strong></td>
                    <td>${dateStr}</td>
                    <td style="color:green; font-weight:bold;">$${order.TotalPrice}</td>
                    <td style="font-size:0.85em; color:#555;">${escapeHtml(order.Items)}</td>
                </tr>
            `;
        });
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="5" style="color:red;">Error loading sales log.</td></tr>';
    }
}

// Low stock books
async function loadLowStockBooks() {
    const tbody = document.getElementById('low-stock-body');
    tbody.innerHTML = '<tr><td colspan="5">Checking stock...</td></tr>';

    try {
        const response = await fetch('/books/low-stock');
        const books = await response.json();
        
        // Filter logic
        const lowStock = books.filter(b => b.StockQuantity < b.Threshold);

        tbody.innerHTML = '';
        if (lowStock.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="color:green;">All stock levels are healthy.</td></tr>';
            return;
        }

        lowStock.forEach(book => {
            tbody.innerHTML += `
                <tr>
                    <td>${escapeHtml(book.ISBN)}</td>
                    <td>${escapeHtml(book.Title)}</td>
                    <td style="color:red; font-weight:bold;">${book.StockQuantity}</td>
                    <td>${book.Threshold}</td>
                    <td><button class="btn-add" data-restock>Request 10 copies</button></td>
                </tr>
            `;
        });
        tbody.querySelectorAll('[data-restock]').forEach((button, index) => {
            button.addEventListener('click', () => placeOrder(lowStock[index].ISBN, 10));
        });
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="5">Error checking inventory.</td></tr>';
    }
}

// Restock requests from ADMIN_ORDERS
async function loadRestockRequests() {
    const tbody = document.getElementById('restock-orders-body');
    tbody.innerHTML = '<tr><td colspan="5">Loading requests...</td></tr>';

    try {
        const response = await fetch('/admin/orders');
        if (!response.ok) throw new Error("Failed to fetch");
        const orders = await response.json();

        tbody.innerHTML = '';
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">No pending restock requests.</td></tr>';
            return;
        }

        orders.forEach(order => {
            const isPending = order.Status === 'Pending';
            const actionBtn = isPending 
                ? `<button class="btn-add" style="background:#27ae60; padding:5px 10px;" onclick="confirmRestock(${order.RestockID})">Confirm Receipt</button>` 
                : `<span style="color:gray;">Completed</span>`;

            tbody.innerHTML += `
                <tr>
                    <td>#${order.RestockID}</td>
                    <td>${escapeHtml(order.ISBN)}</td>
                    <td>${order.Quantity}</td>
                    <td style="font-weight:bold; color:${isPending ? 'orange' : 'green'}">${order.Status}</td>
                    <td>${actionBtn}</td>
                </tr>
            `;
        });
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="5">Error loading requests.</td></tr>';
    }
}

// Confirm Restock
async function confirmRestock(restockId) {
    if (!confirm("Confirm receipt of goods? Stock will be updated.")) return;

    try {
        const response = await fetch(`/admin/orders/confirm/${restockId}`, { method: 'POST' });
        if (response.ok) {
            alert("Restock confirmed!");
            loadRestockRequests(); // Refresh table
        } else {
            const err = await response.json();
            alert("Error: " + err.error);
        }
    } catch (err) {
        alert("Connection failed.");
    }
}
async function placeOrder(isbn, quantity) {
    if (!confirm(`Request ${quantity} copies?`)) return;
    try {
        const response = await fetch('/admin/orders/place', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isbn, quantity })
        });
        const result = await response.json();
        alert(result.message || result.error);
        if (response.ok) loadRestockRequests();
    } catch (err) { alert('Could not record restock request'); }
}
