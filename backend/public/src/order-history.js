//  View past orders
async function loadOrderHistory() {
    try {
        const response = await fetch('/api/customer/orders');
        const orders = await response.json();
        
        const container = document.querySelector('#orders tbody');
        container.innerHTML = orders.map(order => `
            <tr>
                <td>#${order.OrderNo}</td> <td>${new Date(order.OrderDate).toLocaleDateString()}</td>
                <td>$${parseFloat(order.TotalPrice).toFixed(2)}</td>
                <td><button onclick="viewOrderDetails(${order.OrderNo})">View Details</button></td>
            </tr>
        `).join('');
    } catch (err) {
        console.error("Order history error:", err);
    }
}