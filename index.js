require('dotenv').config();
const { Client, Events, GatewayIntentBits } = require('discord.js');
const Canvas = require('canvas');
const fs = require('fs');
const path = require('path');

let AUTH_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjEwMGE3YTVlLWNlMTItNDU5MC05ZTEwLTE0MmViOWY3ZTkwMSIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWUiOiJMR1RZUVoiLCJqdGkiOiIyYTc0MmQwYy0wNGU4LTQyN2MtOWVjMC1kY2NiZjU1MDBlNTIiLCJleHAiOjE3NTM1MTM0OTAsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6NTAwMCIsImF1ZCI6IioifQ.H-gnWFes3Qyie-VPzuBcK94voFZ1jx5KMv1B3GsaXM4";
const API_VERSION = "41";

const PLACEHOLDER_SPRITE = 'i-dunno.png';
const PLACEHOLDER_PERK = 'Sprite/Food/Tier-2/SleepingPill.png';

const CANVAS_WIDTH = 1050;
const PET_WIDTH = 50;
const BATTLE_HEIGHT = 125;

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
let PETS = {};

const PERK_CODES = {
  1: {
    name: "Mushroom",
    imagePath: "Sprite/Food/Tier-6/Mushroom.png"
  },
  2: {
    name: "Peanut",
    imagePath: "Sprite/Food/Tier-6/Peanut.png"
  },

  5: {
    name: "Chili",
    imagePath: "Sprite/Food/Tier-5/Chili.png"
  },
  6: {
    name: "Meat Bone",
    imagePath: "Sprite/Food/Tier-2/MeatBone.png"
  },
  7: {
    name: "Cherry",
    imagePath: "Sprite/Food/Tier-2/Cherries.png"
  },
  8: {
    name: "Honey",
    imagePath: "Sprite/Food/Tier-1/Honey.png"
  },
  9: {
    name: "Garlic",
    imagePath: "Sprite/Food/Tier-3/Garlic.png",
  },

  12: {
    name: "Steak",
    imagePath: "Sprite/Food/Tier-6/Steak.png"
  },
  13: {
    name: "Melon",
    imagePath: "Sprite/Food/Tier-6/Melon.png"
  },
  14: {
    name: "Strawberry",
    imagePath: "Sprite/Food/Tier-1/Strawberry.png"
  },

  20: {
    name: "Croissant",
    imagePath: "Sprite/Food/Tier-3/Croissant.png"
  },

  22: {
    name: "Lemon",
    imagePath: "Sprite/Food/Tier-5/Lemon.png"
  },
  23: {
    name: "Cheese",
    imagePath: "Sprite/Food/Tier-4/Cheese.png"
  },

  25: {
    name: "Banana",
    imagePath: "Sprite/Food/Tier-4/Banana.png"
  },

  30: {
    name: "Chocolate Cake",
    imagePath: "Sprite/Food/Tier-2/ChocolateCake.png"
  },

  33: {
    name: "Pita Bread",
    imagePath: "Sprite/Food/Tier-6/PitaBread.png"
  },
  34: {
    name: "Tomato",
    imagePath: "Sprite/Food/Tier-6/Tomato.png"
  },
  35: {
    name: "Pancakes",
    imagePath: "Sprite/Food/Tier-6/Pancakes.png"
  },

  39: {
    name: "Pie",
    imagePath: "Sprite/Food/Tier-4/Pie.png"
  },

  45: {
    name: "Durian",
    imagePath: "Sprite/Food/Tier-5/Durian.png"
  },
  46: {
    name: "Fig",
    imagePath: "Sprite/Food/Tier-3/Fig.png"
  },

  64: {
    name: "Baguette",
    imagePath: "Sprite/Food/Tier-4/Baguette.png"
  },

  67: {
    name: "Caramel",
    imagePath: "Sprite/Food/Tier-2/Caramel.png"
  },
  68: {
    name: "Eucalyptus",
    imagePath: PLACEHOLDER_PERK
  },

  72: {
    name: "Seaweed",
    imagePath: "Sprite/Food/Tier-2/Seaweed.png"
  }
};

function getBattleInfo(battle){
  let newBattle = {};
  newBattle.playerBoard = {
    boardPets: [],
    toy: {
      name: "",
      level: 0
    }
  };

  newBattle.oppBoard = {
    boardPets: [],
    toy: {
      name: "",
      level: 0
    }
  };

  for(let petJSON of battle["UserBoard"]["Mins"]["Items"]){
    if(petJSON !== null){
      newBattle.playerBoard.boardPets.push(getPetInfo(petJSON));
    }
  }

  for(let toy of battle["UserBoard"]["Rel"]["Items"]){
    if(toy !== null && toy["Enu"]){
      let toyId = toy["Enu"];
      newBattle.playerBoard.toy.name = PETS[toyId] ? PETS[toyId].petName : "UNKNOWN TOY";
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
      newBattle.oppBoard.toy.name = PETS[toyId] ? PETS[toyId].petName : "UNKNOWN TOY";
      newBattle.oppBoard.toy.level = toy["Lvl"];
    }
  }
  return newBattle;
}

function getPetInfo(petJSON){
  const petId = Number(petJSON["Enu"] ?? 0);
  const petName = PETS[petId] ? PETS[petId].petName : "Token Pet";
  const petLevel = petJSON["Lvl"];
  const petAtk = petJSON["At"]["Perm"];
  const petHp = petJSON["Hp"]["Perm"];
  const petTempAtk = petJSON["At"]["Temp"] ?? 0;
  const petTempHp = petJSON["Hp"]["Temp"] ?? 0;
  const petPerkId = petJSON["Perk"] ?? -1;
  const petImagePath = PETS[petId] ? PETS[petId].imagePath : PLACEHOLDER_SPRITE;
  if(petPerkId === -1){
    return {
      "name": petName,
      "attack": petAtk,
      "health": petHp,
      "tempAttack": petTempAtk,
      "tempHealth": petTempHp,
      "level": petLevel,
      "perk": null,
      "imagePath": petImagePath,
      "perkImagePath": null
    };
  }else{
    let perkName = PERK_CODES[petPerkId] ? PERK_CODES[petPerkId].name : "UNKNOWN PERK";
    let perkImage = PERK_CODES[petPerkId] ? PERK_CODES[petPerkId].imagePath : PLACEHOLDER_PERK;
    return {
      "name": petName,
      "attack": petAtk,
      "health": petHp,
      "tempAttack": petTempAtk,
      "tempHealth": petTempHp,
      "level": petLevel,
      "perk": perkName,
      "imagePath": petImagePath,
      "perkImagePath": perkImage
    };
  }
}

async function drawPet(ctx, petJSON, x, y, flip){
  console.log(petJSON.name, petJSON.imagePath);
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
    console.log(petJSON.perkImagePath);
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
}

client.once(Events.ClientReady, async readyClient => {
  let raw_pets = fs.readFileSync("pets.tsv", {encoding: 'utf-8'});
  let rows = raw_pets.split("\n");
  console.log(rows.length);
  for(let r of rows){
    let row = r.split("\t");
    PETS[row[1]] = {
      petName: row[0],
      imagePath: row.length > 2 ? row[2] : PLACEHOLDER_SPRITE
    };
  }

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
  console.log(loginToken);
  if(loginToken.ok){
    let responseJSON = await loginToken.json();
    AUTH_TOKEN = responseJSON["Token"]; 
    console.log(AUTH_TOKEN);
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    console.log(PETS[0]);
  }
});

client.on('messageCreate', async (message) => {
  // check whether message contains the code format
  let participationId;
  console.log("Message received");
  if(!(message.content.includes("{") && message.content.includes("}"))){
    return;
  }
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
  console.log(`Bearer ${AUTH_TOKEN}`);
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
  console.log(rawReplay);
  let replay = await rawReplay.json();
  let actions = replay["Actions"];
  let battles = [];
  for(let i = 0; i < actions.length; i++){
    if(actions[i]["Type"] === 0){
      let battle = JSON.parse(actions[i]["Battle"]);
      // Battle detected!
      // let playerName = battle["User"]["DisplayName"];
      // let opponentName = battle["Opponent"]["DisplayName"];
      // let turnNumber = battle["UserBoard"]["Tur"];
      battles.push(getBattleInfo(battle));
    }
  }

  let canvas = Canvas.createCanvas(CANVAS_WIDTH, battles.length * BATTLE_HEIGHT);
  let ctx = canvas.getContext("2d");

  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.fillRect(0, 0, CANVAS_WIDTH, battles.length * BATTLE_HEIGHT);
  ctx.font = "18px Arial";

  let turnNumberIconSize = 25 + PET_WIDTH * 2 + 15;

  let hourglassIcon = await Canvas.loadImage("hourglass-twemoji.png");
  let heartIcon = await Canvas.loadImage("heart-twemoji.png");
  for(let i = 0; i < battles.length; i++){
    let baseYPosition = i * BATTLE_HEIGHT + 25;
    ctx.drawImage(hourglassIcon, 25, baseYPosition, PET_WIDTH, PET_WIDTH);
    ctx.fillStyle = "black";
    ctx.fillText(i + 1, 25 + PET_WIDTH + 15, baseYPosition + PET_WIDTH/2);

    for(let x = 0; x < battles[i].playerBoard.boardPets.length; x++){
      let baseXPosition = x * (PET_WIDTH + 25) + 25 + turnNumberIconSize;
      let petJSON = battles[i].playerBoard.boardPets[x];
      await drawPet(ctx, petJSON, baseXPosition, baseYPosition, true);
    }


    for(let x = 0; x < battles[i].oppBoard.boardPets.length; x++){
      let baseXPosition = CANVAS_WIDTH - (x * (PET_WIDTH + 25) + PET_WIDTH + 25);
      let petJSON = battles[i].oppBoard.boardPets[x];
      await drawPet(ctx, petJSON, baseXPosition, baseYPosition, false);
    }
  }
  message.reply({files: [{attachment: canvas.toBuffer(), name: "replay.png"}]});
});


client.login(process.env.DISCORD_TOKEN);