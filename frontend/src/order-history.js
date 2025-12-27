//  View past orders
// order-history.js

async function viewOrderDetails(orderNo) {
    const modal = document.getElementById('order-details-modal');
    const body = document.getElementById('order-details-body');
    const title = document.getElementById('modal-order-id');
    
    title.innerText = `Order #${orderNo} Details`;
    body.innerHTML = '<tr><td colspan="3">Loading items...</td></tr>';
    modal.style.display = 'flex';

    try {
        // This hits the backend to join ORDER_ITEMS with BOOK table
        const response = await fetch(`/api/customer/orders/${orderNo}`);
        const items = await response.json();

        body.innerHTML = items.map(item => `
            <tr style="border-bottom:1px solid #eee;">
                <td style="padding:10px;">${item.Title}</td>
                <td style="padding:10px;">${item.Quantity}</td>
                <td style="padding:10px;">$${parseFloat(item.SellingPrice).toFixed(2)}</td>
            </tr>
        `).join('');

    } catch (err) {
        body.innerHTML = '<tr><td colspan="3" style="color:red;">Error loading details.</td></tr>';
    }
}

function closeModal() {
    document.getElementById('order-details-modal').style.display = 'none';
}