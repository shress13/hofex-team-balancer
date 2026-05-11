# Soccer Team Balancer - Quick Start Guide

## What's New

Your Soccer Team Balancer now uses an advanced player format with detailed position information:

```
Name | 1st Choice | 1st Value | 1st Rank | 2nd Choice | 2nd Value | 2nd Rank | Stamina
```

## Player Format Explained

### Example Player Entry
```json
{
  "name": "Janesh Devkota",
  "1st position Choice": "Defensive Mid",
  "1st position Value": "8",
  "1st position Rank": "5",
  "2nd position Choice": "Attacking Mid",
  "2nd position value": "5",
  "2nd position Rank": "3",
  "Stamina": "9"
}
```

### Field Meanings

| Field | Type | Example | Explanation |
|-------|------|---------|-------------|
| **name** | Text | "Janesh Devkota" | Player's full name |
| **1st position Choice** | Text | "Defensive Mid" | Primary position (any position name) |
| **1st position Value** | 1-10 | 8 | How skilled they are in that position (10 = expert) |
| **1st position Rank** | Number | 5 | Their ranking among all players in that position (1 = best) |
| **2nd position Choice** | Text | "Attacking Mid" | Secondary position (optional - can be empty) |
| **2nd position value** | 1-10 | 5 | Skill level in secondary position |
| **2nd position Rank** | Number | 3 | Ranking in secondary position |
| **Stamina** | 1-10 | 9 | Physical fitness level (10 = excellent endurance) |

## Team Balancing Algorithm

The app distributes players using this smart algorithm:

### Step 1: Sort by Quality
- Players with 1st position are sorted by:
  1. **Value** (highest first - best players in their position)
  2. **Rank** (lowest first - top ranked players)

### Step 2: Distribute Primary Position Players
- Best players in their primary position are evenly spread across teams
- Uses "snake draft" - alternates direction each round

### Step 3: Add Secondary Position Players
- Remaining players fill teams that need more players
- Secondary positions help balance team sizes

### Step 4: Optimize
- Algorithm swaps players between teams to balance:
  - Total team value (strength)
  - Total team stamina (fitness)

### Result
✓ All teams have similar overall strength
✓ Best players distributed fairly
✓ Stamina levels balanced
✓ No team has too many backup players

## How to Prepare Your Player Data

### Quick Template
You can download a template directly from the app, or use this:

```json
[
  {
    "name": "Player 1",
    "1st position Choice": "Striker",
    "1st position Value": "8",
    "1st position Rank": "1",
    "2nd position Choice": "Midfielder",
    "2nd position value": "5",
    "2nd position Rank": "3",
    "Stamina": "8"
  },
  {
    "name": "Player 2",
    "1st position Choice": "Midfielder",
    "1st position Value": "7",
    "1st position Rank": "2",
    "2nd position Choice": "",
    "2nd position value": "0",
    "2nd position Rank": "0",
    "Stamina": "7"
  }
]
```

### Position Names (Examples)
You can use ANY position names you want:
- Soccer: "Striker", "Midfielder", "Defender", "Center Back", "Fullback", "Winger"
- More detailed: "Attacking Mid", "Defensive Mid", "Left Winger", "Right Wing Back"
- Custom: Use whatever names your team uses

### Value Scale (1-10)
- **10**: Expert/Outstanding in this position
- **8-9**: Very Good/Excellent
- **6-7**: Good/Above Average  
- **4-5**: Average/Fair
- **2-3**: Below Average
- **1**: Beginner/New to position

### Rank Scale
- **1**: Best/Top player in that position
- **2-3**: Excellent
- **4-5**: Very Good
- **6-7**: Good
- **8-9**: Average
- **10+**: Beginner/Still learning

### Stamina Scale (1-10)
- **9-10**: Excellent - can play 90+ minutes without fatigue
- **7-8**: Very Good - strong endurance
- **5-6**: Good - steady performer
- **3-4**: Fair - gets tired mid-game
- **1-2**: Low - frequent breaks needed

## Using the App

### 1. Start Server
```bash
npm start
```
Open browser to `http://localhost:3000`

### 2. Upload Players
- Click "Upload JSON" zone
- Select your prepared JSON file
- App validates and loads 65 players from your file

### 3. Select Players
- Check players who are available for THIS match
- Use "Select All" for quick selection
- Uncheck injured/unavailable players

### 4. Create Teams
- Choose 2 or 4 teams
- Click "Create Balanced Teams"
- Wait for algorithm to distribute

### 5. View Results
Each team shows:
- **Total Value**: Sum of all player values (higher = stronger team)
- **Average Stamina**: How fit the team is on average
- **Players**: With their assigned position and individual stats
- **Position breakdown**: Count by position

### 6. Adjust (Optional)
- Click "Redistribute" to get different team combinations
- Keep selecting/creating until happy with distribution

## Tips for Best Results

✓ **Be Consistent**: Use same value/rank scales across all players
✓ **Rank Honestly**: Accurately rank players - this is what balances teams
✓ **Consider Form**: Adjust values/stamina based on recent performance
✓ **Update Regularly**: Keep player data current with new additions/departures
✓ **Test**: Start with 10-15 players, see if distribution looks fair
✓ **Iterate**: Get feedback and adjust values if teams seem unbalanced

## Common Scenarios

### Scenario 1: New Player with Multiple Positions
```json
{
  "name": "Versatile Player",
  "1st position Choice": "Midfielder",
  "1st position Value": "7",
  "1st position Rank": "3",
  "2nd position Choice": "Defender",
  "2nd position value": "6",
  "2nd position Rank": "5",
  "Stamina": "8"
}
```
→ Will be placed in Midfielder first (preferred), or Defender if needed

### Scenario 2: Striker Only
```json
{
  "name": "Pure Striker",
  "1st position Choice": "Striker",
  "1st position Value": "9",
  "1st position Rank": "1",
  "2nd position Choice": "",
  "2nd position value": "",
  "2nd position Rank": "",
  "Stamina": "7"
}
```
→ Only plays striker position

### Scenario 3: Low Stamina Player
```json
{
  "name": "Part-Time Player",
  "1st position Choice": "Midfielder",
  "1st position Value": "7",
  "1st position Rank": "2",
  "2nd position Choice": "Defender",
  "2nd position value": "5",
  "2nd position Rank": "3",
  "Stamina": "3"
}
```
→ Good skill but lower stamina affects team balance

## Example Distribution

With 12 players creating 2 teams:

**Input:**
- 4 Strikers (values: 8,7,6,5)
- 4 Midfielders (values: 8,7,6,5)
- 4 Defenders (values: 8,7,6,5)

**Distribution Logic:**
1. Best striker (8) → Team A
2. 2nd striker (7) → Team B (snake draft reverses)
3. 3rd striker (6) → Team A
4. 4th striker (5) → Team B
5. Best midfielder (8) → Team B
6. 2nd midfielder (7) → Team A
... and so on

**Result:**
- Team A: ~24 total value, balanced stamina
- Team B: ~24 total value, balanced stamina
- **Fair and competitive!**

## Need Help?

1. **Check console** (F12) for error messages
2. **Verify JSON format** - use download template button
3. **Ensure all fields** - especially 1st position Choice and Stamina
4. **Check values** - should be numbers (not text with quotes in JSON)
5. **Read README.md** - comprehensive documentation

## Next Steps

1. Prepare your 50+ player database
2. Upload JSON file
3. Select team size (2 or 4)
4. Select available players
5. Create balanced teams
6. Have a competitive match!

Enjoy balanced soccer!
