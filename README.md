# Soccer Team Balancer

A web application for creating intelligently balanced soccer teams based on player position choice, position value, rank, and stamina.

## Features

- **JSON Player Database**: Upload your own comprehensive player database as JSON
- **Smart Team Distribution**: Algorithm prioritizes best players in their primary position first, then distributes remaining players
- **Flexible Team Creation**: Create 2 or 4 teams
- **Player Selection**: Choose which players are available for a match
- **Advanced Balancing Algorithm**: Distribution considers:
  - **1st Position Choice** - Primary position preference
  - **1st Position Value** - Skill rating in primary position (1-10)
  - **1st Position Rank** - Ranking among players in that position (1 = best)
  - **2nd Position Choice** - Secondary position (fallback)
  - **2nd Position Value** - Skill rating in secondary position
  - **2nd Position Rank** - Ranking in secondary position
  - **Stamina** - Physical fitness level (1-10)

## Algorithm Logic

The team balancing algorithm works in phases:

1. **Phase 1: Primary Position Distribution**
   - Separates players with primary position choices
   - Sorts by: Position Value (high to low), then Rank (low to high)
   - Distributes best primary position players evenly to teams using snake draft
   
2. **Phase 2: Secondary Position Distribution**
   - Assigns remaining players with secondary positions
   - Fills teams with fewer players first
   
3. **Phase 3: Optimization**
   - Swaps players to balance overall team value and stamina
   - Ensures teams are competitive

This ensures:
- Best players in their primary position are spread across teams
- Teams have similar overall strength (value total)
- Stamina is fairly distributed
- Position depth is maintained

## Project Structure

```
hofex-team-balancer/
├── server.js              # Express backend server
├── package.json           # NPM dependencies
├── public/
│   └── index.html         # Frontend application
├── data/
│   └── players.json       # Player database storage
└── README.md              # This file
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm

### Steps

1. Navigate to the project directory:
```bash
cd c:\Users\sujit\OneDrive\Desktop\hofex_soccer\hofex-team-balancer
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

The server will run on `http://localhost:3000`

### Development Mode (with auto-reload)
```bash
npm run dev
```

## How to Use

### 1. Upload Player Database
- Click "Upload JSON" button on the left panel
- Select a JSON file with player data or download the template
- The app will validate and load your players

### Player JSON Format

Your JSON file should contain an array of player objects with this structure:

```json
[
  {
    "name": "Player Name",
    "1st position Choice": "Striker",
    "1st position Value": "8",
    "1st position Rank": "1",
    "2nd position Choice": "Midfielder",
    "2nd position value": "5",
    "2nd position Rank": "3",
    "Stamina": "8"
  },
  {
    "name": "Another Player",
    "1st position Choice": "Midfielder",
    "1st position Value": "7",
    "1st position Rank": "2",
    "2nd position Choice": "Defender",
    "2nd position value": "5",
    "2nd position Rank": "3",
    "Stamina": "7"
  }
]
```

**Field Descriptions:**
- **name**: Player's full name (required)
- **1st position Choice**: Primary position preference - any position name (e.g., "Striker", "Midfielder", "Fullback Defense", "Center Back", etc.) (required)
- **1st position Value**: Skill level in primary position, scale 1-10 where 10 is best (required)
- **1st position Rank**: Ranking among players in this position, 1 = best player in position (required)
- **2nd position Choice**: Secondary position (can be empty string if no secondary)
- **2nd position value**: Skill level in secondary position (can be empty or 0)
- **2nd position Rank**: Ranking in secondary position (can be empty or 0)
- **Stamina**: Physical fitness level, scale 1-10 where 10 is excellent stamina (required)

### 2. Select Players
- Check/uncheck individual players or use "Select All"/"Deselect All"
- The counter shows how many players are selected
- Selected players are highlighted in green

### 3. Configure Teams
- Choose "2 Teams" or "4 Teams" radio buttons
- Click "Create Balanced Teams" button

### 4. View Results
- Teams are displayed with:
  - Total value (sum of player values in that team)
  - Average stamina
  - Individual player details with assigned positions
  - Position breakdowns
- Click "Redistribute" to regenerate teams with same players (shuffles for variety)

## API Endpoints

### GET `/api/players`
Returns all players in the database.

**Response:**
```json
[
  {
    "name": "Player Name",
    "1st position Choice": "Striker",
    "1st position Value": "8",
    ...
  }
]
```

### POST `/api/upload-players`
Upload a new JSON player database file.

**Request:**
- Content-Type: multipart/form-data
- File field: `file` (JSON file)

**Response:**
```json
{
  "message": "Players uploaded successfully",
  "count": 50
}
```

### POST `/api/create-teams`
Create balanced teams from selected players.

**Request:**
```json
{
  "selectedPlayers": [...],
  "numTeams": 2
}
```

**Response:**
```json
[
  {
    "players": [...],
    "totalValue": 45,
    "totalStamina": 48,
    "positions": {...}
  }
]
```

### GET `/api/health`
Health check endpoint.

## Troubleshooting

**"Failed to connect to server"**
- Make sure the server is running: `npm start`
- Check if port 3000 is available
- Verify no other process is using port 3000

**"Invalid JSON format"**
- Ensure your JSON file is properly formatted
- Use the template download feature to create a correct format
- Check for missing commas or brackets
- Verify all required fields are present

**"Need at least N players"**
- You need at least 2 players for 2 teams or 4 for 4 teams

**Players showing "N/A" in position**
- Check if players have "1st position Choice" values in the JSON
- Empty position fields should have empty strings "", not null

## Configuration

### Change Server Port
Edit `server.js` and modify the PORT variable:
```javascript
const PORT = process.env.PORT || 3000;
```

Or set environment variable:
```bash
set PORT=5000
npm start
```

## Example Workflows

### Scenario 1: Quick Match
1. Server starts with default 3 players
2. Download template
3. Fill in your 10-15 available players
4. Upload the file
5. Select all players
6. Create 2 teams
7. View results

### Scenario 2: Large Tournament
1. Upload comprehensive database (50+ players)
2. Select specific subset available for this match
3. Create 4 teams
4. Use redistribute feature if needed
5. Export/screenshot teams

## Future Enhancements

- Player performance history tracking
- Export teams to PDF/CSV
- Previous game analytics
- Player availability calendar
- User authentication for persistent data
- Team statistics and comparison metrics
- More sophisticated balancing algorithms (ELO-based)
- API for external integrations

## Technology Stack

- **Backend**: Node.js + Express
- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript
- **Data**: JSON files
- **APIs**: RESTful API

## License

MIT

## Support

For issues or suggestions, please check:
1. The console (F12) for JavaScript errors
2. The server terminal for backend errors
3. Verify your JSON file format matches the template
4. Ensure all players have required fields

