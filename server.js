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
  // Format: { name, required: count, addOrder: priority for extra players }
  const positionRequirements = [
    { name: 'Center Back', required: 1, addOrder: 1 },           // Add first for extras
    { name: 'Fullback Defense', required: 2, addOrder: 4 },      // Add last for extras
    { name: 'Defensive Mid', required: 2, addOrder: 2 },         // Add third for extras
    { name: 'Attacking Mid', required: 1, addOrder: 4 },         // Add last for extras
    { name: 'Striker', required: 1, addOrder: 1 }                // Add first for extras (tied with CB)
  ];

  const baseTeamSize = 7;
  const playersPerTeam = Math.ceil(players.length / numTeams);
  const usedPlayers = new Set();

  // Phase 1: Distribute base 7-player composition to each team
  // Distribute best rank players of each position to different teams (round-robin)
  for (const posReq of positionRequirements) {
    const availablePlayers = (playersByPosition[posReq.name] || [])
      .filter(p => !usedPlayers.has(p.name));
    
    // For each required slot in this position (e.g., 2 FB slots)
    for (let slotNum = 0; slotNum < posReq.required; slotNum++) {
      // Distribute across teams in round-robin fashion
      for (let teamIdx = 0; teamIdx < numTeams; teamIdx++) {
        // Get the next best available player (already sorted by value then rank)
        const playerIndexNeeded = slotNum * numTeams + teamIdx;
        
        if (playerIndexNeeded < availablePlayers.length) {
          const selectedPlayer = availablePlayers[playerIndexNeeded];
          assignPlayerToPrimaryPos(teams[teamIdx], selectedPlayer, posReq.name);
          usedPlayers.add(selectedPlayer.name);
        }
      }
    }
  }

  // Phase 2: For additional players (if team size > 7)
  // Add in order: Center Back → Striker → Defensive Mid → Attacking Mid
  const additionOrder = ['Center Back', 'Striker', 'Defensive Mid', 'Attacking Mid'];
  
  for (const posName of additionOrder) {
    const availablePlayers = (playersByPosition[posName] || []).filter(p => !usedPlayers.has(p.name));
    
    for (const player of availablePlayers) {
      // Find team with fewest players that hasn't reached max
      let minTeam = -1;
      let minCount = Infinity;
      
      for (let i = 0; i < numTeams; i++) {
        if (teams[i].players.length < playersPerTeam && teams[i].players.length < minCount) {
          minCount = teams[i].players.length;
          minTeam = i;
        }
      }

      if (minTeam >= 0) {
        assignPlayerToPrimaryPos(teams[minTeam], player, posName);
        usedPlayers.add(player.name);
      }
    }
  }

  // Phase 3: Handle players not yet assigned (use secondary positions)
  const unassignedPlayers = players.filter(p => !usedPlayers.has(p.name));
  
  // Sort unassigned by their 2nd position value and rank
  const sortBySecondaryPos = (a, b) => {
    const aValue = parseInt(a['2nd position value']) || 0;
    const bValue = parseInt(b['2nd position value']) || 0;
    const aRank = parseInt(a['2nd position Rank']) || 0;
    const bRank = parseInt(b['2nd position Rank']) || 0;
    const aStamina = parseInt(a['Stamina']) || 0;
    const bStamina = parseInt(b['Stamina']) || 0;

    if (bValue !== aValue) return bValue - aValue; // Higher value first (best players)
    if (aRank !== bRank) return bRank - aRank;     // Higher rank first (better players)
    return bStamina - aStamina;                     // Higher stamina first
  };

  unassignedPlayers.sort(sortBySecondaryPos);

  for (const player of unassignedPlayers) {
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
