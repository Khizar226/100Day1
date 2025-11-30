// --- Global State Management ---
window.appData = {
    userName: '',
    userAge: 0,
    initialCapital: 0,
    initialTargetPerc: 0,
    startDate: null,
    currentCapital: 0,
    history: [],
    gameHistory: []
};

window.currentQuiz = null;
window.quizTimerId = null;
window.quizStartTime = 0;
window.currentDayAttemptCount = 0;

// --- Utility Functions ---
window.formatMoney = function(num) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
};

window.getTargetPercent = function(dayNum) {
    let basePerc = window.appData.initialTargetPerc;
    if (dayNum > 80) {
        const daysOver = dayNum - 80;
        basePerc -= (daysOver * 0.05); 
    }
    return Math.max(0.5, basePerc);
};

window.updateGameStatus = function(currentDayNum, isSuccessful) {
    const gameStatusIndicator = document.getElementById('gameStatusIndicator');
    const submitDayBtn = document.getElementById('submitDayBtn');
    
    if (currentDayNum > 100) {
        gameStatusIndicator.innerText = "Challenge Complete!";
        gameStatusIndicator.classList.remove('bg-red-800/50', 'bg-emerald-800/50', 'text-red-300', 'border-red-700');
        gameStatusIndicator.classList.add('bg-slate-700/50', 'text-slate-400', 'border-slate-600');
        submitDayBtn.disabled = true;
        return;
    }

    if (!isSuccessful) {
        gameStatusIndicator.innerHTML = '<i class="fas fa-exclamation-triangle mr-2"></i> Prequiz Required! Click to start.';
        gameStatusIndicator.classList.remove('bg-emerald-800/50', 'text-emerald-300', 'border-emerald-700');
        gameStatusIndicator.classList.add('bg-red-800/50', 'text-red-300', 'border-red-700');
        submitDayBtn.disabled = true;
    } else {
        const attempts = window.appData.gameHistory.find(g => g.day === currentDayNum)?.totalAttempts || 1;
        gameStatusIndicator.innerHTML = `<i class="fas fa-check-circle mr-2"></i> Prequiz Complete (Attempt ${attempts}). Log Results.`;
        gameStatusIndicator.classList.remove('bg-red-800/50', 'text-red-300', 'border-red-700');
        gameStatusIndicator.classList.add('bg-emerald-800/50', 'text-emerald-300', 'border-emerald-700');
        submitDayBtn.disabled = false;
    }
};

// --- Core Logic ---
window.init = function() {
    const currentUser = window.getCurrentUser();
    
    if (currentUser) {
        const userData = window.getUserData(currentUser.id);
        if (userData) {
            window.appData = userData;
            document.getElementById('setupModal').classList.add('hidden');
            document.getElementById('app').classList.remove('hidden');
            
            const currentDayNum = window.appData.history.length + 1;
            const lastGameDay = window.appData.gameHistory.length > 0 ? window.appData.gameHistory[window.appData.gameHistory.length - 1].day : 0;
            const isGameSuccess = window.appData.gameHistory.length > 0 && window.appData.gameHistory[window.appData.gameHistory.length - 1].day === currentDayNum && window.appData.gameHistory[window.appData.gameHistory.length - 1].isSuccess;

            window.updateGameStatus(currentDayNum, isGameSuccess);

            window.renderDashboard();
            window.renderTable();
        } else {
            document.getElementById('setupModal').classList.remove('hidden');
            document.getElementById('initialTargetPerc').addEventListener('input', updateSetupProjection);
            document.getElementById('initCapital').addEventListener('input', updateSetupProjection);
        }
    }
};

window.startChallenge = function() {
    const caps = parseFloat(document.getElementById('initCapital').value);
    const date = document.getElementById('startDate').value;
    const name = document.getElementById('userName').value.trim();
    const age = parseInt(document.getElementById('userAge').value);
    const initialPerc = parseFloat(document.getElementById('initialTargetPerc').value);

    if (!caps || !date || name === '' || isNaN(age) || isNaN(initialPerc)) {
        return alert("Please fill all required fields correctly (Capital, Name, Age, Target %, Start Date).");
    }

    window.appData.initialCapital = caps;
    window.appData.currentCapital = caps;
    window.appData.startDate = date;
    window.appData.userName = name;
    window.appData.userAge = age;
    window.appData.initialTargetPerc = initialPerc;
    window.appData.history = [];
    window.appData.gameHistory = [];
    window.currentDayAttemptCount = 0;
    
    // Save user data
    const currentUser = window.getCurrentUser();
    if (currentUser) {
        window.saveUserData(currentUser.id, window.appData);
        
        // Update user name if different
        if (currentUser.name !== name) {
            currentUser.name = name;
            window.updateUser(currentUser);
            window.setCurrentUser(currentUser);
        }
    }
    
    document.getElementById('setupModal').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    window.renderDashboard();
    window.renderTable();
};

window.submitDay = function() {
    const pnl = parseFloat(document.getElementById('dailyPnL').value);
    const trades = parseInt(document.getElementById('dailyTrades').value) || 0;
    const currentDayNum = window.appData.history.length + 1;
    
    // Check Prequiz Status before submitting
    const isGameSuccess = window.appData.gameHistory.length > 0 && window.appData.gameHistory[window.appData.gameHistory.length - 1].day === currentDayNum && window.appData.gameHistory[window.appData.gameHistory.length - 1].isSuccess;
    
    if (!isGameSuccess) {
        const messageBox = document.createElement('div');
        messageBox.innerHTML = '<p class="text-red-400 font-semibold">ERROR: Please successfully complete the Daily Focus Challenge before logging results for Day ' + currentDayNum + '</p>';
        messageBox.className = 'fixed top-4 right-4 bg-slate-800 p-4 rounded-lg shadow-xl z-50 border border-red-700 transition duration-300 transform scale-100';
        document.body.appendChild(messageBox);
        setTimeout(() => { document.body.removeChild(messageBox); }, 3000);
        return; 
    }
    if (isNaN(pnl)) {
        const messageBox = document.createElement('div');
        messageBox.innerHTML = '<p class="text-red-400 font-semibold">ERROR: Please enter a valid P&L amount.</p>';
        messageBox.className = 'fixed top-4 right-4 bg-slate-800 p-4 rounded-lg shadow-xl z-50 border border-red-700 transition duration-300 transform scale-100';
        document.body.appendChild(messageBox);
        setTimeout(() => { document.body.removeChild(messageBox); }, 3000);
        return; 
    }
    if (currentDayNum > 100) {
        const messageBox = document.createElement('div');
        messageBox.innerHTML = '<p class="text-yellow-400 font-semibold">Challenge complete! Cannot log more days.</p>';
        messageBox.className = 'fixed top-4 right-4 bg-slate-800 p-4 rounded-lg shadow-xl z-50 border border-yellow-700 transition duration-300 transform scale-100';
        document.body.appendChild(messageBox);
        setTimeout(() => { document.body.removeChild(messageBox); }, 3000);
        return; 
    }

    // Calculate Date
    let dateObj = new Date(window.appData.startDate);
    dateObj.setDate(dateObj.getDate() + (currentDayNum - 1));
    
    const startCap = window.appData.currentCapital;
    const targetPerc = window.getTargetPercent(currentDayNum);
    const targetAmt = startCap * (targetPerc / 100);
    
    const achievedPerc = (pnl / startCap) * 100;
    const endCap = startCap + pnl;

    // Update State
    window.appData.currentCapital = endCap;
    window.appData.history.push({
        day: currentDayNum,
        date: dateObj.toISOString().split('T')[0],
        startCap: startCap,
        targetPerc: targetPerc,
        targetAmt: targetAmt,
        achievedPerc: achievedPerc,
        pnl: pnl,
        endCap: endCap,
        trades: trades
    });

    // Prepare for next day
    window.currentDayAttemptCount = 0;
    document.getElementById('dailyPnL').value = '';
    document.getElementById('dailyTrades').value = '';

    // Save user data
    const currentUser = window.getCurrentUser();
    if (currentUser) {
        window.saveUserData(currentUser.id, window.appData);
    }
    
    window.renderDashboard();
    window.renderTable();
    
    // Update game status for the next day (which is always 'Required' now)
    window.updateGameStatus(currentDayNum + 1, false);
};

window.confirmReset = function() {
     const result = window.confirm("Are you sure? This will wipe all progress.");
     if(result) {
        const currentUser = window.getCurrentUser();
        if (currentUser) {
            localStorage.removeItem(`trading100_user_${currentUser.id}`);
        }
        location.reload();
     }
};

window.exportData = function() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Day,Start Capital,Target %,Achieved %,PnL,End Capital,Trades,Game Score,Total Attempts,Game Success\n";
    
    window.appData.history.forEach((row) => {
        const gameEntry = window.appData.gameHistory.find(g => g.day === row.day) || {};
        const score = gameEntry.finalScore !== undefined ? gameEntry.finalScore : 'N/A';
        const attempts = gameEntry.totalAttempts !== undefined ? gameEntry.totalAttempts : 'N/A';
        const success = gameEntry.isSuccess !== undefined ? (gameEntry.isSuccess ? 'Y' : 'N') : 'N/A';
        
        let rowStr = `${row.date},${row.day},${row.startCap.toFixed(2)},${row.targetPerc.toFixed(2)},${row.achievedPerc.toFixed(2)},${row.pnl.toFixed(2)},${row.endCap.toFixed(2)},${row.trades},${score},${attempts},${success}`;
        csvContent += rowStr + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${window.appData.userName.replace(/\s/g, '_')}_trading_challenge_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// Helper functions
function updateSetupProjection() {
    const capital = parseFloat(document.getElementById('initCapital').value) || 0;
    const targetPerc = parseFloat(document.getElementById('initialTargetPerc').value) || 0;
    
    if (capital > 0 && targetPerc > 0) {
        let projectedCap = capital;
        for(let i = 0; i < 100; i++) {
            projectedCap *= (1 + targetPerc / 100);
        }
        document.getElementById('initialProjectionDisplay').innerText = window.formatMoney(projectedCap);
    } else {
        document.getElementById('initialProjectionDisplay').innerText = '$0.00';
    }
}

// Developer signature
console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   100-Day Trading Challenge Dashboard            ║
║   Developed by Khizar Hayat (Khizar226)          ║
║   Marketing Strategist & Brand Consultant        ║
║   https://www.linkedin.com/in/khizar226/         ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
`);

// Display floating signature
function displayDeveloperSignature() {
    const signature = document.createElement('div');
    signature.innerHTML = `
        <div class="fixed bottom-4 right-4 bg-slate-800/90 border border-slate-600 rounded-lg p-3 text-xs text-slate-400 z-40 shadow-lg">
            <div class="flex items-center gap-2">
                <span class="text-yellow-400 font-mono">Khizar226</span>
                <span class="text-slate-500">|</span>
                <span>Developer</span>
            </div>
        </div>
    `;
    document.body.appendChild(signature);
}

// Add signature display to init
const originalInit = window.init;
window.init = function() {
    originalInit();
    displayDeveloperSignature();
};

// Make updateUser function global
window.updateUser = function(updatedUser) {
    const users = JSON.parse(localStorage.getItem('trading100_users') || '[]');
    const index = users.findIndex(user => user.id === updatedUser.id);
    if (index !== -1) {
        users[index] = updatedUser;
        localStorage.setItem('trading100_users', JSON.stringify(users));
    }
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set today's date as default for start date
    document.getElementById('startDate').valueAsDate = new Date();
});