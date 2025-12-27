document.getElementById('nav-profile').addEventListener('click', loadProfileData);

function loadProfileData() {
    const userJson = localStorage.getItem('userInfo');
    if (!userJson) return; // Should not happen if logged in

    try {
        const user = JSON.parse(userJson);
        
        // Fill form fields
        if(document.getElementById('fname')) document.getElementById('fname').value = user.FirstName || '';
        if(document.getElementById('lname')) document.getElementById('lname').value = user.LastName || '';
        if(document.getElementById('username')) document.getElementById('username').value = user.Username || '';
        if(document.getElementById('email')) document.getElementById('email').value = user.Email || '';
        if(document.getElementById('phone')) document.getElementById('phone').value = user.Phone || '';
        if(document.getElementById('address')) document.getElementById('address').value = user.ShippingAddress || '';
        
    } catch (e) {
        console.error("Error parsing user info", e);
    }
}

async function saveProfile(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    
    // Gather updated data
    const updatedData = {
        username: username,
        firstName: document.getElementById('fname').value,
        lastName: document.getElementById('lname').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        shippingAddress: document.getElementById('address').value,
        password: document.getElementById('password').value // Send blank if not changing
    };

    try {
        const response = await fetch('/customer/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });

        if (response.ok) {
            alert("Profile updated successfully!");
            
            // Update LocalStorage with new data so it persists on refresh
            const currentUser = JSON.parse(localStorage.getItem('userInfo'));
            const mergedUser = { ...currentUser, 
                FirstName: updatedData.firstName,
                LastName: updatedData.lastName,
                Email: updatedData.email,
                Phone: updatedData.phone,
                ShippingAddress: updatedData.shippingAddress
            };
            localStorage.setItem('userInfo', JSON.stringify(mergedUser));

        } else {
            const err = await response.json();
            alert("Update failed: " + err.error);
        }
    } catch (error) {
        console.error("Profile save error:", error);
        alert("Failed to connect to server.");
    }
}

// 3. Logout Helper
function handleLogout() {
    localStorage.clear();
    window.location.href = 'login.html';
}