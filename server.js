const express = require('express');
const multer = require('multer');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const playersFile = path.join(dataDir, 'players.json');
const ADMIN_KEY = process.env.ADMIN_KEY || 'admin123';

function isAdminRequest(req) {
  return req.headers['x-admin-key'] === ADMIN_KEY;
}

function normalizePlayer(player) {
  return {
    name: (player.name || '').trim(),
    '1st position Choice': (player['1st position Choice'] || player['1st position choice'] || '').trim(),
    '1st position Value': player['1st position Value'] || player['1st position value'] || 0,
    '1st position Rank': player['1st position Rank'] || player['1st position rank'] || 0,
    '2nd position Choice': (player['2nd position Choice'] || player['2nd position choice'] || '').trim(),
    '2nd position value': player['2nd position value'] || player['2nd position Value'] || 0,
    '2nd position Rank': player['2nd position Rank'] || player['2nd position rank'] || 0,
    'Stamina': player['Stamina'] || player['stamina'] || 0
  };
}

function validatePlayer(player) {
  if (!player || typeof player !== 'object') {
    return 'Each player must be a JSON object';
  }
  if (!player.name || typeof player.name !== 'string' || !player.name.trim()) {
    return 'Each player must have a name';
  }
  if (!player['1st position Choice'] || !player['Stamina']) {
    return 'Each player must have 1st position Choice and Stamina';
  }
  return null;
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, dataDir);
  },
  filename: (req, file, cb) => {
    cb(null, 'players.json');
  }
});

const upload = multer({ storage: storage });

// Initialize players database if it doesn't exist
function initializePlayers() {
  if (!fs.existsSync(playersFile)) {
    const defaultPlayers = [
      { name: "Ashok Shrestha", "1st position Choice": "Striker", "1st position Value": 7, "1st position Rank": 2, "2nd position Choice": "Midfield", "2nd position value": 5, "2nd position Rank": 3, "Stamina": 7 },
      { name: "Rajeeb", "1st position Choice": "Striker", "1st position Value": 6, "1st position Rank": 3, "2nd position Choice": "Midfield", "2nd position value": 4, "2nd position Rank": 4, "Stamina": 6 },
      { name: "Sujit Shrestha", "1st position Choice": "Defense", "1st position Value": 8, "1st position Rank": 1, "2nd position Choice": "", "2nd position value": 0, "2nd position Rank": 0, "Stamina": 8 }
    ];
    fs.writeFileSync(playersFile, JSON.stringify(defaultPlayers, null, 2));
  }
}

// Get all players
app.get('/api/players', (req, res) => {
  try {
    if (!fs.existsSync(playersFile)) {
      initializePlayers();
    }
    const players = JSON.parse(fs.readFileSync(playersFile, 'utf8'));
    res.json(players);
  } catch (error) {
    console.error('Error reading players:', error);
    res.status(500).json({ error: 'Failed to read players' });
  }
});

// Upload JSON player database
app.post('/api/upload-players', upload.single('file'), (req, res) => {
  try {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ error: 'Admin key required to upload JSON' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const content = fs.readFileSync(req.file.path, 'utf8');
    const players = JSON.parse(content);

    if (!Array.isArray(players)) {
      return res.status(400).json({ error: 'Players must be an array' });
    }

    const normalizedPlayers = players.map(normalizePlayer);
    for (const player of normalizedPlayers) {
      const validationError = validatePlayer(player);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }
    }

    fs.writeFileSync(playersFile, JSON.stringify(normalizedPlayers, null, 2));

    res.json({ 
      message: 'Players uploaded successfully',
      count: normalizedPlayers.length 
    });
  } catch (error) {
    console.error('Error uploading players:', error);
    if (error instanceof SyntaxError) {
      res.status(400).json({ error: 'Invalid JSON format' });
    } else {
      res.status(500).json({ error: 'Failed to upload players' });
    }
  }
});

app.post('/api/add-player', (req, res) => {
  try {
    const player = normalizePlayer(req.body);
    const validationError = validatePlayer(player);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    if (fs.existsSync(playersFile)) {
      const currentPlayers = JSON.parse(fs.readFileSync(playersFile, 'utf8'));
      if (currentPlayers.some(p => p.name.trim().toLowerCase() === player.name.trim().toLowerCase())) {
        return res.status(400).json({ error: 'A player with this name already exists' });
      }
      currentPlayers.push(player);
      fs.writeFileSync(playersFile, JSON.stringify(currentPlayers, null, 2));
      return res.json({ message: 'Player added successfully', player });
    }

    fs.writeFileSync(playersFile, JSON.stringify([player], null, 2));
    return res.json({ message: 'Player added successfully', player });
  } catch (error) {
    console.error('Error adding player:', error);
    res.status(500).json({ error: 'Failed to add player' });
  }
});

// Create balanced teams
app.post('/api/create-teams', (req, res) => {
  try {
    const { selectedPlayers, numTeams } = req.body;

    if (!selectedPlayers || selectedPlayers.length === 0) {
      return res.status(400).json({ error: 'No players selected' });
    }

    if (![2, 4].includes(numTeams)) {
      return res.status(400).json({ error: 'Number of teams must be 2 or 4' });
    }

    const teams = balanceTeams(selectedPlayers, numTeams);
    res.json(teams);
  } catch (error) {
    console.error('Error creating teams:', error);
    res.status(500).json({ error: 'Failed to create teams' });
  }
});

// Team balancing algorithm with specific position requirements
function balanceTeams(players, numTeams) {
  // Initialize teams
  const teams = Array.from({ length: numTeams }, () => ({
    players: [],
    totalValue: 0,
    totalStamina: 0,
    positions: {}
  }));

  // Group players by their 1st position choice
  const playersByPosition = {};
  
  for (const player of players) {
    const pos = player['1st position Choice'];
    if (pos && pos.trim()) {
      if (!playersByPosition[pos]) {
        playersByPosition[pos] = [];
      }
      playersByPosition[pos].push(player);
    }
  }

  // Sort each position group by: VALUE (high to low), then RANK (high to low = better player)
  const sortByValueAndRank = (a, b) => {
    const aValue = parseInt(a['1st position Value']) || 0;
    const bValue = parseInt(b['1st position Value']) || 0;
    const aRank = parseInt(a['1st position Rank']) || 0;
    const bRank = parseInt(b['1st position Rank']) || 0;

    if (bValue !== aValue) return bValue - aValue; // Higher value first (best players)
    return bRank - aRank; // Higher rank first (better players = higher rank number)
  };

  for (const pos in playersByPosition) {
    playersByPosition[pos].sort(sortByValueAndRank);
  }

  // Define required positions for 7-player team base
  const positionRequirements = [
    { name: 'Center Back', required: 1 },
    { name: 'Fullback Defense', required: 2 },
    { name: 'Defensive Mid', required: 2 },
    { name: 'Attacking Mid', required: 1 },
    { name: 'Striker', required: 1 }
  ];

  const baseTeamSize = 7;
  const playersPerTeam = Math.max(baseTeamSize, Math.ceil(players.length / numTeams));
  const usedPlayers = new Set();

  const sortCandidates = (list, valueKey, rankKey) => {
    return list.slice().sort((a, b) => {
      const aValue = parseInt(a[valueKey]) || 0;
      const bValue = parseInt(b[valueKey]) || 0;
      const aRank = parseInt(a[rankKey]) || 0;
      const bRank = parseInt(b[rankKey]) || 0;
      const aStamina = parseInt(a['Stamina']) || 0;
      const bStamina = parseInt(b['Stamina']) || 0;

      if (bValue !== aValue) return bValue - aValue;
      if (bRank !== aRank) return bRank - aRank;
      return bStamina - aStamina;
    });
  };

  const primaryCandidatesByPosition = {};
  const secondaryCandidatesByPosition = {};

  for (const player of players) {
    const primaryPos = player['1st position Choice'];
    const secondaryPos = player['2nd position Choice'];

    if (primaryPos && primaryPos.trim()) {
      primaryCandidatesByPosition[primaryPos] = primaryCandidatesByPosition[primaryPos] || [];
      primaryCandidatesByPosition[primaryPos].push(player);
    }

    if (secondaryPos && secondaryPos.trim()) {
      secondaryCandidatesByPosition[secondaryPos] = secondaryCandidatesByPosition[secondaryPos] || [];
    }
  }

  for (const pos in primaryCandidatesByPosition) {
    primaryCandidatesByPosition[pos] = sortCandidates(primaryCandidatesByPosition[pos], '1st position Value', '1st position Rank');
  }

  for (const pos in secondaryCandidatesByPosition) {
    secondaryCandidatesByPosition[pos] = sortCandidates(secondaryCandidatesByPosition[pos], '2nd position value', '2nd position Rank');
  }

  const getNextCandidate = (primaryList, secondaryList, primaryIndexObj, secondaryIndexObj) => {
    while (primaryIndexObj.index < primaryList.length && usedPlayers.has(primaryList[primaryIndexObj.index].name)) {
      primaryIndexObj.index += 1;
    }
    if (primaryIndexObj.index < primaryList.length) {
      return primaryList[primaryIndexObj.index++];
    }

    while (secondaryIndexObj.index < secondaryList.length && usedPlayers.has(secondaryList[secondaryIndexObj.index].name)) {
      secondaryIndexObj.index += 1;
    }
    if (secondaryIndexObj.index < secondaryList.length) {
      return secondaryList[secondaryIndexObj.index++];
    }

    return null;
  };

  // Phase 1: Fill required base positions using first-choice players first, then second-choice fallback.
  for (const posReq of positionRequirements) {
    const primaryList = primaryCandidatesByPosition[posReq.name] || [];
    const secondaryList = secondaryCandidatesByPosition[posReq.name] || [];
    const primaryIndexObj = { index: 0 };
    const secondaryIndexObj = { index: 0 };

    for (let slot = 0; slot < posReq.required; slot++) {
      for (let teamIdx = 0; teamIdx < numTeams; teamIdx++) {
        const player = getNextCandidate(primaryList, secondaryList, primaryIndexObj, secondaryIndexObj);
        if (player) {
          assignPlayerToPrimaryPos(teams[teamIdx], player, posReq.name);
          usedPlayers.add(player.name);
        }
      }
    }
  }

  // Phase 2: Add extra players beyond the base 7-player composition in position priority order.
  // Distribute in round-robin to ensure top-rated players are balanced across teams.
  const additionOrder = ['Center Back', 'Fullback Defense', 'Defensive Mid', 'Attacking Mid', 'Striker'];

  for (const posName of additionOrder) {
    const primaryList = (primaryCandidatesByPosition[posName] || []).filter(p => !usedPlayers.has(p.name));
    const secondaryList = (secondaryCandidatesByPosition[posName] || []).filter(p => !usedPlayers.has(p.name));
    const extraCandidates = [];
    const seen = new Set();

    for (const person of primaryList) {
      if (!seen.has(person.name)) {
        extraCandidates.push(person);
        seen.add(person.name);
      }
    }
    for (const person of secondaryList) {
      if (!seen.has(person.name)) {
        extraCandidates.push(person);
        seen.add(person.name);
      }
    }

    // Distribute extra players round-robin across teams to ensure top players are balanced
    let roundRobinIdx = 0;
    for (const player of extraCandidates) {
      let found = false;
      let attempts = 0;
      
      // Try to place player in round-robin order
      while (attempts < numTeams) {
        const targetTeamIdx = roundRobinIdx % numTeams;
        roundRobinIdx++;
        
        if (teams[targetTeamIdx].players.length < playersPerTeam) {
          assignPlayerToPrimaryPos(teams[targetTeamIdx], player, posName);
          usedPlayers.add(player.name);
          found = true;
          break;
        }
        attempts++;
      }
      
      if (!found) {
        // All teams are full for this position
        break;
      }
    }
  }

  // Phase 3: Assign remaining players using their secondary position, value, rank, and stamina.
  const remainingPlayers = players.filter(p => !usedPlayers.has(p.name));

  const sortBySecondaryAndStamina = (a, b) => {
    const aValue = parseInt(a['2nd position value']) || 0;
    const bValue = parseInt(b['2nd position value']) || 0;
    const aRank = parseInt(a['2nd position Rank']) || 0;
    const bRank = parseInt(b['2nd position Rank']) || 0;
    const aStamina = parseInt(a['Stamina']) || 0;
    const bStamina = parseInt(b['Stamina']) || 0;

    if (bValue !== aValue) return bValue - aValue;
    if (bRank !== aRank) return bRank - aRank;
    return bStamina - aStamina;
  };

  remainingPlayers.sort(sortBySecondaryAndStamina);

  for (const player of remainingPlayers) {
    const assignedPosition = player['2nd position Choice'] && player['2nd position Choice'].trim()
      ? player['2nd position Choice']
      : player['1st position Choice'];

    const targetTeam = teams
      .map((team, idx) => ({ idx, count: team.players.length, totalValue: team.totalValue }))
      .sort((a, b) => a.count - b.count || a.totalValue - b.totalValue)[0].idx;

    if (player['2nd position Choice'] && player['2nd position Choice'].trim()) {
      assignPlayerToSecondaryPos(teams[targetTeam], player);
    } else {
      assignPlayerToPrimaryPos(teams[targetTeam], player, assignedPosition);
    }
    usedPlayers.add(player.name);
  }

  // Phase 4: Optimize - swap players to balance value and stamina
  optimizeTeams(teams);

  return teams;

  function assignPlayerToPrimaryPos(team, player, position) {
    const playerCopy = { ...player, assignedPosition: position };
    
    team.players.push(playerCopy);
    team.totalValue += parseInt(player['1st position Value']) || 0;
    team.totalStamina += parseInt(player['Stamina']) || 0;
    
    if (!team.positions[position]) {
      team.positions[position] = 0;
    }
    team.positions[position]++;
  }

  function assignPlayerToSecondaryPos(team, player) {
    const position = player['2nd position Choice'];
    const playerCopy = { ...player, assignedPosition: position };
    
    team.players.push(playerCopy);
    team.totalValue += parseInt(player['2nd position value']) || 0;
    team.totalStamina += parseInt(player['Stamina']) || 0;
    
    if (!team.positions[position]) {
      team.positions[position] = 0;
    }
    team.positions[position]++;
  }

  function optimizeTeams(teams) {
    // Balance team values and stamina through swaps
    for (let iteration = 0; iteration < 30; iteration++) {
      let improved = false;

      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          const team1 = teams[i];
          const team2 = teams[j];

          const valueDiff = Math.abs(team1.totalValue - team2.totalValue);
          const staminaDiff = Math.abs(team1.totalStamina - team2.totalStamina);

          // Only optimize if there's significant imbalance
          if (valueDiff <= 2 && staminaDiff <= 2) continue;

          // Try swapping players
          for (let p1 = 0; p1 < team1.players.length; p1++) {
            for (let p2 = 0; p2 < team2.players.length; p2++) {
              const player1 = team1.players[p1];
              const player2 = team2.players[p2];

              const p1Value = player1.assignedPosition === player1['1st position Choice'] ? 
                parseInt(player1['1st position Value']) || 0 : 
                parseInt(player1['2nd position value']) || 0;
              const p2Value = player2.assignedPosition === player2['1st position Choice'] ? 
                parseInt(player2['1st position Value']) || 0 : 
                parseInt(player2['2nd position value']) || 0;
              const p1Stamina = parseInt(player1['Stamina']) || 0;
              const p2Stamina = parseInt(player2['Stamina']) || 0;

              const newValueDiff = Math.abs(
                (team1.totalValue - p1Value + p2Value) -
                (team2.totalValue - p2Value + p1Value)
              );
              const newStaminaDiff = Math.abs(
                (team1.totalStamina - p1Stamina + p2Stamina) -
                (team2.totalStamina - p2Stamina + p1Stamina)
              );

              // Swap if it improves balance
              if (newValueDiff + newStaminaDiff < valueDiff + staminaDiff) {
                team1.players[p1] = player2;
                team2.players[p2] = player1;
                team1.totalValue = team1.totalValue - p1Value + p2Value;
                team1.totalStamina = team1.totalStamina - p1Stamina + p2Stamina;
                team2.totalValue = team2.totalValue - p2Value + p1Value;
                team2.totalStamina = team2.totalStamina - p2Stamina + p1Stamina;

                improved = true;
              }
            }
          }
        }
      }

      if (!improved) break;
    }
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Initialize
initializePlayers();

// Start server
app.listen(PORT, () => {
  console.log(`Team Balancer server running on http://localhost:${PORT}`);
});
