// Authentication state
let isSignUpMode = false;
let currentUser = null;

// DOM Elements
let authModal, authTitle, authSubtitle, authForm, nameField, passwordField, confirmPasswordField;
let authMessage, authButton, toggleAuth;

// Initialize auth elements when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    authModal = document.getElementById('authModal');
    authTitle = document.getElementById('authTitle');
    authSubtitle = document.getElementById('authSubtitle');
    authForm = document.getElementById('authForm');
    nameField = document.getElementById('nameField');
    passwordField = document.getElementById('passwordField');
    confirmPasswordField = document.getElementById('confirmPasswordField');
    authMessage = document.getElementById('authMessage');
    authButton = document.getElementById('authButton');
    toggleAuth = document.getElementById('toggleAuth');
    
    // Set today's date as default for start date
    document.getElementById('startDate').valueAsDate = new Date();
    
    // Check if user is already logged in
    checkExistingSession();
});

// Make functions global
window.getCurrentUser = function() {
    const userJson = localStorage.getItem('currentUser');
    return userJson ? JSON.parse(userJson) : null;
};

window.saveUserData = function(userId, data) {
    localStorage.setItem(`trading100_user_${userId}`, JSON.stringify(data));
};

window.getUserData = function(userId) {
    const dataJson = localStorage.getItem(`trading100_user_${userId}`);
    return dataJson ? JSON.parse(dataJson) : null;
};

window.handleAuth = function() {
    const email = document.getElementById('userEmail').value.trim().toLowerCase();
    
    if (!email) {
        showAuthMessage('Please enter your email address');
        return;
    }
    
    if (isSignUpMode) {
        // Sign up flow
        const name = document.getElementById('userFullName').value.trim();
        const password = document.getElementById('userPassword').value;
        const confirmPassword = document.getElementById('userConfirmPassword').value;
        
        if (!name) {
            showAuthMessage('Please enter your full name');
            return;
        }
        
        if (!password) {
            showAuthMessage('Please create a password');
            return;
        }
        
        if (password !== confirmPassword) {
            showAuthMessage('Passwords do not match');
            return;
        }
        
        if (password.length < 6) {
            showAuthMessage('Password must be at least 6 characters long');
            return;
        }
        
        // Check if user already exists
        if (getUserByEmail(email)) {
            showAuthMessage('An account with this email already exists');
            return;
        }
        
        // Create new user
        const userId = generateUserId();
        const newUser = {
            id: userId,
            email: email,
            name: name,
            password: password,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };
        
        saveUser(newUser);
        setCurrentUser(newUser);
        currentUser = newUser;
        
        // Show success message and transition to setup
        showAuthMessage('Account created successfully!', 'success');
        setTimeout(() => {
            hideAuthModal();
            document.getElementById('setupModal').classList.remove('hidden');
        }, 1500);
        
    } else {
        // Log in flow
        const password = document.getElementById('userPassword').value;
        
        if (!password) {
            showAuthMessage('Please enter your password');
            return;
        }
        
        const user = getUserByEmail(email);
        if (!user) {
            showAuthMessage('No account found with this email');
            return;
        }
        
        if (user.password !== password) {
            showAuthMessage('Invalid password');
            return;
        }
        
        // Update last login
        user.lastLogin = new Date().toISOString();
        updateUser(user);
        setCurrentUser(user);
        currentUser = user;
        
        // Show success message and transition
        showAuthMessage('Login successful!', 'success');
        setTimeout(() => {
            hideAuthModal();
            window.init();
        }, 1000);
    }
};

window.logout = function() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    location.reload();
};

window.toggleAuthMode = function() {
    isSignUpMode = !isSignUpMode;
    
    if (isSignUpMode) {
        authTitle.innerText = 'Create Your Account';
        authSubtitle.innerText = 'Sign up to start your trading challenge';
        nameField.classList.remove('hidden');
        confirmPasswordField.classList.remove('hidden');
        authButton.innerText = 'Sign Up';
        toggleAuth.innerText = 'Already have an account? Log in';
    } else {
        authTitle.innerText = 'Welcome Back';
        authSubtitle.innerText = 'Log in to continue your trading challenge';
        nameField.classList.add('hidden');
        confirmPasswordField.classList.add('hidden');
        authButton.innerText = 'Log In';
        toggleAuth.innerText = 'Don\'t have an account? Sign up';
    }
    
    // Clear any existing messages and inputs
    authMessage.classList.add('hidden');
    authMessage.innerText = '';
    document.getElementById('userPassword').value = '';
    if (isSignUpMode) {
        document.getElementById('userConfirmPassword').value = '';
    }
};

window.showProfileModal = function() {
    const currentUser = window.getCurrentUser();
    if (!currentUser) return;
    
    // Populate profile data
    document.getElementById('profileName').value = currentUser.name || '';
    document.getElementById('profileEmail').value = currentUser.email || '';
    document.getElementById('profileJoinDate').value = new Date(currentUser.createdAt).toLocaleDateString();
    
    // Calculate performance stats
    const userData = window.getUserData(currentUser.id);
    if (userData) {
        const daysCompleted = userData.history.length;
        const successRate = userData.gameHistory.length > 0 ? 
            (userData.gameHistory.filter(g => g.isSuccess).length / userData.gameHistory.length * 100) : 0;
        const totalReturn = userData.currentCapital - userData.initialCapital;
        const avgDailyReturn = userData.history.length > 0 ? 
            (userData.history.reduce((sum, day) => sum + day.achievedPerc, 0) / userData.history.length) : 0;
        
        document.getElementById('profileDaysCompleted').textContent = daysCompleted;
        document.getElementById('profileSuccessRate').textContent = successRate.toFixed(1) + '%';
        document.getElementById('profileTotalReturn').textContent = window.formatMoney(totalReturn);
        document.getElementById('profileAvgDaily').textContent = avgDailyReturn.toFixed(2) + '%';
        document.getElementById('profileProgressBar').style.width = `${daysCompleted}%`;
        document.getElementById('profileProgressText').textContent = `${daysCompleted}/100 Days`;
    }
    
    document.getElementById('profileModal').classList.remove('hidden');
};

window.updateProfile = function() {
    const currentUser = window.getCurrentUser();
    if (!currentUser) return;
    
    const newName = document.getElementById('profileName').value.trim();
    if (!newName) {
        alert('Please enter a valid name');
        return;
    }
    
    // Update user data
    currentUser.name = newName;
    updateUser(currentUser);
    setCurrentUser(currentUser);
    
    // Update app data if exists
    const userData = window.getUserData(currentUser.id);
    if (userData) {
        userData.userName = newName;
        window.saveUserData(currentUser.id, userData);
        window.appData.userName = newName;
        window.renderDashboard();
    }
    
    alert('Profile updated successfully!');
    closeProfileModal();
};

window.closeProfileModal = function() {
    document.getElementById('profileModal').classList.add('hidden');
};

// Helper functions
function checkExistingSession() {
    const user = getCurrentUser();
    if (user) {
        currentUser = user;
        hideAuthModal();
        window.init();
    } else {
        showAuthModal();
    }
}

function showAuthModal() {
    authModal.classList.remove('hidden');
    // Reset form
    document.getElementById('userEmail').value = '';
    document.getElementById('userPassword').value = '';
    document.getElementById('userFullName').value = '';
    document.getElementById('userConfirmPassword').value = '';
    authMessage.classList.add('hidden');
}

function hideAuthModal() {
    authModal.classList.add('hidden');
}

function showAuthMessage(message, type = 'error') {
    authMessage.innerText = message;
    authMessage.classList.remove('hidden');
    
    if (type === 'success') {
        authMessage.classList.remove('text-red-400');
        authMessage.classList.add('text-emerald-400');
    } else {
        authMessage.classList.remove('text-emerald-400');
        authMessage.classList.add('text-red-400');
    }
}

function generateUserId() {
    return 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

function saveUser(user) {
    const users = JSON.parse(localStorage.getItem('trading100_users') || '[]');
    users.push(user);
    localStorage.setItem('trading100_users', JSON.stringify(users));
}

function updateUser(updatedUser) {
    const users = JSON.parse(localStorage.getItem('trading100_users') || '[]');
    const index = users.findIndex(user => user.id === updatedUser.id);
    if (index !== -1) {
        users[index] = updatedUser;
        localStorage.setItem('trading100_users', JSON.stringify(users));
    }
}

function getUserByEmail(email) {
    const users = JSON.parse(localStorage.getItem('trading100_users') || '[]');
    return users.find(user => user.email.toLowerCase() === email.toLowerCase());
}

function setCurrentUser(user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
}