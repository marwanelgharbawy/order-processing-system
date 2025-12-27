const addBookForm = document.querySelector('#add_books form');

if (addBookForm) {
    addBookForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Get the authors input and split by comma
        const authorsInput = addBookForm.querySelector('input[placeholder*="Author"]').value;
        const authorsArray = authorsInput
            .split(',')
            .map(author => author.trim())
            .filter(author => author.length > 0);
        
        // Validate that at least one author is provided
        if (authorsArray.length === 0) {
            alert("Please enter at least one author.");
            return;
        }

        const newBook = {
            ISBN: addBookForm.querySelector('input[placeholder="ISBN"]').value,
            Title: addBookForm.querySelector('input[placeholder="Book Title"]').value,
            Authors: authorsArray, // Send as array
            Category: addBookForm.querySelector('select').value,
            PublicationYear: parseInt(addBookForm.querySelector('input[placeholder="Publication Year"]').value),
            SellingPrice: parseFloat(addBookForm.querySelector('input[placeholder="Selling Price"]').value),
            Threshold: parseInt(addBookForm.querySelector('input[placeholder="Minimum Threshold"]').value),
            PublisherName: addBookForm.querySelector('input[placeholder="Publisher"]').value,
            StockQuantity: 0
        };

        console.log("Submitting book with authors:", newBook.Authors); // Debug log

        try {
            const response = await fetch('/books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newBook)
            });

            if (response.ok) {
                alert("Book added successfully!");
                addBookForm.reset();
            } else {
                const error = await response.json();
                alert("Error: " + error.error);
            }
        } catch (err) {
            console.error("Submission failed", err);
            alert("Failed to add book. Please try again.");
        }
    });
}

async function updateBookStock(isbn, inputElement) {
    const updatedBook = {
        Title: document.getElementById(`edit-title-${isbn}`).value,
        SellingPrice: parseFloat(document.getElementById(`edit-price-${isbn}`).value),
        StockQuantity: parseInt(document.getElementById(`edit-stock-${isbn}`).value),
        Threshold: parseInt(document.getElementById(`edit-threshold-${isbn}`).value)
    };

    try {
        const response = await fetch(`/books/${isbn}`, {
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedBook) 
        });

        if (response.ok) {
            alert("Book updated successfully!");
        }
    } catch (err) {
        console.error("Update failed", err);
    }
}

async function updateBook(isbn) {
    // 1. Grab the row containing this ISBN
    // In a real app, you'd use IDs or better selectors
    const row = document.querySelector(`tr[data-isbn="${isbn}"]`);
    const newTitle = row.querySelector('.title-input').value;
    const newStock = row.querySelector('.stock-input').value;
    const newPrice = row.querySelector('.price-input').value;

    try {
        const response = await fetch(`/books/${isbn}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: newTitle,
                stockQuantity: parseInt(newStock),
                sellingPrice: parseFloat(newPrice)
            })
        });

        if (response.ok) {
            alert("Book updated successfully!");
        } else {
            const err = await response.json();
            alert("Update failed: " + err.error);
        }
    } catch (error) {
        console.error("Error updating book:", error);
    }
}