// --- Daily Quiz Logic ---
const QUIZ_DURATION = 10; // seconds

// Make functions global
window.showQuizModal = function() {
    const currentDayNum = window.appData.history.length + 1;
    
    // Check if game is already successfully completed for today
    const gameEntry = window.appData.gameHistory.find(g => g.day === currentDayNum);
    if (gameEntry && gameEntry.isSuccess) {
        return; // Do nothing if already done
    }
    if (currentDayNum > 100) return;

    // Reset UI for fresh attempt
    document.getElementById('quizAnswer').value = '';
    document.getElementById('quizAnswer').disabled = false;
    document.getElementById('quizTimer').innerText = `${QUIZ_DURATION}s`;
    document.getElementById('quizQuestion').classList.remove('text-red-400', 'text-emerald-400');
    document.getElementById('quizMessage').classList.add('hidden');
    document.getElementById('quizSubmitBtn').classList.remove('hidden');
    document.getElementById('quizRetryBtn').classList.add('hidden');
    document.getElementById('quizCloseBtn').classList.add('hidden');
    document.getElementById('quizModal').classList.remove('hidden');
    
    // Determine attempt count
    window.currentDayAttemptCount = (gameEntry?.totalAttempts || 0) + 1;
    document.getElementById('quizAttemptCount').innerText = window.currentDayAttemptCount;
    
    window.currentQuiz = generateQuizQuestion();
    document.getElementById('quizQuestion').innerText = window.currentQuiz.question;
    
    window.quizStartTime = Date.now();
    document.getElementById('quizAnswer').focus();

    let timeLeft = QUIZ_DURATION;
    document.getElementById('quizTimer').innerText = `${timeLeft}s`;

    window.quizTimerId = setInterval(() => {
        timeLeft--;
        document.getElementById('quizTimer').innerText = `${timeLeft}s`;
        if (timeLeft <= 0) {
            clearInterval(window.quizTimerId);
            handleQuizFailure('Time out! You must answer faster.');
        }
    }, 1000);
};

window.checkQuizAnswer = function() {
    if (!window.currentQuiz) return;
    clearInterval(window.quizTimerId);
    const userAnswer = parseInt(document.getElementById('quizAnswer').value);
    
    if (!isNaN(userAnswer) && userAnswer === window.currentQuiz.answer) {
        // SUCCESS
        document.getElementById('quizAnswer').disabled = true;
        document.getElementById('quizQuestion').classList.add('text-emerald-400');
        document.getElementById('quizMessage').innerText = "Correct! Focus verified.";
        document.getElementById('quizMessage').classList.remove('hidden');
        document.getElementById('quizSubmitBtn').classList.add('hidden');
        document.getElementById('quizRetryBtn').classList.add('hidden');
        document.getElementById('quizCloseBtn').classList.remove('hidden');
        
        recordQuizResult(true, 5); // 5/5 score on success
        // Automatic close after 1 second
        setTimeout(() => { closeQuizModal(); }, 1000);

    } else {
        // FAILURE
        const message = `Incorrect. The correct answer was ${window.currentQuiz.answer}.`;
        handleQuizFailure(message);
        recordQuizResult(false, 0); // 0/5 score on failure
    }
};

window.retryQuiz = function() {
    // Simply re-show the modal, which increments the attempt count
    window.showQuizModal();
};

window.closeQuizModal = function() {
    clearInterval(window.quizTimerId);
    document.getElementById('quizModal').classList.add('hidden');
};

// Helper functions
function generateQuizQuestion() {
    const num1 = Math.floor(Math.random() * 50) + 10;
    const num2 = Math.floor(Math.random() * 50) + 10;
    const operator = Math.random() < 0.5 ? '+' : '-';
    
    let question, answer;
    if (operator === '+') {
        question = `${num1} ${operator} ${num2}`;
        answer = num1 + num2;
    } else {
        const large = Math.max(num1, num2);
        const small = Math.min(num1, num2);
        question = `${large} - ${small}`;
        answer = large - small;
    }

    return { question, answer };
}

function handleQuizFailure(message) {
    document.getElementById('quizAnswer').disabled = true;
    document.getElementById('quizQuestion').classList.add('text-red-400');
    document.getElementById('quizMessage').innerText = message;
    document.getElementById('quizMessage').classList.remove('hidden');
    document.getElementById('quizSubmitBtn').classList.add('hidden');
    document.getElementById('quizRetryBtn').classList.remove('hidden');
    document.getElementById('quizCloseBtn').classList.remove('hidden');
}

function recordQuizResult(isSuccess, finalScore) {
    const currentDayNum = window.appData.history.length + 1;
    let dateObj = new Date(window.appData.startDate);
    dateObj.setDate(dateObj.getDate() + (currentDayNum - 1));

    // Find existing entry for today
    const existingIndex = window.appData.gameHistory.findIndex(g => g.day === currentDayNum);
    
    const newEntry = {
        day: currentDayNum,
        date: dateObj.toISOString().split('T')[0],
        finalScore: isSuccess ? finalScore : 0,
        totalAttempts: window.currentDayAttemptCount,
        isSuccess: isSuccess
    };

    if (existingIndex !== -1) {
        window.appData.gameHistory[existingIndex] = newEntry;
    } else {
        window.appData.gameHistory.push(newEntry);
    }

    // Save user data
    const currentUser = window.getCurrentUser();
    if (currentUser) {
        window.saveUserData(currentUser.id, window.appData);
    }
    
    window.renderDashboard();
    window.updateGameStatus(currentDayNum, isSuccess);
}