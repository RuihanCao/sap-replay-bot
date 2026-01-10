# SAP Replay Bot

Discord bot that renders Super Auto Pets replay summaries and pulls SAP Calculator win/loss/draw percentages per turn.

## Setup

1) Install dependencies:
```powershell
npm install
```

2) Install Playwright browsers:
```powershell
npx playwright install
```

3) Create `.env` in the repo root:
```env
DISCORD_TOKEN=your_discord_bot_token
SAP_EMAIL=your_sap_email
SAP_PASSWORD=your_sap_password
```

4) Enable Discord intents:
- Developer Portal -> Bot -> Privileged Gateway Intents -> Message Content Intent

5) Run the bot:
```powershell
node index.js
```

## Usage

- Send a replay JSON object directly in a channel (starts with `{` and ends with `}`).
- Use calculator link for a specific turn:
```
!calc {"Pid":"<participation_id>","T":<turn_number>}
```
- Calculate win rates for each turn (Headless Node.js):
```
!sim {"Pid":"<participation_id>","T":<turn_number>}
```
- Calculate win rates for each turn (Playwright Browser - Slow):
```
!odds {"Pid":"<participation_id>","T":<turn_number>}
```
## Output

- The replay image includes win/loss/draw percentages for each turn.
- Row background colors:
  - Win: light green
  - Loss: light red
  - Draw: light gray
  - Easter egg: find out!
- Footer shows a luck score based on outcome surprisal: https://docs.google.com/document/d/1-z6vB9joOCZQkVx9J3DPWQ487phBYnOutT-wq3U0-Yg/edit?usp=sharing

## Notes

- `canvas` may require build tools on Windows. If install fails, install the Windows Build Tools or use a prebuilt environment.
- Playwright requires a one-time browser download (`npx playwright install`).

