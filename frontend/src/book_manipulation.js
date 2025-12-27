const addBookForm = document.querySelector('#add_books form');

if (addBookForm) {
    addBookForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newBook = {
            ISBN: addBookForm.querySelector('input[placeholder="ISBN"]').value,
            Title: addBookForm.querySelector('input[placeholder="Book Title"]').value,
            Category: addBookForm.querySelector('select').value,
            PublicationYear: parseInt(addBookForm.querySelector('input[placeholder="Publication Year"]').value),
            SellingPrice: parseFloat(addBookForm.querySelector('input[placeholder="Selling Price"]').value),
            Threshold: parseInt(addBookForm.querySelector('input[placeholder="Minimum Threshold"]').value),
            PublisherName: addBookForm.querySelector('input[placeholder="Publisher"]').value,
            StockQuantity: 0
        };

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