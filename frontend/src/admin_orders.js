async function loadAdminOrders() {
    const tableBody = document.getElementById('admin-orders-table-body');
    if (!tableBody) return;

    try {
        const response = await fetch('/admin/orders');
        const orders = await response.json();
        
        tableBody.innerHTML = ''; 

        orders.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${order.RestockID}</td>
                <td>${order.ISBN}</td>
                <td>${new Date(order.OrderDate).toLocaleDateString()}</td>
                <td>${order.Quantity}</td>
                <td><span style="color: ${order.Status === 'Pending' ? 'orange' : 'green'}">${order.Status}</span></td>
                <td>
                    ${order.Status === 'Pending' ? 
                    `<button class="btn-add" style="background:#27ae60; width:auto; padding:5px 10px;">Confirm</button>` : 
                    `✅`}
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (err) {
        tableBody.innerHTML = '<tr><td colspan="6">Error loading admin orders.</td></tr>';
    }
}