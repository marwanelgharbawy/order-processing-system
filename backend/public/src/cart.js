let cartData = [];

//  Add books to cart 
async function addToCart(isbn) {
    try {
        const response = await fetch(`/api/books/${isbn}`);
        const book = await response.json();

        const existingItem = cartData.find(item => item.isbn === isbn);
        if (existingItem) {
            existingItem.qty++;
        } else {
            cartData.push({
                isbn: book.ISBN, // Matches BOOK.ISBN
                title: book.Title, // Matches BOOK.Title
                price: parseFloat(book.SellingPrice), // Matches BOOK.SellingPrice
                qty: 1
            });
        }
        renderCart();
    } catch (err) {
        console.error("Cart error:", err);
    }
}

//  Checkout (Inserts into CUSTOMER_ORDER and ORDER_ITEMS)
async function processPayment(event) {
    event.preventDefault();
    if (cartData.length === 0) return alert("Cart is empty");

    const orderData = {
        // Backend will use this for CUSTOMER_ORDER.TotalPrice
        totalPrice: cartData.reduce((sum, item) => sum + (item.price * item.qty), 0),
        // Backend will loop this for ORDER_ITEMS table
        items: cartData.map(item => ({
            isbn: item.isbn,
            quantity: item.qty
        }))
    };

    try {
        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        if (response.ok) {
            alert("Order placed successfully! Stock updated via DB Triggers.");
            cartData = [];
            renderCart();
            showSection('orders');
            loadOrderHistory();
        }
    } catch (err) {
        alert("Checkout failed. Check if stock is sufficient.");
    }
}