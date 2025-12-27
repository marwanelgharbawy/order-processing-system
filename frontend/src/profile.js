// Part 2, Req 1: Edit personal information
async function saveProfile(event) {
    event.preventDefault();
    
    const profileData = {
        FirstName: document.getElementById('fname').value,
        LastName: document.getElementById('lname').value,
        Email: document.getElementById('email').value,
        Phone: document.getElementById('phone').value,
        ShippingAddress: document.getElementById('address').value,
        Password: document.getElementById('password').value
    };

    try {
        const response = await fetch('/api/customer/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileData)
        });

        if (response.ok) {
            alert("Profile updated in BookstoreDB.");
        }
    } catch (err) {
        console.error("Update error:", err);
    }
}