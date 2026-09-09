document.addEventListener('DOMContentLoaded', () => {
    // Load static reports on page load
    loadTopCustomers();
    loadTopBooks();
    loadPreviousMonthSales();
});

async function loadPreviousMonthSales() {
    const display = document.getElementById('prevMonthSales');
    if (!display) return;

    try {
        const response = await fetch('/admin/reports/sales/previous-month');
        const data = await response.json();
        
        // Use a fallback to 0 and handle different possible naming from SQL
        const total = data.TotalSales || data[Object.keys(data)[0]] || 0;
        
        display.innerText = `$${Number(total).toFixed(2)}`;
    } catch (err) {
        console.error("Error fetching monthly sales:", err);
        display.innerText = "Error loading data";
    }
}

// Get Sales for a Specific Date
async function getSalesByDate() {
    const dateInput = document.getElementById('reportDate').value;
    const display = document.getElementById('salesAmountDisplay');

    if (!dateInput) {
        alert("Please select a date first.");
        return;
    }

    try {
        const response = await fetch(`/admin/reports/sales/day?date=${dateInput}`);
        const data = await response.json();

        const total = data.TotalSales || 0;
        display.innerText = `$${Number(total).toFixed(2)}`;
    } catch (err) {
        console.error("Error fetching daily sales:", err);
        display.innerText = "Error";
    }
}

// Load Top 5 Customers
async function loadTopCustomers() {
    const list = document.getElementById('topCustomersList');
    
    try {
        const response = await fetch('/admin/reports/top-customers');
        const customers = await response.json();

        list.innerHTML = ''; // Clear loading text

        if (customers.length === 0) {
            list.innerHTML = '<li>No customer data available.</li>';
            return;
        }

        customers.forEach(c => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${escapeHtml(c.CustomerUsername)}</strong> - Spent: $${Number(c.TotalSpent).toFixed(2)}`;
            list.appendChild(li);
        });
    } catch (err) {
        list.innerHTML = '<li>Error loading customers.</li>';
    }
}

// Load Top 10 Selling Books
async function loadTopBooks() {
    const tableBody = document.getElementById('topBooksTableBody');

    try {
        const response = await fetch('/admin/reports/top-books');
        const books = await response.json();

        tableBody.innerHTML = '';

        if (books.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="3">No sales data found.</td></tr>';
            return;
        }

        books.forEach((book, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${escapeHtml(book.Title)} <br><small>${escapeHtml(book.ISBN)}</small></td>
                <td>${book.TotalCopiesSold} units</td>
            `;
            tableBody.appendChild(row);
        });
    } catch (err) {
        tableBody.innerHTML = '<tr><td colspan="3">Error loading reports.</td></tr>';
    }
}


async function getReplenishmentReport() {
    const isbn = document.getElementById('replenishIsbn').value;
    if (!isbn) return alert("Enter an ISBN");

    const response = await fetch(`/admin/reports/replenishment/${encodeURIComponent(isbn)}`);
    const data = await response.json();
    
    document.getElementById('replenishResult').innerHTML = 
        `Requests placed: <strong>${data.TimesOrdered}</strong><br>
         Total quantity requested: <strong>${data.TotalQuantityRequested || 0}</strong>`;
}
