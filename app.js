// Global data variable
let championshipData = {
    teams: [],
    matches: [],
    currentChampion: null,
    lastMatchDate: null
};

// DOM Content Loaded event
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    
    // Page-specific initialization
    if (document.getElementById('home-team')) {
        initializeInputPage();
    } else if (document.getElementById('team-stats')) {
        initializeDisplayPage();
    } else if (document.getElementById('json-data')) {
        displayRawData();
    }
});

// Load data from localStorage or initialize
function loadData() {
    const savedData = localStorage.getItem('championshipData');
    if (savedData) {
        championshipData = JSON.parse(savedData);
    } else {
        // Initialize with some sample data if none exists
        championshipData = {
            teams: [
                {
                    id: 1,
                    name: "Initial Champion",
                    wins: 0,
                    losses: 0,
                    currentHolder: true,
                    streaks: {
                        longestWinning: 0,
                        longestLosing: 0,
                        current: ""
                    },
                    holdingHistory: []
                }
            ],
            matches: [],
            currentChampion: 1,
            lastMatchDate: null
        };
        saveData();
    }
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('championshipData', JSON.stringify(championshipData));
}

// Initialize input page
function initializeInputPage() {
    populateTeamDropdowns();
}

// Populate team dropdowns
function populateTeamDropdowns() {
    const homeTeamSelect = document.getElementById('home-team');
    const awayTeamSelect = document.getElementById('away-team');
    
    // Clear existing options
    homeTeamSelect.innerHTML = '';
    awayTeamSelect.innerHTML = '';
    
    // Add teams to dropdowns
    championshipData.teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team.id;
        option.textContent = team.name;
        homeTeamSelect.appendChild(option.cloneNode(true));
        awayTeamSelect.appendChild(option);
    });
}

// Add a new team
function addTeam() {
    const teamNameInput = document.getElementById('team-name');
    const name = teamNameInput.value.trim();
    
    if (!name) {
        alert('Please enter a team name');
        return;
    }
    
    // Create new team
    const newTeam = {
        id: championshipData.teams.length > 0 ? 
            Math.max(...championshipData.teams.map(t => t.id)) + 1 : 1,
        name: name,
        wins: 0,
        losses: 0,
        currentHolder: false,
        streaks: {
            longestWinning: 0,
            longestLosing: 0,
            current: ""
        },
        holdingHistory: []
    };
    
    championshipData.teams.push(newTeam);
    saveData();
    teamNameInput.value = '';
    populateTeamDropdowns();
    alert(`Team "${name}" added successfully!`);
}

// Add a new match
function addMatch() {
    const date = document.getElementById('match-date').value;
    const homeTeamId = parseInt(document.getElementById('home-team').value);
    const awayTeamId = parseInt(document.getElementById('away-team').value);
    const homeScore = parseInt(document.getElementById('home-score').value);
    const awayScore = parseInt(document.getElementById('away-score').value);
    
    // Validate inputs
    if (!date || isNaN(homeTeamId) || isNaN(awayTeamId) || isNaN(homeScore) || isNaN(awayScore)) {
        alert('Please fill all fields with valid values');
        return;
    }
    
    if (homeTeamId === awayTeamId) {
        alert('Home and away teams cannot be the same');
        return;
    }
    
    // Determine winner
    let winnerId = null;
    if (homeScore > awayScore) {
        winnerId = homeTeamId;
    } else if (awayScore > homeScore) {
        winnerId = awayTeamId;
    }
    
    // Get current champion before the match
    const championBefore = championshipData.currentChampion;
    
    // Determine champion after the match
    let championAfter = championBefore;
    if (winnerId) {
        championAfter = winnerId;
    }
    // If draw, champion remains the same
    
    // Create new match
    const newMatch = {
        id: championshipData.matches.length > 0 ? 
            Math.max(...championshipData.matches.map(m => m.id)) + 1 : 1,
        homeTeamId: homeTeamId,
        awayTeamId: awayTeamId,
        date: date,
        homeScore: homeScore,
        awayScore: awayScore,
        winnerId: winnerId,
        championBefore: championBefore,
        championAfter: championAfter
    };
    
    // Update teams' stats
    updateTeamStats(homeTeamId, awayTeamId, winnerId, championBefore, championAfter, date);
    
    // Add match to data
    championshipData.matches.push(newMatch);
    championshipData.currentChampion = championAfter;
    championshipData.lastMatchDate = date;
    
    saveData();
    
    // Clear form
    document.getElementById('match-date').value = '';
    document.getElementById('home-score').value = '';
    document.getElementById('away-score').value = '';
    
    alert('Match added successfully!');
}

// Update team statistics
function updateTeamStats(homeTeamId, awayTeamId, winnerId, championBefore, championAfter, date) {
    const homeTeam = championshipData.teams.find(t => t.id === homeTeamId);
    const awayTeam = championshipData.teams.find(t => t.id === awayTeamId);
    
    // Update wins/losses
    if (winnerId === homeTeamId) {
        homeTeam.wins++;
        awayTeam.losses++;
        
        // Update streaks
        updateStreak(homeTeam, 'win');
        updateStreak(awayTeam, 'loss');
    } else if (winnerId === awayTeamId) {
        awayTeam.wins++;
        homeTeam.losses++;
        
        // Update streaks
        updateStreak(awayTeam, 'win');
        updateStreak(homeTeam, 'loss');
    } else {
        // Draw - update streaks as loss for both?
        updateStreak(homeTeam, 'draw');
        updateStreak(awayTeam, 'draw');
    }
    
    // Update champion status
    championshipData.teams.forEach(team => {
        team.currentHolder = (team.id === championAfter);
    });
    
    // Update holding history for new champion if changed
    if (championAfter !== championBefore) {
        // End previous champion's reign
        if (championBefore) {
            const prevChamp = championshipData.teams.find(t => t.id === championBefore);
            if (prevChamp.holdingHistory.length > 0) {
                const currentReign = prevChamp.holdingHistory[prevChamp.holdingHistory.length - 1];
                if (!currentReign.endDate) {
                    currentReign.endDate = date;
                    const startDate = new Date(currentReign.startDate);
                    const endDate = new Date(date);
                    currentReign.daysHeld = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
                }
            }
        }
        
        // Start new champion's reign
        const newChamp = championshipData.teams.find(t => t.id === championAfter);
        newChamp.holdingHistory.push({
            startDate: date,
            endDate: null,
            daysHeld: 0
        });
    }
}

// Update team streak
function updateStreak(team, result) {
    let current = team.streaks.current || '';
    
    if (result === 'win') {
        if (current.startsWith('W')) {
            const count = parseInt(current.substring(1)) + 1;
            team.streaks.current = `W${count}`;
            if (count > team.streaks.longestWinning) {
                team.streaks.longestWinning = count;
            }
        } else {
            team.streaks.current = 'W1';
            if (team.streaks.longestWinning < 1) {
                team.streaks.longestWinning = 1;
            }
        }
    } else if (result === 'loss') {
        if (current.startsWith('L')) {
            const count = parseInt(current.substring(1)) + 1;
            team.streaks.current = `L${count}`;
            if (count > team.streaks.longestLosing) {
                team.streaks.longestLosing = count;
            }
        } else {
            team.streaks.current = 'L1';
            if (team.streaks.longestLosing < 1) {
                team.streaks.longestLosing = 1;
            }
        }
    } else {
        // Draw - reset streaks?
        team.streaks.current = '';
    }
}

// Initialize display page
function initializeDisplayPage() {
    updateCurrentChampion();
    displayTeamStats();
    displayOnThisDay();
}

// Update current champion display
function updateCurrentChampion() {
    const champion = championshipData.currentChampion ? 
        championshipData.teams.find(t => t.id === championshipData.currentChampion) : null;
    
    const championNameEl = document.getElementById('champion-name');
    const holdingSinceEl = document.getElementById('holding-since');
    
    if (champion) {
        championNameEl.textContent = champion.name;
        
        // Find current reign
        const currentReign = champion.holdingHistory.find(r => !r.endDate);
        if (currentReign) {
            holdingSinceEl.textContent = formatDate(currentReign.startDate);
        } else {
            holdingSinceEl.textContent = 'Unknown';
        }
    } else {
        championNameEl.textContent = 'None';
        holdingSinceEl.textContent = '-';
    }
}

// Display team statistics
function displayTeamStats() {
    const container = document.getElementById('team-stats');
    container.innerHTML = '';
    
    championshipData.teams.forEach(team => {
        const card = document.createElement('div');
        card.className = `team-card ${team.currentHolder ? 'holder' : ''}`;
        
        // Find current/longest reign
        let longestReign = 0;
        let currentReignDays = 0;
        
        team.holdingHistory.forEach(reign => {
            if (reign.daysHeld > longestReign) {
                longestReign = reign.daysHeld;
            }
            if (!reign.endDate) {
                const today = new Date();
                const startDate = new Date(reign.startDate);
                currentReignDays = Math.round((today - startDate) / (1000 * 60 * 60 * 24));
            }
        });
        
        card.innerHTML = `
            <h3>${team.name} ${team.currentHolder ? '👑' : ''}</h3>
            <p>Record: ${team.wins}-${team.losses}</p>
            <p>Current Streak: ${team.streaks.current || 'None'}</p>
            <p>Longest Win Streak: ${team.streaks.longestWinning}</p>
            <p>Longest Loss Streak: ${team.streaks.longestLosing}</p>
            ${team.holdingHistory.length > 0 ? `
                <p>Longest Reign: ${longestReign} days</p>
                ${team.currentHolder ? `<p>Current Reign: ${currentReignDays} days</p>` : ''}
            ` : ''}
        `;
        
        container.appendChild(card);
    });
}

// Display "On This Day" events
function displayOnThisDay() {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const formattedToday = `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    const container = document.getElementById('on-this-day');
    container.innerHTML = '<h3>Matches on this day in history:</h3>';
    
    const matchesOnThisDay = championshipData.matches.filter(match => {
        const matchDate = new Date(match.date);
        return (matchDate.getMonth() + 1 === month && matchDate.getDate() === day);
    });
    
    if (matchesOnThisDay.length === 0) {
        container.innerHTML += '<p>No matches occurred on this day in history.</p>';
        return;
    }
    
    const list = document.createElement('ul');
    matchesOnThisDay.forEach(match => {
        const homeTeam = championshipData.teams.find(t => t.id === match.homeTeamId);
        const awayTeam = championshipData.teams.find(t => t.id === match.awayTeamId);
        const year = new Date(match.date).getFullYear();
        
        const item = document.createElement('li');
        item.textContent = `${year}: ${homeTeam.name} ${match.homeScore}-${match.awayScore} ${awayTeam.name}`;
        
        if (match.winnerId) {
            const winner = match.winnerId === match.homeTeamId ? homeTeam : awayTeam;
            item.textContent += ` (${winner.name} won)`;
            
            if (match.championBefore !== match.championAfter) {
                const newChamp = championshipData.teams.find(t => t.id === match.championAfter);
                item.textContent += ` - ${newChamp.name} became champion!`;
            }
        } else {
            item.textContent += ' (Draw)';
        }
        
        list.appendChild(item);
    });
    
    container.appendChild(list);
}

// Display raw JSON data
function displayRawData() {
    const container = document.getElementById('json-data');
    container.textContent = JSON.stringify(championshipData, null, 2);
}

// Refresh data on data.html
function refreshData() {
    loadData();
    displayRawData();
}

// Tab switching on input page
function openTab(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Deactivate all tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Activate selected tab
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// Helper function to format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}
