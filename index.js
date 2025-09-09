require('dotenv').config();
const { Client, Events, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Canvas = require('canvas');
const fs = require('fs');
const path = require('path');

let AUTH_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjEwMGE3YTVlLWNlMTItNDU5MC05ZTEwLTE0MmViOWY3ZTkwMSIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWUiOiJMR1RZUVoiLCJqdGkiOiIyYTc0MmQwYy0wNGU4LTQyN2MtOWVjMC1kY2NiZjU1MDBlNTIiLCJleHAiOjE3NTM1MTM0OTAsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6NTAwMCIsImF1ZCI6IioifQ.H-gnWFes3Qyie-VPzuBcK94voFZ1jx5KMv1B3GsaXM4";
const API_VERSION = "41";

const PLACEHOLDER_SPRITE = 'i-dunno.png';
const PLACEHOLDER_PERK = 'Sprite/Food/Tier-2/SleepingPill.png';

const CANVAS_WIDTH = 1250;
const PET_WIDTH = 50;
const BATTLE_HEIGHT = 125;

const A_DAY_IN_MS = 1000 * 60 * 60 * 24;

const BATTLE_OUTCOMES = {
  WIN: 1,
  LOSS: 2,
  TIE: 3
};

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
let rawPets = JSON.parse(fs.readFileSync("pets.json"));
// Index it so it's faster!
let PETS = {};
for(let pet of rawPets){
  PETS[pet.Id] = pet;
}

let rawPerks = JSON.parse(fs.readFileSync("perks.json"));
let PERKS = {};
for(let perk of rawPerks){
  PERKS[perk.Id] = perk;
}

let rawToys = JSON.parse(fs.readFileSync("toys.json"));
let TOYS = {};
for(let toy of rawToys){
  TOYS[toy.Id] = toy;
}

const PACK_MAP = { 0: "Turtle", 1: "Puppy", 2: "Star", 5: "Golden", 6: "Unicorn", 7: "Danger"};

function getBattleInfo(battle){
  let newBattle = {};
  newBattle.playerBoard = {
    boardPets: [],
    toy: {
      imagePath: null,
      level: 0
    }
  };

  newBattle.oppBoard = {
    boardPets: [],
    toy: {
      imagePath: null,
      level: 0
    }
  };

  newBattle.outcome = battle["Outcome"];
  newBattle.opponentName = battle["Opponent"]["DisplayName"];

  for(let petJSON of battle["UserBoard"]["Mins"]["Items"]){
    if(petJSON !== null){
      newBattle.playerBoard.boardPets.push(getPetInfo(petJSON));
    }
  }

  for(let toy of battle["UserBoard"]["Rel"]["Items"]){
    if(toy !== null && toy["Enu"]){
      let toyId = toy["Enu"];
      newBattle.playerBoard.toy.imagePath = TOYS[toyId] ? `Sprite/Toys/${TOYS[toyId].NameId}.png` : PLACEHOLDER_SPRITE;
      newBattle.playerBoard.toy.level = toy["Lvl"];
    }
  }

  for(let petJSON of battle["OpponentBoard"]["Mins"]["Items"]){
    if(petJSON !== null){
      newBattle.oppBoard.boardPets.push(getPetInfo(petJSON));
    }
  }

  for(let toy of battle["OpponentBoard"]["Rel"]["Items"]){
    if(toy !== null && toy["Enu"]){
      let toyId = toy["Enu"];
      newBattle.oppBoard.toy.imagePath = TOYS[toyId] ? `Sprite/Toys/${TOYS[toyId].NameId}.png` : PLACEHOLDER_SPRITE;
      newBattle.oppBoard.toy.level = toy["Lvl"];
    }
  }
  return newBattle;
}

function getPetInfo(petJSON){
  const petId = Number(petJSON["Enu"] ?? 0);
  const petName = PETS[petId] ? PETS[petId].Name : "Token Pet";
  const petLevel = petJSON["Lvl"];
  const petExperience = petJSON["Exp"] ?? 0;
  const petAtk = petJSON["At"]["Perm"];
  const petHp = petJSON["Hp"]["Perm"];
  const petTempAtk = petJSON["At"]["Temp"] ?? 0;
  const petTempHp = petJSON["Hp"]["Temp"] ?? 0;
  const petPerkId = petJSON["Perk"] ?? -1;
  const petImagePath = PETS[petId] ? `Sprite/Pets/${PETS[petId].NameId}.png` : PLACEHOLDER_SPRITE;
  if(petPerkId === -1){
    return {
      "name": petName,
      "attack": petAtk,
      "health": petHp,
      "tempAttack": petTempAtk,
      "tempHealth": petTempHp,
      "level": petLevel,
      "xp": petExperience,
      "perk": null,
      "imagePath": petImagePath,
      "perkImagePath": null
    };
  }else{
    let perkName = PERKS[petPerkId] ? PERKS[petPerkId].Name : "UNKNOWN PERK";
    let perkImage = PERKS[petPerkId] ? `Sprite/Food/${PERKS[petPerkId].NameId}.png` : PLACEHOLDER_PERK;
    return {
      "name": petName,
      "attack": petAtk,
      "health": petHp,
      "tempAttack": petTempAtk,
      "tempHealth": petTempHp,
      "level": petLevel,
      "xp": petExperience,
      "perk": perkName,
      "imagePath": petImagePath,
      "perkImagePath": perkImage
    };
  }
}

async function drawPet(ctx, petJSON, x, y, flip){
  let petImage = await Canvas.loadImage(petJSON.imagePath);
  if(flip){
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(
      petImage,
      -(x + PET_WIDTH),
      y,
      PET_WIDTH,
      PET_WIDTH
    );
    ctx.restore();
  }else{
    ctx.drawImage(
      petImage,
      x,
      y,
      PET_WIDTH,
      PET_WIDTH
    );
  }

  if(petJSON.perk){
    let perkImage = await Canvas.loadImage(petJSON.perkImagePath);
    ctx.drawImage(perkImage, x + 30, y - 10, 30, 30);
  }

  ctx.fillStyle = "green";
  ctx.fillText(
    petJSON.attack + petJSON.tempAttack,
    x + PET_WIDTH/4,
    y + PET_WIDTH + 20
  );
  ctx.fillStyle = "red";
  ctx.fillText(
    petJSON.health + petJSON.tempHealth,
    x + 3 * PET_WIDTH/4,
    y + PET_WIDTH + 20
  );
  ctx.font = "12px Arial";
  ctx.fillStyle = "grey";
  ctx.fillText(
    "Lvl",
    x,
    y - 6
  );
  ctx.font = "18px Arial";
  ctx.fillStyle = "orange";
  ctx.fillText(
    petJSON.level,
    x + 18,
    y - 7.5
  );

  if(petJSON.xp < 2){
    for(let i = 0; i < 2; i++){
      ctx.beginPath();
      if(i < petJSON.xp){
        ctx.fillStyle = "orange";
      }else{
        ctx.fillStyle = "grey";
      }
      ctx.roundRect(x - 9 + i * 16, y - 2, 14, 6, 2);
      ctx.fill();
    }
  }else{
    for(let i = 0; i < 3; i++){
      ctx.beginPath();
      if(i < petJSON.xp - 2){
        ctx.fillStyle = "orange";
      }else{
        ctx.fillStyle = "grey";
      }
      ctx.roundRect(x - 9 + i * 12, y - 2, 10, 6, 2);
      ctx.fill();
    }
  }
}

async function drawToy(ctx, toyJSON, x, y){
  let toyImage = await Canvas.loadImage(toyJSON.imagePath);
  ctx.drawImage(
    toyImage,
    x,
    y,
    PET_WIDTH,
    PET_WIDTH
  );
  ctx.fillStyle = "black";
  ctx.font = "12px Arial";
  ctx.fillText(
    `Lv${toyJSON.level}`,
    x + PET_WIDTH/2,
    y + 3 * PET_WIDTH/2
  );
}

async function login(){
  let loginToken = await fetch(`https://api.teamwood.games/0.${API_VERSION}/api/user/login`, {
    method: "POST",
    body: JSON.stringify({
      "Email": process.env.SAP_EMAIL,
      "Password": process.env.SAP_PASSWORD,
      "Version": API_VERSION
    }),
    headers: {
      "Content-Type": "application/json; utf-8",
      "authority": "api.teamwood.games"
    }
  });
  if(loginToken.ok){
    let responseJSON = await loginToken.json();
    AUTH_TOKEN = responseJSON["Token"]; 
    console.log(`Ready! Logged in`);
    console.log(PETS[0]);
  }
}

client.once(Events.ClientReady, async readyClient => {
  await login();
  setInterval(login, A_DAY_IN_MS);
});

function parseReplayForCalculator(battleJson) {
  
  const userBoard = battleJson.UserBoard;
  const opponentBoard = battleJson.OpponentBoard;

  const parsePet = (petJson) => {
      if (!petJson) return null;
      const petId = String(petJson.Enu ?? 0);
      const petInfo = PETS[petId];

      if (!petInfo) {
          console.error(`[!!!] UNKNOWN PET ID FOUND: ${petId}. Please update pets.json.`);
      }
      const petTempAtk = petJson["At"]["Temp"] ?? 0;
      const petTempHp = petJson["Hp"]["Temp"] ?? 0;
      let belugaSwallowedPet = null;
      if (petId == 182) {
        const swallowedPets = petJson?.MiMs?.Lsts?.WhiteWhaleAbility || [];
        if (swallowedPets && swallowedPets.length > 0) {
          const swallowedPetId = swallowedPets[0].Enu;
          const swallowedPetName = PETS[String(swallowedPetId)]?.Name || `Pet #${swallowedPetId}`;
          belugaSwallowedPet = swallowedPetName;
        }
      }
      return {
          name: PETS[petId] ? PETS[petId].Name : null,
          attack: petJson.At?.Perm + petTempAtk || 0,
          health: petJson.Hp?.Perm + petTempHp || 0,
          exp: petJson.Exp || 0,
          equipment: petJson.Perk ? { name: PERKS[petJson.Perk]?.Name || "Unknown Perk" } : null,
          mana: petJson.Mana || 0,
          belugaSwallowedPet: belugaSwallowedPet,
          abominationSwallowedPet1: null,
          abominationSwallowedPet2: null,
          abominationSwallowedPet3: null,
          battlesFought: 0,
      };
  };

  const parseBoardPets = (boardJson) => {
      const pets = (boardJson?.Mins?.Items || []).filter(Boolean);
      const petArray = Array(5).fill(null);
      
      pets.forEach((pet, index) => {
          // Use optional chaining to safely get the position.
          let pos = pet.Poi?.x;

          // If 'Poi' or 'Poi.x' is missing, assume the position based on its
          // order in the 'Items' array. The first pet is at position 0.
          if (pos === undefined) {
              pos = index;
          }

          if (pos >= 0 && pos < 5) {
              petArray[pos] = parsePet(pet);
          } else {
          }
      });
      
      return petArray.reverse();;
  };
  
  const getToy = (boardJson) => {
      const toyItem = (boardJson?.Rel?.Items || []).find(item => item && item.Enu);
      if (toyItem) {
          const toyId = String(toyItem.Enu);
          return {
              name: TOYS[toyId] ? TOYS[toyId].Name : null,
              level: toyItem.Lvl || 1
          };
      }
      return { name: null, level: 1 };
  };

  const playerToy = getToy(userBoard);
  const opponentToy = getToy(opponentBoard);

  return {
      playerPack: PACK_MAP[userBoard.Pack] || "Turtle",
      opponentPack: PACK_MAP[opponentBoard.Pack] || "Turtle",
      playerToy: playerToy.name,
      playerToyLevel: String(playerToy.level),
      opponentToy: opponentToy.name,
      opponentToyLevel: String(opponentToy.level),
      turn: userBoard.Tur || 1,
      playerGoldSpent: userBoard.GoSp || 0,
      opponentGoldSpent: opponentBoard.GoSp || 0,
      playerRollAmount: userBoard.Rold || 0,
      opponentRollAmount: opponentBoard.Rold || 0,
      playerSummonedAmount: userBoard.MiSu || 0,
      opponentSummonedAmount: opponentBoard.MiSu || 0,
      playerLevel3Sold: userBoard.MSFL || 0,
      opponentLevel3Sold: opponentBoard.MSFL || 0,
      playerTransformationAmount: userBoard.TrTT || 0,
      opponentTransformationAmount: opponentBoard.TrTT || 0,
      playerPets: parseBoardPets(userBoard),
      opponentPets: parseBoardPets(opponentBoard),
      // Default UI settings for a clean calculator state
      angler: false, allPets: false, logFilter: null, fontSize: 13, customPacks: [],
      oldStork: false, tokenPets: false, komodoShuffle: false, mana: true,
      showAdvanced: true, ailmentEquipment: false
  };
}

function stripDefaultValues(state) {
  const strippedState = {};

  // --- Top-Level Properties ---
  // Only include properties if they differ from the calculator's default state.
  if (state.playerPack !== "Turtle") strippedState.playerPack = state.playerPack;
  if (state.opponentPack !== "Turtle") strippedState.opponentPack = state.opponentPack;
  if (state.playerToy) strippedState.playerToy = state.playerToy;
  if (state.playerToyLevel && state.playerToyLevel !== "1") strippedState.playerToyLevel = state.playerToyLevel;
  if (state.opponentToy) strippedState.opponentToy = state.opponentToy;
  if (state.opponentToyLevel && state.opponentToyLevel !== "1") strippedState.opponentToyLevel = state.opponentToyLevel;
  if (state.turn !== 11) strippedState.turn = state.turn;
  if (state.playerGoldSpent !== 10) strippedState.playerGoldSpent = state.playerGoldSpent;
  if (state.opponentGoldSpent !== 10) strippedState.opponentGoldSpent = state.opponentGoldSpent;
  if (state.playerRollAmount !== 4) strippedState.playerRollAmount = state.playerRollAmount;
  if (state.opponentRollAmount !== 4) strippedState.opponentRollAmount = state.opponentRollAmount;
  if (state.playerSummonedAmount !== 0) strippedState.playerSummonedAmount = state.playerSummonedAmount;
  if (state.opponentSummonedAmount !== 0) strippedState.opponentSummonedAmount = state.opponentSummonedAmount;
  if (state.playerLevel3Sold !== 0) strippedState.playerLevel3Sold = state.playerLevel3Sold;
  if (state.opponentLevel3Sold !== 0) strippedState.opponentLevel3Sold = state.opponentLevel3Sold;
  if (state.playerTransformationAmount !== 0) strippedState.playerTransformationAmount = state.playerTransformationAmount;
  if (state.opponentTransformationAmount !== 0) strippedState.opponentTransformationAmount = state.opponentTransformationAmount;
  
  // --- UI Flags (only include if they are `true`) ---
  if (state.angler) strippedState.angler = true;
  if (state.allPets) strippedState.allPets = true;
  if (state.oldStork) strippedState.oldStork = true;
  if (state.tokenPets) strippedState.tokenPets = true;
  if (state.komodoShuffle) strippedState.komodoShuffle = true;
  if (state.mana) strippedState.mana = true;
  if (state.showAdvanced) strippedState.showAdvanced = true;
  if (state.ailmentEquipment) strippedState.ailmentEquipment = true;

  // --- Other properties with non-boolean/null defaults ---
  if (state.logFilter) strippedState.logFilter = state.logFilter;
  if (state.fontSize !== 13) strippedState.fontSize = state.fontSize;
  if (state.customPacks && state.customPacks.length > 0) strippedState.customPacks = state.customPacks;


  // --- Nested Helper Function for Pets ---
  const stripPetDefaults = (pet) => {
      if (!pet || !pet.name) return null; // If the pet is null or has no name, it's an empty slot.
      
      const newPet = { name: pet.name }; 
      
      if (pet.attack !== 0) newPet.attack = pet.attack;
      if (pet.health !== 0) newPet.health = pet.health;
      if (pet.exp !== 0) newPet.exp = pet.exp;
      if (pet.mana !== 0) newPet.mana = pet.mana;
      if (pet.equipment) newPet.equipment = pet.equipment; 
      if (pet.belugaSwallowedPet !== null) newPet.belugaSwallowedPet = pet.belugaSwallowedPet;

      // All other pet properties like `belugaSwallowedPet`, `battlesFought`, etc.,
      // are omitted because their default is null or 0.
      
      return newPet;
  };

  // --- Process Pet Arrays ---
  // We process both arrays and then check if the entire array is just nulls.
  // If so, we can omit the whole key to save space.
  const strippedPlayerPets = state.playerPets.map(stripPetDefaults);
  if (strippedPlayerPets.some(p => p !== null)) { // Check if there's at least one non-null pet
      strippedState.playerPets = strippedPlayerPets;
  }

  const strippedOpponentPets = state.opponentPets.map(stripPetDefaults);
  if (strippedOpponentPets.some(p => p !== null)) { // Check if there's at least one non-null pet
      strippedState.opponentPets = strippedOpponentPets;
  }

  return strippedState;
}

const KEY_MAP = {
  "playerPack": "pP", "opponentPack": "oP", "playerToy": "pT", "playerToyLevel": "pTL",
  "opponentToy": "oT", "opponentToyLevel": "oTL", "turn": "t", "playerGoldSpent": "pGS",
  "opponentGoldSpent": "oGS", "playerRollAmount": "pRA", "opponentRollAmount": "oRA",
  "playerSummonedAmount": "pSA", "opponentSummonedAmount": "oSA", "playerLevel3Sold": "pL3",
  "opponentLevel3Sold": "oL3", "playerPets": "p", "opponentPets": "o", "angler": "an",
  "allPets": "ap", "logFilter": "lf", "fontSize": "fs", "customPacks": "cp",
  "oldStork": "os", "tokenPets": "tp", "komodoShuffle": "ks", "mana": "m",
  "showAdvanced": "sa", "ailmentEquipment": "ae", "playerTransformationAmount": "pTA", "opponentTransformationAmount": "oTA",
  // Pet Object Keys
  "name": "n", "attack": "a", "health": "h", "exp": "e", "equipment": "eq", "belugaSwallowedPet": "bSP"
};

function truncateKeys(data) {
  if (Array.isArray(data)) {
      return data.map(item => truncateKeys(item));
  }
  if (data !== null && typeof data === 'object') {
      const newObj = {};
      for (const key in data) {
          const newKey = KEY_MAP[key] || key; // Use short key if it exists, otherwise keep original
          newObj[newKey] = truncateKeys(data[key]);
      }
      return newObj;
  }
  return data; // Return primitives (strings, numbers, null) as-is
}

function generateCalculatorLink(calculatorState) {
  const baseUrl = "https://sap-calculator.com/"; 

  const strippedState = stripDefaultValues(calculatorState);
  
  const truncatedState = truncateKeys(strippedState);

  let stateString = JSON.stringify(truncatedState);
  const base64Data = Buffer.from(stateString).toString('base64');

  let finalData;
  const initialUrl =  `${baseUrl}?c=${stateString}`;

  return `${baseUrl}?c=${base64Data}`;
}


client.on('messageCreate', async (message) => {
  // check whether message contains the code format
  let participationId;
  if (message.content.trim().startsWith('{') && message.content.trim().endsWith('}')) {
    try {
      let replayObject = JSON.parse(message.content);
      participationId = replayObject["Pid"];
    }catch(e){
      return;
    }

    if(!participationId){
      message.reply("Replay Pid not found.");
      return;
    }

    // Request replay data from server
    const options = {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AUTH_TOKEN}`,
        "Authority": "api.teamwood.games",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ParticipationId: participationId,
        Turn: 1,
        Version: API_VERSION
      })
    };
    let rawReplay = await fetch(`https://api.teamwood.games/0.${API_VERSION}/api/playback/participation`, options);
    let replay = await rawReplay.json();
    let actions = replay["Actions"];
    let maxLives = replay["GenesisModeModel"] ? JSON.parse(replay["GenesisModeModel"])["MaxLives"] : 5;
    let currentLives = maxLives;
    let battles = [];
    let battleOpponentInfo = [];
    for(let i = 0; i < actions.length; i++){
      if(actions[i]["Type"] === 0){
        let battle = JSON.parse(actions[i]["Battle"]);
        // Battle detected!
        // let playerName = battle["User"]["DisplayName"];
        // let opponentName = battle["Opponent"]["DisplayName"];
        // let turnNumber = battle["UserBoard"]["Tur"];
        battles.push(getBattleInfo(battle));
      }
      if(actions[i]["Type"] === 1){
        let opponentInfo = JSON.parse(actions[i]["Mode"])["Opponents"];
        battleOpponentInfo.push(opponentInfo);
      }
    }
    let canvas = Canvas.createCanvas(CANVAS_WIDTH, battles.length * BATTLE_HEIGHT);
    let ctx = canvas.getContext("2d");

    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.fillRect(0, 0, CANVAS_WIDTH, battles.length * BATTLE_HEIGHT);
    ctx.font = "18px Arial";

    let turnNumberIconSize = (25 + PET_WIDTH) * 2;
    let livesIconSize = 15 + PET_WIDTH;

    let hourglassIcon = await Canvas.loadImage("hourglass-twemoji.png");
    let heartIcon = await Canvas.loadImage("heart-twemoji.png");
    for(let i = 0; i < battles.length; i++){
      // Turn 3 (shows up turn 4) life regain
      if(i === 2 && currentLives < maxLives){
        currentLives++;
      }
      let baseYPosition = i * BATTLE_HEIGHT + 25;

      // Draw Turn
      ctx.drawImage(hourglassIcon, 25, baseYPosition, PET_WIDTH, PET_WIDTH);
      ctx.fillStyle = "black";
      ctx.font = "24px Arial";
      ctx.fillText(i + 1, 25 + PET_WIDTH + 15, baseYPosition + PET_WIDTH/2 + 6);

      // Draw Player Lives
      ctx.drawImage(heartIcon, turnNumberIconSize, baseYPosition, PET_WIDTH, PET_WIDTH);
      ctx.fillStyle = "white";
      ctx.font = "24px Arial";
      ctx.fillText(currentLives, turnNumberIconSize + PET_WIDTH/2, baseYPosition + (PET_WIDTH - 24) + 6);
      ctx.fillStyle = "black";
      ctx.font = "18px Arial";
      let resultText;
      switch(battles[i].outcome){
        case BATTLE_OUTCOMES.LOSS:
          resultText = "LOSS";
          currentLives--;
          break;
        case BATTLE_OUTCOMES.WIN:
          resultText = "WIN";
          break;
        case BATTLE_OUTCOMES.TIE:
          resultText = "TIE";
          break;
        default:
          resultText = "ERROR IDK";
      }
      ctx.fillText(resultText, turnNumberIconSize + PET_WIDTH/2, baseYPosition + PET_WIDTH + 18 + 6);

      for(let x = 0; x < battles[i].playerBoard.boardPets.length; x++){
        let baseXPosition = x * (PET_WIDTH + 25) + 25 + turnNumberIconSize + livesIconSize;
        let petJSON = battles[i].playerBoard.boardPets[x];
        await drawPet(ctx, petJSON, baseXPosition, baseYPosition, true);
      }

      if(battles[i].playerBoard.toy.imagePath){
        drawToy(
          ctx,
          battles[i].playerBoard.toy,
          (5) * (PET_WIDTH + 25) + turnNumberIconSize + livesIconSize,
          baseYPosition
        )
      }

      // Draw opponent lives
      let opponentLivesOffset = 0;
      if(battleOpponentInfo[i]){
        let opponent = battleOpponentInfo[i].find(opponent => opponent.DisplayName === battles[i].opponentName);
        let opponentLives = opponent ? opponent.Lives : null;
        if(opponentLives){
          switch(opponent.Outcome){
            case BATTLE_OUTCOMES.LOSS:
              opponentLives++;
              break;
          }
          ctx.drawImage(heartIcon, CANVAS_WIDTH - PET_WIDTH - 25, baseYPosition, PET_WIDTH, PET_WIDTH);
          ctx.fillStyle = "white";
          ctx.font = "24px Arial";
          ctx.fillText(opponentLives, CANVAS_WIDTH - PET_WIDTH - 25 + PET_WIDTH/2, baseYPosition + (PET_WIDTH - 24) + 6);
          opponentLivesOffset = livesIconSize + 25;
        }
      }

      for(let x = 0; x < battles[i].oppBoard.boardPets.length; x++){
        let baseXPosition = CANVAS_WIDTH - (x * (PET_WIDTH + 25) + PET_WIDTH + 25 + opponentLivesOffset);
        let petJSON = battles[i].oppBoard.boardPets[x];
        await drawPet(ctx, petJSON, baseXPosition, baseYPosition, false);
      }

      if(battles[i].oppBoard.toy.imagePath){
        drawToy(
          ctx,
          battles[i].oppBoard.toy,
          CANVAS_WIDTH - ((5 + 1) * (PET_WIDTH + 25) + opponentLivesOffset),
          baseYPosition
        )
      }
    }
    message.reply({files: [{attachment: canvas.toBuffer(), name: "replay.png"}]});
  } else if (message.content.toLowerCase().startsWith('!calc ')) {
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
          const options = {
              method: "POST",
              headers: { "Authorization": `Bearer ${AUTH_TOKEN}`, "Content-Type": "application/json" },
              body: JSON.stringify({ ParticipationId: participationId, Turn: 1, Version: API_VERSION })
          };
          const rawReplay = await fetch(`https://api.teamwood.games/0.${API_VERSION}/api/playback/participation`, options);
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
  }
});


client.login(process.env.DISCORD_TOKEN);
