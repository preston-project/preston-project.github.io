// Data management
let championshipData = {
    teams: [],
    matches: [],
    currentHolder: null,
    lastUpdated: null
};

// Initialize app
function init() {
    loadData();
    setupEventListeners();
    
    if (window.location.pathname.includes('index.html')) {
        displayDashboard();
    } else if (window.location.pathname.includes('manage.html')) {
        displayManagement();
    } else if (window.location.pathname.includes('data.html')) {
        displayRawData();
    }
}

// Load saved data
function loadData() {
    const savedData = localStorage.getItem('championshipData');
    if (savedData) {
        championshipData = JSON.parse(savedData);
    }
}

// Save data to storage
function saveData() {
    localStorage.setItem('championshipData', JSON.stringify(championshipData));
    championshipData.lastUpdated = new Date().toISOString();
}

// Dashboard display
function displayDashboard() {
    updateHolderDisplay();
    updateTeamStats();
}

// Management interface
function displayManagement() {
    renderTeamList();
    renderMatchList();
    populateTeamDropdowns();
}

// Team management
function addTeam() {
    const nameInput = document.getElementById('team-name');
    const isHolderCheckbox = document.getElementById('is-holder');
    
    const newTeam = {
        id: Date.now(),
        name: nameInput.value.trim(),
        wins: 0,
        losses: 0,
        isHolder: isHolderCheckbox.checked,
        streaks: {
            longestWin: 0,
            longestLoss: 0,
            current: ""
        },
        reigns: []
    };
    
    if (newTeam.isHolder) {
        // Clear previous holder
        championshipData.teams.forEach(team => team.isHolder = false);
        championshipData.currentHolder = newTeam.id;
    }
    
    championshipData.teams.push(newTeam);
    saveData();
    nameInput.value = '';
    isHolderCheckbox.checked = false;
    renderTeamList();
    populateTeamDropdowns();
}

// Match management
function addMatch() {
    const date = document.getElementById('match-date').value;
    const homeId = parseInt(document.getElementById('home-team').value);
    const awayId = parseInt(document.getElementById('away-team').value);
    const homeScore = parseInt(document.getElementById('home-score').value);
    const awayScore = parseInt(document.getElementById('away-score').value);
    
    const preMatchHolder = championshipData.currentHolder;
    let winnerId = null;
    let postMatchHolder = preMatchHolder;
    
    if (homeScore > awayScore) {
        winnerId = homeId;
        postMatchHolder = homeId;
    } else if (awayScore > homeScore) {
        winnerId = awayId;
        postMatchHolder = awayId;
    }
    // If draw, holder remains the same
    
    const newMatch = {
        id: Date.now(),
        homeId,
        awayId,
        date,
        homeScore,
        awayScore,
        winnerId,
        preMatchHolder,
        postMatchHolder
    };
    
    processMatchResults(newMatch);
    championshipData.matches.push(newMatch);
    saveData();
    
    // Clear form
    document.getElementById('home-score').value = '';
    document.getElementById('away-score').value = '';
    
    renderMatchList();
    if (window.location.pathname.includes('index.html')) {
        displayDashboard();
    }
}

// Process match results without double-counting
function processMatchResults(match, isEdit = false) {
    const homeTeam = championshipData.teams.find(t => t.id === match.homeId);
    const awayTeam = championshipData.teams.find(t => t.id === match.awayId);
    
    // Skip if this is an edit and we've already processed
    if (!isEdit) {
        if (match.winnerId === match.homeId) {
            homeTeam.wins++;
            awayTeam.losses++;
        } else if (match.winnerId === match.awayId) {
            awayTeam.wins++;
            homeTeam.losses++;
        }
        
        updateStreaks(homeTeam, match.winnerId === match.homeId ? 'win' : 
                    (match.winnerId === match.awayId ? 'loss' : 'draw'));
        updateStreaks(awayTeam, match.winnerId === match.awayId ? 'win' : 
                    (match.winnerId === match.homeId ? 'loss' : 'draw'));
    }
    
    // Update holder status
    if (match.postMatchHolder !== match.preMatchHolder) {
        championshipData.teams.forEach(team => {
            team.isHolder = (team.id === match.postMatchHolder);
        });
        championshipData.currentHolder = match.postMatchHolder;
        
        // Record reign for new holder
        const newHolder = championshipData.teams.find(t => t.id === match.postMatchHolder);
        newHolder.reigns.push({
            start: match.date,
            end: null,
            days: 0
        });
        
        // End previous holder's reign
        if (match.preMatchHolder) {
            const prevHolder = championshipData.teams.find(t => t.id === match.preMatchHolder);
            if (prevHolder.reigns.length > 0) {
                const currentReign = prevHolder.reigns[prevHolder.reigns.length - 1];
                if (!currentReign.end) {
                    currentReign.end = match.date;
                    const startDate = new Date(currentReign.start);
                    const endDate = new Date(match.date);
                    currentReign.days = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
                }
            }
        }
    }
}

// Update streaks
function updateStreaks(team, result) {
    // ... streak calculation logic ...
}

// Edit match function
function editMatch(matchId) {
    const match = championshipData.matches.find(m => m.id === matchId);
    if (!match) return;
    
    // Revert original match effects
    revertMatchEffects(match);
    
    // Get updated values from UI
    const updatedMatch = {
        ...match,
        homeScore: parseInt(document.getElementById(`edit-home-score-${matchId}`).value),
        awayScore: parseInt(document.getElementById(`edit-away-score-${matchId}`).value)
    };
    
    // Determine new winner/holder
    if (updatedMatch.homeScore > updatedMatch.awayScore) {
        updatedMatch.winnerId = updatedMatch.homeId;
        updatedMatch.postMatchHolder = updatedMatch.homeId;
    } else if (updatedMatch.awayScore > updatedMatch.homeScore) {
        updatedMatch.winnerId = updatedMatch.awayId;
        updatedMatch.postMatchHolder = updatedMatch.awayId;
    } else {
        // Draw - holder remains pre-match holder
        updatedMatch.winnerId = null;
        updatedMatch.postMatchHolder = updatedMatch.preMatchHolder;
    }
    
    // Apply updated match effects
    processMatchResults(updatedMatch, true);
    
    // Update match in array
    const matchIndex = championshipData.matches.findIndex(m => m.id === matchId);
    championshipData.matches[matchIndex] = updatedMatch;
    saveData();
    
    renderMatchList();
    if (window.location.pathname.includes('index.html')) {
        displayDashboard();
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', init);
