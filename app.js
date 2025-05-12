// Championship Data Structure
let championshipData = {
    teams: [],
    matches: [],
    currentHolder: null,
    lastUpdated: null
};

// Search-related variables
let homeTeamSearchTimeout;
let awayTeamSearchTimeout;
let homeTeamResultsVisible = false;
let awayTeamResultsVisible = false;

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

// Team Management Functions
function addTeam() {
    const nameInput = document.getElementById('team-name');
    const isHolderCheckbox = document.getElementById('is-holder');
    
    const name = nameInput.value.trim();
    if (!name) {
        showError('Please enter a team name');
        return;
    }

    // Check if team already exists
    const teamExists = championshipData.teams.some(team => 
        team.name.toLowerCase() === name.toLowerCase()
    );
    
    if (teamExists) {
        showError('A team with this name already exists');
        return;
    }
    
    const newTeam = {
        id: Date.now(), // Unique ID based on timestamp
        name,
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
    clearError();
    
    // Update UI
    renderTeamsTable();
    
    // Refresh search dropdowns if on matches tab
    if (document.getElementById('matches-tab').classList.contains('active')) {
        document.getElementById('home-team-search').value = '';
        document.getElementById('away-team-search').value = '';
        document.getElementById('home-team-results').innerHTML = '';
        document.getElementById('away-team-results').innerHTML = '';
    }
    
    // Show success message
    showSuccess('Team added successfully!');
}

function showError(message) {
    clearError();
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    document.getElementById('add-team').insertAdjacentElement('beforebegin', errorElement);
}

function showSuccess(message) {
    const successElement = document.createElement('div');
    successElement.className = 'success-message';
    successElement.textContent = message;
    const formContainer = document.querySelector('#teams-tab .form-container');
    formContainer.insertBefore(successElement, formContainer.firstChild);
    
    // Remove after 3 seconds
    setTimeout(() => {
        successElement.remove();
    }, 3000);
}

function clearError() {
    const existingError = document.querySelector('.error-message');
    if (existingError) existingError.remove();
}

function renderTeamsTable() {
    const tableBody = document.querySelector('#teams-table tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (championshipData.teams.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="no-teams">No teams added yet</td>
            </tr>
        `;
        return;
    }
    
    championshipData.teams.forEach(team => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${team.name}</td>
            <td>${team.wins}-${team.losses}</td>
            <td>${team.isHolder ? '<span class="holder-badge">Holder</span>' : ''}</td>
            <td class="actions">
                <button onclick="editTeamPrompt(${team.id})" class="edit-btn">Edit</button>
                <button onclick="deleteTeamPrompt(${team.id})" class="delete-btn">Delete</button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

function editTeamPrompt(teamId) {
    const team = championshipData.teams.find(t => t.id === teamId);
    if (!team) return;
    
    const newName = prompt('Edit team name:', team.name);
    if (newName && newName.trim() !== team.name) {
        team.name = newName.trim();
        saveData();
        renderTeamsTable();
    }
}

function deleteTeamPrompt(teamId) {
    if (!confirm('Are you sure you want to delete this team? This will also delete all associated matches.')) {
        return;
    }
    
    deleteTeam(teamId);
}

function deleteTeam(teamId) {
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

// Match Management Functions
function addMatch() {
    const dateInput = document.getElementById('match-date');
    const homeId = parseInt(document.getElementById('home-team-id').value);
    const awayId = parseInt(document.getElementById('away-team-id').value);
    const homeScoreInput = document.getElementById('home-score');
    const awayScoreInput = document.getElementById('away-score');
    
    const date = dateInput.value;
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
    document.getElementById('home-team-search').value = '';
    document.getElementById('away-team-search').value = '';
    document.getElementById('home-team-id').value = '';
    document.getElementById('away-team-id').value = '';
    
    // Update UI
    renderMatchesTable();
}

// ... [rest of your existing match-related functions] ...

// Search Functionality
function handleHomeTeamSearch(e) {
    clearTimeout(homeTeamSearchTimeout);
    homeTeamSearchTimeout = setTimeout(() => {
        const query = e.target.value.trim().toLowerCase();
        searchTeams(query, 'home');
    }, 300);
}

function handleAwayTeamSearch(e) {
    clearTimeout(awayTeamSearchTimeout);
    awayTeamSearchTimeout = setTimeout(() => {
        const query = e.target.value.trim().toLowerCase();
        searchTeams(query, 'away');
    }, 300);
}

function searchTeams(query, type) {
    const resultsContainer = document.getElementById(`${type}-team-results`);
    resultsContainer.innerHTML = '';
    
    if (query.length < 1) {
        resultsContainer.style.display = 'none';
        return;
    }
    
    const filteredTeams = championshipData.teams.filter(team => 
        team.name.toLowerCase().includes(query)
    );
    
    if (filteredTeams.length === 0) {
        resultsContainer.innerHTML = '<div class="search-result-item no-results">No teams found</div>';
    } else {
        filteredTeams.forEach(team => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.textContent = team.name;
            item.dataset.teamId = team.id;
            item.addEventListener('click', () => selectTeam(team, type));
            resultsContainer.appendChild(item);
        });
    }
    
    if (type === 'home' && homeTeamResultsVisible) {
        resultsContainer.style.display = 'block';
    } else if (type === 'away' && awayTeamResultsVisible) {
        resultsContainer.style.display = 'block';
    }
}

function selectTeam(team, type) {
    document.getElementById(`${type}-team-search`).value = team.name;
    document.getElementById(`${type}-team-id`).value = team.id;
    document.getElementById(`${type}-team-results`).style.display = 'none';
    
    if (type === 'home') {
        homeTeamResultsVisible = false;
    } else {
        awayTeamResultsVisible = false;
    }
}

// Initialize the appropriate page
document.addEventListener('DOMContentLoaded', function() {
    initData();
    
    if (window.location.pathname.includes('index.html') || 
        window.location.pathname.endsWith('/')) {
        initDashboard();
    } else if (window.location.pathname.includes('manage.html')) {
        initManagement();
    } else if (window.location.pathname.includes('data.html')) {
        initDataViewer();
    }
});

function initManagement() {
    setupManagementEventListeners();
    renderTeamsTable();
    renderMatchesTable();
    
    // Listen for data changes from other tabs
    window.addEventListener('championshipDataUpdated', () => {
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
    
    // Team form submission
    document.getElementById('add-team')?.addEventListener('click', addTeam);
    
    // Also allow form submission on Enter key in team name field
    document.getElementById('team-name')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTeam();
        }
    });
    
    // Match form submission
    document.getElementById('add-match')?.addEventListener('click', addMatch);
    
    // Reset button
    document.getElementById('reset-data')?.addEventListener('click', resetData);

    // Team search functionality
    document.getElementById('home-team-search')?.addEventListener('input', handleHomeTeamSearch);
    document.getElementById('away-team-search')?.addEventListener('input', handleAwayTeamSearch);
    
    // Show results on focus
    document.getElementById('home-team-search')?.addEventListener('focus', () => {
        homeTeamResultsVisible = true;
        document.getElementById('home-team-results').style.display = 'block';
    });
    document.getElementById('away-team-search')?.addEventListener('focus', () => {
        awayTeamResultsVisible = true;
        document.getElementById('away-team-results').style.display = 'block';
    });

// Keyboard navigation
    document.getElementById('home-team-search')?.addEventListener('keydown', (e) => handleSearchKeyNavigation(e, 'home'));
    document.getElementById('away-team-search')?.addEventListener('keydown', (e) => handleSearchKeyNavigation(e, 'away'));
}

// Team search functions
function handleHomeTeamSearch(e) {
    clearTimeout(homeTeamSearchTimeout);
    homeTeamSearchTimeout = setTimeout(() => {
        const query = e.target.value.trim().toLowerCase();
        searchTeams(query, 'home');
    }, 300);
}

function handleAwayTeamSearch(e) {
    clearTimeout(awayTeamSearchTimeout);
    awayTeamSearchTimeout = setTimeout(() => {
        const query = e.target.value.trim().toLowerCase();
        searchTeams(query, 'away');
    }, 300);
}

function searchTeams(query, type) {
    const resultsContainer = document.getElementById(`${type}-team-results`);
    resultsContainer.innerHTML = '';
    
    if (query.length < 1) {
        resultsContainer.style.display = 'none';
        return;
    }
    
    const filteredTeams = championshipData.teams.filter(team => 
        team.name.toLowerCase().includes(query)
    );
    
    if (filteredTeams.length === 0) {
        resultsContainer.innerHTML = '<div class="search-result-item">No teams found</div>';
    } else {
        filteredTeams.forEach(team => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.textContent = team.name;
            item.dataset.teamId = team.id;
            item.addEventListener('click', () => selectTeam(team, type));
            resultsContainer.appendChild(item);
        });
    }
    
    if (type === 'home' && homeTeamResultsVisible) {
        resultsContainer.style.display = 'block';
    } else if (type === 'away' && awayTeamResultsVisible) {
        resultsContainer.style.display = 'block';
    }
}

function selectTeam(team, type) {
    document.getElementById(`${type}-team-search`).value = team.name;
    document.getElementById(`${type}-team-id`).value = team.id;
    document.getElementById(`${type}-team-results`).style.display = 'none';
    
    if (type === 'home') {
        homeTeamResultsVisible = false;
    } else {
        awayTeamResultsVisible = false;
    }
}

function handleSearchKeyNavigation(e, type) {
    const results = document.getElementById(`${type}-team-results`);
    const items = results.querySelectorAll('.search-result-item');
    let currentIndex = -1;
    
    items.forEach((item, index) => {
        if (item.classList.contains('highlighted')) {
            currentIndex = index;
            item.classList.remove('highlighted');
        }
    });
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % items.length;
        items[nextIndex].classList.add('highlighted');
        items[nextIndex].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + items.length) % items.length;
        items[prevIndex].classList.add('highlighted');
        items[prevIndex].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentIndex >= 0) {
            const teamId = items[currentIndex].dataset.teamId;
            const team = championshipData.teams.find(t => t.id == teamId);
            if (team) selectTeam(team, type);
        }
    }
}

// Team Management
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
    renderTeamsTable();
}

// Match Management
function addMatch() {
    const dateInput = document.getElementById('match-date');
    const homeId = parseInt(document.getElementById('home-team-id').value);
    const awayId = parseInt(document.getElementById('away-team-id').value);
    const homeScoreInput = document.getElementById('home-score');
    const awayScoreInput = document.getElementById('away-score');
    
    const date = dateInput.value;
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
    document.getElementById('home-team-search').value = '';
    document.getElementById('away-team-search').value = '';
    document.getElementById('home-team-id').value = '';
    document.getElementById('away-team-id').value = '';
    
    // Update UI
    renderMatchesTable();
}

// ... (keep all remaining existing functions unchanged) ...

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

// ... (keep all remaining data viewer functions unchanged) ...

// Initialize the appropriate page
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('index.html') || 
        window.location.pathname.endsWith('/')) {
        initDashboard();
    } else if (window.location.pathname.includes('manage.html')) {
        initManagement();
    } else if (window.location.pathname.includes('data.html')) {
        initDataViewer();
    }
});
