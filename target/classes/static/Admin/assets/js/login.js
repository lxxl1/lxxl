// Login page functionality
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Simulate login validation
    if (email === 'admin@music.com' && password === 'admin123') {
        // Store login status
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('adminEmail', email);
        
        // Redirect to dashboard
        window.location.href = 'index.html';
    } else {
        document.getElementById('errorAlert').style.display = 'block';
    }
});

// Check if already logged in
if (localStorage.getItem('isLoggedIn') === 'true') {
    window.location.href = 'index.html';
} 