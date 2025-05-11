// Championship Data Structure
let championshipData = {
    teams: [],
    matches: [],
    currentHolder: null,
    lastUpdated: null
};

// Initialize Data
function initData() {
    const savedData = localStorage.getItem('championshipData');
    if (savedData) {
        championshipData = JSON.parse(savedData);
    } else {
        // Initialize with default data if none exists
        championshipData = {
            teams: [],
            matches: [],
            currentHolder: null,
            lastUpdated: new Date().toISOString()
        };
        saveData();
    }
}

// Save Data to LocalStorage
function saveData() {
    championshipData.lastUpdated = new Date().toISOString();
    localStorage.setItem('championshipData', JSON.stringify(championshipData));
    
    // Dispatch event to notify other tabs
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('championshipDataUpdated'));
    }
}

// Dashboard Functions
function initDashboard() {
    initData();
    updateDashboard();
    
    // Listen for data changes from other tabs
    window.addEventListener('championshipDataUpdated', updateDashboard);
}

function updateDashboard() {
    updateCurrentHolder();
    updateTeamStats();
    updateRecentMatches();
}

function updateCurrentHolder() {
    const holderContainer = document.getElementById('current-holder');
    if (!holderContainer) return;
    
    const holderName = document.getElementById('holder-name');
    const holderSince = document.getElementById('holder-since');
    
    if (championshipData.currentHolder) {
        const holder = championshipData.teams.find(t => t.id === championshipData.currentHolder);
        if (holder) {
            holderName.textContent = holder.name;
            
            // Find current reign
            const currentReign = holder.reigns.find(r => !r.end);
            if (currentReign) {
                const startDate = new Date(currentReign.start);
                holderSince.textContent = `Holding since: ${startDate.toLocaleDateString()}`;
            } else {
                holderSince.textContent = 'Holding since: Unknown';
            }
            return;
        }
    }
    
    holderName.textContent = 'No current holder';
    holderSince.textContent = '';
}

function updateTeamStats() {
    const container = document.getElementById('team-stats');
    if (!container) return;
    
    container.innerHTML = '';
    
    championshipData.teams.forEach(team => {
        const card = document.createElement('div');
        card.className = `team-card ${team.isHolder ? 'holder' : ''}`;
        
        // Calculate longest reign
        let longestReign = 0;
        if (team.reigns.length > 0) {
            longestReign = Math.max(...team.reigns.map(r => r.days || 0));
        }
        
        // Calculate current streak
        let streakText = 'No streak';
        if (team.streaks.current) {
            const type = team.streaks.current.startsWith('W') ? 'Winning' : 'Losing';
            const count = team.streaks.current.substring(1);
            streakText = `${type} streak: ${count}`;
        }
        
        card.innerHTML = `
            <h3>${team.name} ${team.isHolder ? '🏆' : ''}</h3>
            <p><strong>Record:</strong> ${team.wins}-${team.losses}</p>
            <p><strong>Current Streak:</strong> ${streakText}</p>
            <p><strong>Longest Win Streak:</strong> ${team.streaks.longestWin}</p>
            <p><strong>Longest Loss Streak:</strong> ${team.streaks.longestLoss}</p>
            ${team.reigns.length > 0 ? `
                <p><strong>Longest Reign:</strong> ${longestReign} days</p>
            ` : ''}
        `;
        
        container.appendChild(card);
    });
}

function updateRecentMatches() {
    const tableBody = document.querySelector('#recent-matches tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    // Sort matches by date (newest first)
    const sortedMatches = [...championshipData.matches].sort((a, b) => 
        new Date(b.date) - new Date(a.date));
    
    // Show last 10 matches
    const recentMatches = sortedMatches.slice(0, 10);
    
    recentMatches.forEach(match => {
        const homeTeam = championshipData.teams.find(t => t.id === match.homeId);
        const awayTeam = championshipData.teams.find(t => t.id === match.awayId);
        const champion = championshipData.teams.find(t => t.id === match.postMatchHolder);
        
        if (!homeTeam || !awayTeam || !champion) return;
        
        const row = document.createElement('tr');
        
        // Determine result class
        let resultClass = '';
        let resultText = '';
        if (match.winnerId === match.homeId) {
            resultClass = 'text-success';
            resultText = `${homeTeam.name} won`;
        } else if (match.winnerId === match.awayId) {
            resultClass = 'text-success';
            resultText = `${awayTeam.name} won`;
        } else {
            resultClass = 'text-warning';
            resultText = 'Draw';
        }
        
        // Check if championship changed
        const champChanged = match.preMatchHolder !== match.postMatchHolder;
        
        row.innerHTML = `
            <td>${new Date(match.date).toLocaleDateString()}</td>
            <td>${homeTeam.name} vs ${awayTeam.name}</td>
            <td class="${resultClass}">${match.homeScore}-${match.awayScore} (${resultText})</td>
            <td>${champion.name} ${champChanged ? '👑' : ''}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Management Functions
function initManagement() {
    initData();
    setupManagementEventListeners();
    populateTeamDropdowns();
    renderTeamsTable();
    renderMatchesTable();
    
    // Listen for data changes from other tabs
    window.addEventListener('championshipDataUpdated', () => {
        populateTeamDropdowns();
        renderTeamsTable();
        renderMatchesTable();
    });
}

function setupManagementEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
        });
    });
    
    // Team form
    document.getElementById('add-team')?.addEventListener('click', addTeam);
    
    // Match form
    document.getElementById('add-match')?.addEventListener('click', addMatch);
    
    // Reset button
    document.getElementById('reset-data')?.addEventListener('click', resetData);
}

function addTeam() {
    const nameInput = document.getElementById('team-name');
    const isHolderCheckbox = document.getElementById('is-holder');
    
    const name = nameInput.value.trim();
    if (!name) {
        alert('Please enter a team name');
        return;
    }
    
    const newTeam = {
        id: Date.now(),
        name,
        wins: 0,
        losses: 0,
        isHolder: isHolderCheckbox.checked,
        streaks: {
            longestWin: 0,
            longestLoss: 0,
            current: ''
        },
        reigns: []
    };
    
    if (newTeam.isHolder) {
        // Clear previous holder
        championshipData.teams.forEach(team => team.isHolder = false);
        championshipData.currentHolder = newTeam.id;
        
        // Add initial reign
        newTeam.reigns.push({
            start: new Date().toISOString(),
            end: null,
            days: 0
        });
    }
    
    championshipData.teams.push(newTeam);
    saveData();
    
    // Reset form
    nameInput.value = '';
    isHolderCheckbox.checked = false;
    
    // Update UI
    populateTeamDropdowns();
    renderTeamsTable();
}

function addMatch() {
    const dateInput = document.getElementById('match-date');
    const homeSelect = document.getElementById('home-team');
    const awaySelect = document.getElementById('away-team');
    const homeScoreInput = document.getElementById('home-score');
    const awayScoreInput = document.getElementById('away-score');
    
    const date = dateInput.value;
    const homeId = parseInt(homeSelect.value);
    const awayId = parseInt(awaySelect.value);
    const homeScore = parseInt(homeScoreInput.value);
    const awayScore = parseInt(awayScoreInput.value);
    
    // Validation
    if (!date || isNaN(homeId) || isNaN(awayId) || isNaN(homeScore) || isNaN(awayScore)) {
        alert('Please fill all fields with valid values');
        return;
    }
    
    if (homeId === awayId) {
        alert('Home and away teams cannot be the same');
        return;
    }
    
    // Get current holder before match
    const preMatchHolder = championshipData.currentHolder;
    
    // Determine winner and new holder
    let winnerId = null;
    let postMatchHolder = preMatchHolder;
    
    if (homeScore > awayScore) {
        winnerId = homeId;
        postMatchHolder = homeId;
    } else if (awayScore > homeScore) {
        winnerId = awayId;
        postMatchHolder = awayId;
    } else {
        // Draw - winner is current holder
        winnerId = preMatchHolder;
        postMatchHolder = preMatchHolder;
    }
    
    // Create new match
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
    
    // Process match results
    processMatchResults(newMatch);
    
    // Add to matches
    championshipData.matches.push(newMatch);
    saveData();
    
    // Reset form
    homeScoreInput.value = '';
    awayScoreInput.value = '';
    
    // Update UI
    renderMatchesTable();
}

function processMatchResults(match) {
    const homeTeam = championshipData.teams.find(t => t.id === match.homeId);
    const awayTeam = championshipData.teams.find(t => t.id === match.awayId);
    
    // Update win/loss records
    if (match.winnerId === match.homeId) {
        homeTeam.wins++;
        awayTeam.losses++;
    } else if (match.winnerId === match.awayId) {
        awayTeam.wins++;
        homeTeam.losses++;
    }
    
    // Update streaks
    updateStreak(homeTeam, match.winnerId === match.homeId ? 'win' : 
                (match.winnerId === match.awayId ? 'loss' : 'draw'));
    updateStreak(awayTeam, match.winnerId === match.awayId ? 'win' : 
                (match.winnerId === match.homeId ? 'loss' : 'draw'));
    
    // Update holder status if changed
    if (match.postMatchHolder !== match.preMatchHolder) {
        // Clear previous holder status
        championshipData.teams.forEach(team => team.isHolder = false);
        
        // Set new holder
        const newHolder = championshipData.teams.find(t => t.id === match.postMatchHolder);
        if (newHolder) {
            newHolder.isHolder = true;
            championshipData.currentHolder = newHolder.id;
            
            // Add new reign
            newHolder.reigns.push({
                start: match.date,
                end: null,
                days: 0
            });
        }
        
        // End previous holder's reign if it exists
        if (match.preMatchHolder) {
            const prevHolder = championshipData.teams.find(t => t.id === match.preMatchHolder);
            if (prevHolder && prevHolder.reigns.length > 0) {
                const currentReign = prevHolder.reigns[prevHolder.reigns.length - 1];
                if (!currentReign.end) {
                    currentReign.end = match.date;
                    
                    // Calculate days held
                    const startDate = new Date(currentReign.start);
                    const endDate = new Date(match.date);
                    currentReign.days = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
                }
            }
        }
    }
}

function updateStreak(team, result) {
    let current = team.streaks.current || '';
    
    if (result === 'win') {
        if (current.startsWith('W')) {
            const count = parseInt(current.substring(1)) + 1;
            team.streaks.current = `W${count}`;
            if (count > team.streaks.longestWin) {
                team.streaks.longestWin = count;
            }
        } else {
            team.streaks.current = 'W1';
            if (team.streaks.longestWin < 1) {
                team.streaks.longestWin = 1;
            }
        }
    } else if (result === 'loss') {
        if (current.startsWith('L')) {
            const count = parseInt(current.substring(1)) + 1;
            team.streaks.current = `L${count}`;
            if (count > team.streaks.longestLoss) {
                team.streaks.longestLoss = count;
            }
        } else {
            team.streaks.current = 'L1';
            if (team.streaks.longestLoss < 1) {
                team.streaks.longestLoss = 1;
            }
        }
    } else {
        // Draw - reset streak
        team.streaks.current = '';
    }
}

function populateTeamDropdowns() {
    const homeSelect = document.getElementById('home-team');
    const awaySelect = document.getElementById('away-team');
    
    if (!homeSelect || !awaySelect) return;
    
    // Clear existing options
    homeSelect.innerHTML = '';
    awaySelect.innerHTML = '';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select a team';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    
    homeSelect.appendChild(defaultOption.cloneNode(true));
    awaySelect.appendChild(defaultOption.cloneNode(true));
    
    // Add teams
    championshipData.teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team.id;
        option.textContent = team.name;
        homeSelect.appendChild(option.cloneNode(true));
        awaySelect.appendChild(option.cloneNode(true));
    });
}

function renderTeamsTable() {
    const tableBody = document.querySelector('#teams-table tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    championshipData.teams.forEach(team => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${team.name}</td>
            <td>${team.wins}-${team.losses}</td>
            <td>${team.isHolder ? '<span class="holder-badge">Holder</span>' : ''}</td>
            <td>
                <button onclick="editTeam(${team.id})" class="primary-btn">Edit</button>
                <button onclick="deleteTeam(${team.id})" class="danger-btn">Delete</button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

function renderMatchesTable() {
    const tableBody = document.querySelector('#matches-table tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    // Sort matches by date (newest first)
    const sortedMatches = [...championshipData.matches].sort((a, b) => 
        new Date(b.date) - new Date(a.date));
    
    sortedMatches.forEach(match => {
        const homeTeam = championshipData.teams.find(t => t.id === match.homeId);
        const awayTeam = championshipData.teams.find(t => t.id === match.awayId);
        const champion = championshipData.teams.find(t => t.id === match.postMatchHolder);
        
        if (!homeTeam || !awayTeam || !champion) return;
        
        const row = document.createElement('tr');
        
        // Determine result text
        let resultText = '';
        if (match.winnerId === match.homeId) {
            resultText = `${homeTeam.name} won`;
        } else if (match.winnerId === match.awayId) {
            resultText = `${awayTeam.name} won`;
        } else {
            resultText = 'Draw';
        }
        
        // Check if championship changed
        const champChanged = match.preMatchHolder !== match.postMatchHolder;
        const champText = champChanged ? 
            `${champion.name} (new)` : champion.name;
        
        row.innerHTML = `
            <td>${new Date(match.date).toLocaleDateString()}</td>
            <td>${homeTeam.name} vs ${awayTeam.name}</td>
            <td>${match.homeScore}-${match.awayScore} (${resultText})</td>
            <td>${champText}</td>
            <td>
                <button onclick="editMatch(${match.id})" class="primary-btn">Edit</button>
                <button onclick="deleteMatch(${match.id})" class="danger-btn">Delete</button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

function editTeam(teamId) {
    // Implementation for editing a team
    alert('Edit team functionality would go here');
}

function deleteTeam(teamId) {
    if (!confirm('Are you sure you want to delete this team? This will also delete all associated matches.')) {
        return;
    }
    
    // Find team index
    const teamIndex = championshipData.teams.findIndex(t => t.id === teamId);
    if (teamIndex === -1) return;
    
    // Check if this is the current holder
    const isHolder = championshipData.currentHolder === teamId;
    
    // Remove team
    championshipData.teams.splice(teamIndex, 1);
    
    // Remove matches involving this team
    championshipData.matches = championshipData.matches.filter(m => 
        m.homeId !== teamId && m.awayId !== teamId
    );
    
    // Update current holder if needed
    if (isHolder) {
        championshipData.currentHolder = null;
    }
    
    saveData();
    renderTeamsTable();
    renderMatchesTable();
}

function editMatch(matchId) {
    // Implementation for editing a match
    alert('Edit match functionality would go here');
}

function deleteMatch(matchId) {
    if (!confirm('Are you sure you want to delete this match?')) {
        return;
    }
    
    // Find match index
    const matchIndex = championshipData.matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) return;
    
    // Revert match effects
    revertMatchEffects(championshipData.matches[matchIndex]);
    
    // Remove match
    championshipData.matches.splice(matchIndex, 1);
    saveData();
    renderMatchesTable();
}

function revertMatchEffects(match) {
    const homeTeam = championshipData.teams.find(t => t.id === match.homeId);
    const awayTeam = championshipData.teams.find(t => t.id === match.awayId);
    
    // Revert win/loss records
    if (match.winnerId === match.homeId) {
        homeTeam.wins--;
        awayTeam.losses--;
    } else if (match.winnerId === match.awayId) {
        awayTeam.wins--;
        homeTeam.losses--;
    }
    
    // Revert streaks (simplified - in a real app you'd need more complex logic)
    homeTeam.streaks.current = '';
    awayTeam.streaks.current = '';
    
    // Revert holder changes if this match changed the holder
    if (match.preMatchHolder !== match.postMatchHolder) {
        // Remove new holder's reign
        const newHolder = championshipData.teams.find(t => t.id === match.postMatchHolder);
        if (newHolder) {
            newHolder.isHolder = false;
            newHolder.reigns.pop();
        }
        
        // Restore previous holder's reign
        const prevHolder = championshipData.teams.find(t => t.id === match.preMatchHolder);
        if (prevHolder) {
            prevHolder.isHolder = true;
            prevHolder.reigns.push({
                start: match.date,
                end: null,
                days: 0
            });
            championshipData.currentHolder = prevHolder.id;
        }
    }
}

function resetData() {
    if (!confirm('ARE YOU SURE YOU WANT TO RESET ALL DATA?\nThis cannot be undone.')) {
        return;
    }
    
    championshipData = {
        teams: [],
        matches: [],
        currentHolder: null,
        lastUpdated: new Date().toISOString()
    };
    
    saveData();
    
    if (typeof renderTeamsTable === 'function') renderTeamsTable();
    if (typeof renderMatchesTable === 'function') renderMatchesTable();
    if (typeof updateDashboard === 'function') updateDashboard();
    
    alert('All data has been reset.');
}

// Data Viewer Functions
function initDataViewer() {
    initData();
    displayJsonData();
    
    // Set up event listeners
    document.getElementById('refresh-data')?.addEventListener('click', displayJsonData);
    document.getElementById('export-json')?.addEventListener('click', exportJson);
    document.getElementById('copy-json')?.addEventListener('click', copyJsonToClipboard);
    document.getElementById('search-btn')?.addEventListener('click', searchJson);
    document.getElementById('reset-data')?.addEventListener('click', resetData);
    
    // Listen for data changes from other tabs
    window.addEventListener('championshipDataUpdated', displayJsonData);
}

function displayJsonData() {
    const jsonDisplay = document.getElementById('json-display');
    if (!jsonDisplay) return;
    
    jsonDisplay.textContent = JSON.stringify(championshipData, null, 2);
    jsonDisplay.dataset.rawJson = JSON.stringify(championshipData);
}

function exportJson() {
    const dataStr = JSON.stringify(championshipData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `championship-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function copyJsonToClipboard() {
    const jsonDisplay = document.getElementById('json-display');
    if (!jsonDisplay) return;
    
    navigator.clipboard.writeText(jsonDisplay.textContent)
        .then(() => alert('JSON copied to clipboard!'))
        .catch(err => alert('Failed to copy: ' + err));
}

function searchJson() {
    const searchInput = document.getElementById('search-input');
    const jsonDisplay = document.getElementById('json-display');
    
    if (!searchInput || !jsonDisplay) return;
    
    const searchTerm = searchInput.value.trim().toLowerCase();
    if (!searchTerm) {
        jsonDisplay.textContent = JSON.stringify(championshipData, null, 2);
        return;
    }
    
    const rawJson = jsonDisplay.dataset.rawJson;
    if (!rawJson) return;
    
    // Simple search highlighting
    const highlighted = rawJson.replace(
        new RegExp(searchTerm, 'gi'),
        match => `<span class="search-highlight">${match}</span>`
    );
    
    jsonDisplay.innerHTML = highlighted;
    
    // Scroll to first match
    const firstMatch = jsonDisplay.querySelector('.search-highlight');
    if (firstMatch) {
        firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}
