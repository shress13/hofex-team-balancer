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
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate JSON format
    const content = fs.readFileSync(req.file.path, 'utf8');
    const players = JSON.parse(content);

    // Validate player structure
    if (!Array.isArray(players)) {
      return res.status(400).json({ error: 'Players must be an array' });
    }

    // Basic validation of player properties
    for (const player of players) {
      if (!player.name) {
        return res.status(400).json({ error: 'Each player must have name property' });
      }
      // Check if has at least 1st position choice and stamina
      if (!player['1st position Choice'] || !player['Stamina']) {
        return res.status(400).json({ error: 'Each player must have 1st position Choice and Stamina' });
      }
    }

    res.json({ 
      message: 'Players uploaded successfully',
      count: players.length 
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

  // Sort each position group by: VALUE (high to low), then RANK (low to high)
  const sortByValueAndRank = (a, b) => {
    const aValue = parseInt(a['1st position Value']) || 0;
    const bValue = parseInt(b['1st position Value']) || 0;
    const aRank = parseInt(a['1st position Rank']) || 999;
    const bRank = parseInt(b['1st position Rank']) || 999;

    if (bValue !== aValue) return bValue - aValue; // Higher value first
    return aRank - bRank; // Lower rank first (better players)
  };

  for (const pos in playersByPosition) {
    playersByPosition[pos].sort(sortByValueAndRank);
  }

  // Define team composition requirements
  // For 7 players: 1 CB, 2 FB, 1 AM, 2 DM, 1 ST
  // For more: add CB, then ST, then DM, then AM
  const positionPriority = [
    { name: 'Center Back', required: 1, addOrder: 1 },
    { name: 'Fullback Defense', required: 2, addOrder: 4 },
    { name: 'Attacking Mid', required: 1, addOrder: 3 },
    { name: 'Defensive Mid', required: 2, addOrder: 2 },
    { name: 'Striker', required: 1, addOrder: 1 }
  ];

  const baseTeamSize = 7;
  const playersPerTeam = Math.ceil(players.length / numTeams);

  // Phase 1: Distribute required positions to each team (7-player base)
  for (let posIdx = 0; posIdx < positionPriority.length; posIdx++) {
    const posReq = positionPriority[posIdx];
    const availablePlayers = playersByPosition[posReq.name] || [];

    let playerIdx = 0;
    for (let count = 0; count < posReq.required; count++) {
      for (let teamIdx = 0; teamIdx < numTeams; teamIdx++) {
        if (playerIdx < availablePlayers.length) {
          const player = availablePlayers[playerIdx];
          assignPlayerToPrimaryPos(teams[teamIdx], player, posReq.name);
          playerIdx++;
        }
      }
    }
  }

  // Phase 2: Distribute additional players (if more than 7 per team)
  const additionalOrder = ['Center Back', 'Striker', 'Defensive Mid', 'Attacking Mid'];
  const usedPlayers = new Set();
  
  // Mark already assigned players
  for (const team of teams) {
    for (const p of team.players) {
      usedPlayers.add(p.name);
    }
  }

  // Add remaining players in order until teams are full
  for (const posName of additionalOrder) {
    const availablePlayers = (playersByPosition[posName] || []).filter(p => !usedPlayers.has(p.name));
    
    for (const player of availablePlayers) {
      // Find team with fewest players
      let minTeam = 0;
      let minCount = teams[0].players.length;
      
      for (let i = 1; i < numTeams; i++) {
        if (teams[i].players.length < minCount && teams[i].players.length < playersPerTeam) {
          minCount = teams[i].players.length;
          minTeam = i;
        }
      }

      if (teams[minTeam].players.length < playersPerTeam) {
        assignPlayerToPrimaryPos(teams[minTeam], player, posName);
        usedPlayers.add(player.name);
      }
    }
  }

  // Phase 3: Add remaining players not yet assigned (from any position not fully used)
  for (const pos in playersByPosition) {
    for (const player of playersByPosition[pos]) {
      if (!usedPlayers.has(player.name)) {
        // Find team with fewest players that hasn't reached max
        let minTeam = 0;
        let minCount = teams[0].players.length;
        
        for (let i = 1; i < numTeams; i++) {
          if (teams[i].players.length < minCount && teams[i].players.length < playersPerTeam) {
            minCount = teams[i].players.length;
            minTeam = i;
          }
        }

        if (teams[minTeam].players.length < playersPerTeam) {
          assignPlayerToPrimaryPos(teams[minTeam], player, pos);
          usedPlayers.add(player.name);
        }
      }
    }
  }

  // Phase 4: Use secondary positions for players not yet assigned
  const playersNotAssigned = players.filter(p => !usedPlayers.has(p.name));
  
  for (const player of playersNotAssigned) {
    if (player['2nd position Choice'] && player['2nd position Choice'].trim()) {
      // Find team with fewest players
      let minTeam = 0;
      let minCount = teams[0].players.length;
      
      for (let i = 1; i < numTeams; i++) {
        if (teams[i].players.length < minCount) {
          minCount = teams[i].players.length;
          minTeam = i;
        }
      }

      assignPlayerToSecondaryPos(teams[minTeam], player);
      usedPlayers.add(player.name);
    }
  }

  // Phase 5: Optimize - swap players to improve value/rank/stamina balance
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

          if (valueDiff <= 2 && staminaDiff <= 2) continue;

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
