// Make functions global
window.renderDashboard = function() {
    const dayNum = window.appData.history.length + 1;
    const currentCapital = window.appData.currentCapital;
    const initialCapital = window.appData.initialCapital;

    // Header User Info
    document.getElementById('dispUserName').innerText = window.appData.userName;
    document.getElementById('dispUserAge').innerText = window.appData.userAge;

    // 1. Basic Stats
    document.getElementById('dispCurrentBalance').innerText = window.formatMoney(currentCapital);
    document.getElementById('inputDayNum').innerText = dayNum;
    document.getElementById('dispDay').innerText = Math.min(dayNum, 100);
    document.getElementById('dayProgressBar').style.width = `${Math.min(dayNum, 100)}%`;
    
    // Live Target Display (Section 3)
    const liveTargetPerc = window.getTargetPercent(dayNum);
    const liveTargetAmt = currentCapital * (liveTargetPerc / 100);
    document.getElementById('currentTargetPerc').innerText = liveTargetPerc.toFixed(1) + "%";
    document.getElementById('currentTargetAmt').innerText = window.formatMoney(liveTargetAmt);

    // Total Return %
    const totalReturn = ((currentCapital - initialCapital) / initialCapital) * 100;
    const elTotalReturn = document.getElementById('dispTotalPnL');
    elTotalReturn.innerHTML = `<span class="${totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}">${totalReturn.toFixed(2)}%</span> Total Return`;

    // 2. Health Bar Logic (Consistency)
    let health = 100;
    if (window.appData.history.length > 0) {
        let recentScore = 0;
        const lookback = Math.min(window.appData.history.length, 10);
        for(let i=0; i<lookback; i++) {
            const entry = window.appData.history[window.appData.history.length - 1 - i];
            if (entry.achievedPerc >= entry.targetPerc) recentScore += 10;
            else if (entry.pnl >= 0) recentScore += 2;
            else recentScore -= 10;
        }
        health = Math.max(0, Math.min(100, 50 + recentScore));
    }

    const elHealth = document.getElementById('healthFill');
    elHealth.style.width = `${health}%`;
    if (health > 75) elHealth.className = "health-fill h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]";
    else if (health > 40) elHealth.className = "health-fill h-full bg-gradient-to-r from-yellow-600 to-yellow-400";
    else elHealth.className = "health-fill h-full bg-gradient-to-r from-red-600 to-red-500";
    
    // 4. Game Accuracy
    const successfulGames = window.appData.gameHistory.filter(g => g.isSuccess).length;
    const totalDaysAttempted = window.appData.gameHistory.length;
    const accuracy = totalDaysAttempted > 0 ? (successfulGames / totalDaysAttempted) * 100 : 0;
    document.getElementById('dispGameAccuracy').innerText = accuracy.toFixed(1) + "%";
    
    const gameStatusEl = document.getElementById('dispGameStatus');
    gameStatusEl.classList.remove('text-emerald-400', 'text-yellow-400', 'text-red-400');
    if (accuracy >= 70) {
        gameStatusEl.innerText = "Excellent Focus";
        gameStatusEl.classList.add('text-emerald-400');
    } else if (accuracy >= 40) {
        gameStatusEl.innerText = "Stable";
        gameStatusEl.classList.add('text-yellow-400');
    } else {
        gameStatusEl.innerText = "Need Practice";
        gameStatusEl.classList.add('text-red-400');
    }

    // 3. Projections
    document.getElementById('initialGoalPerc').innerText = `${window.appData.initialTargetPerc.toFixed(1)}%`;
    let initialGoalCap = window.appData.initialCapital;
    for(let i=0; i<100; i++) {
        initialGoalCap *= (1 + window.appData.initialTargetPerc / 100);
    }
    document.getElementById('initialGoal100').innerText = window.formatMoney(initialGoalCap);

    let avgDailyPerc = 0;
    if (window.appData.history.length > 0) {
        const sumPerc = window.appData.history.reduce((acc, curr) => acc + curr.achievedPerc, 0);
        avgDailyPerc = sumPerc / window.appData.history.length;
    }
    document.getElementById('dispAvgReturnPerc').innerText = avgDailyPerc.toFixed(2) + "%";
    
    const daysLeft = 100 - (dayNum - 1);

    function project(startCap, dailyPerc, days) {
        let simCap = startCap;
        for(let i=0; i<days; i++) {
            simCap = simCap * (1 + (dailyPerc/100));
        }
        return simCap;
    }
    
    const projActual = project(currentCapital, avgDailyPerc, daysLeft);
    document.getElementById('proj100Actual').innerText = window.formatMoney(projActual);

    const targetProj = project(currentCapital, window.getTargetPercent(dayNum), daysLeft);
    document.getElementById('proj100Target').innerText = window.formatMoney(targetProj);

    // Add developer credit
    addDeveloperCredit();
};

window.renderTable = function() {
    const tbody = document.getElementById('logBody');
    tbody.innerHTML = '';

    // Show in reverse order (newest first)
    [...window.appData.history].reverse().forEach(row => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-800 transition";
        
        const isProfitable = row.pnl >= 0;
        const pnlClass = isProfitable ? "text-emerald-400" : "text-red-400";
        
        const gameEntry = window.appData.gameHistory.find(g => g.day === row.day);
        let gameDisplay = '<span class="text-slate-600">N/A</span>';

        if (gameEntry) {
            const score = gameEntry.finalScore || 0;
            const attempts = gameEntry.totalAttempts || 1;
            gameDisplay = `<span class="${gameEntry.isSuccess ? 'text-emerald-400' : 'text-red-400'}">${score}/5 (${attempts})</span>`;
        }
        
        tr.innerHTML = `
            <td class="px-4 py-3 whitespace-nowrap text-slate-400">${row.date}</td>
            <td class="px-4 py-3 font-mono text-slate-300">Day ${row.day}</td>
            <td class="px-4 py-3 font-mono text-slate-500">${window.formatMoney(row.startCap)}</td>
            <td class="px-4 py-3 font-mono text-cyan-400">${row.targetPerc.toFixed(1)}%</td>
            <td class="px-4 py-3 font-mono ${row.achievedPerc >= row.targetPerc ? 'text-emerald-400 font-bold' : 'text-slate-400'}">${row.achievedPerc.toFixed(2)}%</td>
            <td class="px-4 py-3 font-mono font-bold text-right ${pnlClass}">${row.pnl > 0 ? '+' : ''}${window.formatMoney(row.pnl)}</td>
            <td class="px-4 py-3 font-mono text-white text-right font-bold">${window.formatMoney(row.endCap)}</td>
            <td class="px-4 py-3 text-center font-bold">${gameDisplay}</td>
        `;
        tbody.appendChild(tr);
    });
};

// Developer credit function
function addDeveloperCredit() {
    const existingCredit = document.querySelector('.developer-credit');
    if (existingCredit) return;
    
    const credit = document.createElement('div');
    credit.className = 'developer-credit text-center mt-8 pt-4 border-t border-slate-700';
    credit.innerHTML = `
        <p class="text-slate-500 text-sm">
            Dashboard developed by 
            <span class="text-yellow-400 font-mono">Khizar226</span> 
            - Marketing Strategist & Brand Consultant
        </p>
        <p class="text-slate-600 text-xs mt-1">
            Connect: 
            <a href="https://www.linkedin.com/in/khizar226/" target="_blank" class="text-blue-400 hover:text-blue-300">LinkedIn</a> • 
            <a href="https://www.instagram.com/khizar226" target="_blank" class="text-pink-400 hover:text-pink-300">Instagram</a>
        </p>
    `;
    
    const app = document.getElementById('app');
    app.appendChild(credit);
}