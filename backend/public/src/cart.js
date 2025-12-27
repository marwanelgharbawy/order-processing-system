let cartData = [];

// Initialize
if (localStorage.getItem('cartData')) {
    try { cartData = JSON.parse(localStorage.getItem('cartData')); } catch(e) { cartData = []; }
}

// Render Cart
function renderCart() {
    const cartTableBody = document.getElementById('cart-items');
    const grandTotalEl = document.getElementById('grand-total');
    const cartCountEl = document.getElementById('cart-count');
    const emptyMsg = document.getElementById('empty-cart');
    const cartTable = document.querySelector('.cart-container table');
    const cartSummary = document.getElementById('cart-summary');
    
    if (!cartTableBody) return; // Guard clause

    cartTableBody.innerHTML = '';
    let total = 0;
    let totalItems = 0;

    if (cartData.length === 0) {
        if(cartTable) cartTable.style.display = 'none';
        if(cartSummary) cartSummary.style.display = 'none';
        if(emptyMsg) emptyMsg.style.display = 'block';
        if(cartCountEl) cartCountEl.innerText = '0';
        if(grandTotalEl) grandTotalEl.innerText = '$0.00';
        return;
    }

    if(cartTable) cartTable.style.display = 'table';
    if(cartSummary) cartSummary.style.display = 'flex';
    if(emptyMsg) emptyMsg.style.display = 'none';

    cartData.forEach((item, index) => {
        let subtotal = item.price * item.qty;
        total += subtotal;
        totalItems += parseInt(item.qty);

        cartTableBody.innerHTML += `
            <tr>
                <td><div style="font-weight:bold;">${item.title}</div><small style="color:#888;">ISBN: ${item.isbn}</small></td>
                <td>$${item.price.toFixed(2)}</td>
                <td><input type="number" value="${item.qty}" min="1" onchange="updateQty(${index}, this.value)" style="width:50px; padding:5px;"></td>
                <td>$${subtotal.toFixed(2)}</td>
                <td><button onclick="removeItem(${index})" style="color:red; background:none; border:none; cursor:pointer; font-weight:bold;">✕</button></td>
            </tr>`;
    });

    if(grandTotalEl) grandTotalEl.innerText = '$' + total.toFixed(2);
    if(cartCountEl) cartCountEl.innerText = totalItems;
    localStorage.setItem('cartData', JSON.stringify(cartData));
}

// 3. Add to Cart (Called by the button in book_manipulation.js)
function addToCart(title, price, isbn) {
    const existingItem = cartData.find(item => item.isbn === isbn);
    if (existingItem) {
        existingItem.qty++;
        alert(`${title} quantity updated!`);
    } else {
        cartData.push({ isbn: isbn, title: title, price: parseFloat(price), qty: 1 });
        alert(`${title} added to cart!`);
    }
    renderCart();
}

function updateQty(index, newQty) {
    if (newQty < 1) newQty = 1;
    cartData[index].qty = parseInt(newQty);
    renderCart();
}

function removeItem(index) {
    cartData.splice(index, 1);
    renderCart();
}

function toggleCheckout() {
    const section = document.getElementById('checkout-section');
    section.style.display = section.style.display === 'block' ? 'none' : 'block';
    if(section.style.display === 'block') section.scrollIntoView({ behavior: 'smooth' });
}

async function processPayment(event) {
    event.preventDefault();
    if (cartData.length === 0) return alert("Cart is empty");

    const username = localStorage.getItem('currentUser');
    if (!username) {
        alert("Please log in to checkout.");
        window.location.href = 'login.html';
        return;
    }

    const cardNum = document.querySelector('#checkout-section input[type="text"]').value;
    const expiryInput = document.querySelector('#checkout-section input[type="month"]').value;
    if (!expiryInput) return alert("Enter expiry date");
    const [year, month] = expiryInput.split('-');
    const formattedExpiry = `${month}/${year.slice(2)}`; 

    const orderData = {
        username: username,
        creditCard: cardNum,
        expiryDate: formattedExpiry,
        items: cartData.map(item => ({ isbn: item.isbn, quantity: item.qty, price: item.price }))
    };

    try {
        const response = await fetch('/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        const result = await response.json();

        if (response.ok) {
            alert("Order placed! ID: " + result.orderId);
            cartData = [];
            localStorage.removeItem('cartData');
            renderCart();
            if(typeof showSection === 'function') showSection('orders');
            if(typeof loadOrderHistory === 'function') loadOrderHistory();
        } else {
            alert("Checkout Failed: " + result.error);
        }
    } catch (err) {
        alert("Server connection failed.");
    }
}

document.addEventListener('DOMContentLoaded', renderCart);