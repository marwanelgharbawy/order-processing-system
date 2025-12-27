async function loadOrderHistory() {
    const tbody = document.getElementById('order-history-body');
    if (!tbody) return;

    const username = localStorage.getItem('currentUser');
    if (!username) {
        tbody.innerHTML = '<tr><td colspan="4">Please log in to view orders.</td></tr>';
        return;
    }

    tbody.innerHTML = '<tr><td colspan="4">Loading orders...</td></tr>';

    try {
        const response = await fetch(`/orders/history/${username}`);
        
        if (!response.ok) {
            throw new Error("Failed to fetch orders");
        }

        const orders = await response.json();
        tbody.innerHTML = '';

        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4">No past orders found.</td></tr>';
            return;
        }

        orders.forEach(order => {
            // Format Date
            const dateObj = new Date(order.orderDate);
            const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString();

            // Create a summary of items (e.g., "Java Book, History Book...")
            const itemsSummary = order.items.map(item => 
                `${item.title} (x${item.quantity})`
            ).join('<br>');

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${order.orderNo}</td>
                <td>${dateStr}</td>
                <td style="font-weight:bold; color:#27ae60;">$${parseFloat(order.totalPrice).toFixed(2)}</td>
                <td style="font-size:0.9em; color:#555; line-height:1.4;">${itemsSummary}</td>
            `;
            tbody.appendChild(row);
        });

    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="4" style="color:red;">Error loading history.</td></tr>';
    }
}

// Load history when clicking the nav button
document.getElementById('nav-orders').addEventListener('click', loadOrderHistory);