require('dotenv').config();
const { Client, Events, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const { A_DAY_IN_MS } = require('./lib/config');
const { login, fetchReplay } = require('./lib/api');
const { getBattleInfo } = require('./lib/battle');
const { buildWinPercentReport, parseReplayForCalculator, generateCalculatorLink } = require('./lib/calculator');
const { renderReplayImage } = require('./lib/render');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once(Events.ClientReady, async readyClient => {
  await login();
  setInterval(login, A_DAY_IN_MS);
});

client.on('messageCreate', async (message) => {
  const trimmedContent = message.content.trim();
  const lowerContent = trimmedContent.toLowerCase();

  if (lowerContent.startsWith('!calc ')) {
    const jsonArgument = message.content.slice('!calc '.length).trim();

    let replayData;
    try {
      replayData = JSON.parse(jsonArgument);
    } catch (e) {
      return message.reply("Invalid JSON format. Please provide the data like this: `!calc {\"Pid\":\"...\",\"T\":...}`");
    }

    const participationId = replayData.Pid;
    const turnNumber = replayData.T;

    // --- Argument Validation ---
    if (!participationId || turnNumber === undefined) {
      return message.reply("The provided JSON is missing the required `Pid` or `T` (turn number) field.");
    }
    if (isNaN(turnNumber) || turnNumber <= 0) {
      return message.reply("Please provide a valid, positive turn number in the `T` field.");
    }

    try {
      // --- Fetch Replay Data ---
      const rawReplay = await fetchReplay(participationId);
      if (!rawReplay.ok) {
        throw new Error(`API returned status ${rawReplay.status}`);
      }
      const replay = await rawReplay.json();

      // --- Find the Specific Battle ---
      const battles = replay.Actions.filter(action => action.Type === 0).map(action => JSON.parse(action.Battle));
      const targetBattle = battles[turnNumber - 1];

      if (!targetBattle) {
        return message.reply(`Sorry, I couldn't find a battle for Turn ${turnNumber}. The replay might not be that long.`);
      }

      // --- Generate and Send Link ---
      const calculatorState = parseReplayForCalculator(targetBattle);
      const calculatorLink = generateCalculatorLink(calculatorState);

      if (calculatorLink.length > 512) {
        console.warn(`Generated URL is too long (${calculatorLink.length}) and was skipped.`);
        return message.reply(`The generated link for this turn is too long for a button. Here it is directly:\n[Sap Calculator](${calculatorLink})`);
      }
      const button = new ButtonBuilder();
      button.data = {
        type: 2, // 2 is the type for a Button
        style: 5, // 5 is the style for a Link button
        label: `Analyze Turn ${turnNumber} in SAP Calculator`,
        url: calculatorLink
      };

      // Create the Action Row and add the manually created button object.
      const row = new ActionRowBuilder().addComponents(button);

      // Send the reply. The structure is now guaranteed to be what Discord expects.
      message.reply({
        content: `Here is the analysis link for **Turn ${turnNumber}** of the requested replay:`,
        components: [row]
      });

    } catch (error) {
      console.error("Failed to process !calc command:", error);
      message.reply("Sorry, I couldn't fetch or process that replay. Please double-check the ID.");
    }
    return;
  }

  // check whether message contains the code format
  let participationId;
  let includeOdds = false;
  let processingMessage = null;
  if (trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) {
    try {
      let replayObject = JSON.parse(message.content);
      participationId = replayObject["Pid"];
      console.log(`Participation Id: ${participationId}`);
    } catch (e) {
      return;
    }

    if (!participationId) {
      message.reply("Replay Pid not found.");
      return;
    }
  } else if (lowerContent.startsWith('!odds ')) {
    const oddsArg = trimmedContent.slice('!odds '.length).trim();
    includeOdds = true;
    if (!oddsArg) {
      return message.reply("Please provide a replay ID. Example: `!odds ABC123`");
    }
    if (oddsArg.startsWith('{') && oddsArg.endsWith('}')) {
      try {
        const replayObject = JSON.parse(oddsArg);
        participationId = replayObject["Pid"];
      } catch (e) {
        return message.reply("Invalid JSON format. Please provide the data like this: `!odds {\"Pid\":\"...\",\"T\":...}`");
      }
    } else {
      participationId = oddsArg;
    }
    if (!participationId) {
      return message.reply("Replay Pid not found.");
    }
  } else {
    return;
  }

  if (includeOdds) {
    processingMessage = await message.reply("Calculating odds (~1 min), please wait...");
  }

  // Request replay data from server
  const rawReplay = await fetchReplay(participationId);
  const replay = await rawReplay.json();
  const actions = replay["Actions"];
  const maxLives = replay["GenesisModeModel"] ? JSON.parse(replay["GenesisModeModel"])["MaxLives"] : 5;
  const battles = [];
  const calcBattles = [];
  const battleOpponentInfo = [];
  let playerName = null;

  const numberOfBattles = actions.filter(action => action["Type"] === 0).length;
  if (numberOfBattles > 30) {
    message.reply(`Max number of turns is 30. Your replay has ${numberOfBattles} turns.`);
    return;
  }
  for (let i = 0; i < actions.length; i++) {
    if (actions[i]["Type"] === 0) {
      const battle = JSON.parse(actions[i]["Battle"]);
      battles.push(getBattleInfo(battle));
      if (!playerName) {
        playerName = battle["User"] ? battle["User"]["DisplayName"] : null;
      }
      calcBattles.push(battle);
    }
    if (actions[i]["Type"] === 1) {
      const opponentInfo = JSON.parse(actions[i]["Mode"])["Opponents"];
      battleOpponentInfo.push(opponentInfo);
    }
  }
  let winPercentResults = [];
  if (includeOdds) {
    try {
      winPercentResults = await buildWinPercentReport(calcBattles);
    } catch (error) {
      console.error("Auto-calc failed:", error);
    }
  }

  const headerOpponentName = battles.length ? battles[0].opponentName : null;
  const imageBuffer = await renderReplayImage({
    battles,
    battleOpponentInfo,
    maxLives,
    includeOdds,
    winPercentResults,
    playerName,
    headerOpponentName
  });

  if (processingMessage) {
    await processingMessage.edit({ content: null, files: [{ attachment: imageBuffer, name: "replay.png" }] });
  } else {
    await message.reply({ files: [{ attachment: imageBuffer, name: "replay.png" }] });
  }
});

client.login(process.env.DISCORD_TOKEN);
