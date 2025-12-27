async function loadAdminOrders() {
    const tableBody = document.getElementById('admin-orders-table-body');
    
    try {
        const response = await fetch('/admin/orders'); 
        if (!response.ok) throw new Error("Failed to fetch orders");

        const orders = await response.json();
        
        // reset el table
        tableBody.innerHTML = '';

        if (orders.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4">No orders found.</td></tr>';
            return;
        }

        orders.forEach(order => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>#${order.OrderNo || 'N/A'}</td>
                <td>${new Date(order.OrderDate).toLocaleDateString()}</td>
                <td>$${order.TotalAmount || '0.00'}</td>
                <td><button onclick="viewOrderDetails(${order.OrderNo})">View Details</button></td>
            `;
            tableBody.appendChild(row);
        });

    } catch (err) {
        console.error("Error:", err);
        tableBody.innerHTML = `<tr><td colspan="4" style="color:red;">Error loading orders.</td></tr>`;
    }
}

function viewOrderDetails(id) {
    alert("Viewing details for Order #" + id);
}