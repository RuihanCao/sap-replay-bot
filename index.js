require('dotenv').config();
const { Client, Events, GatewayIntentBits } = require('discord.js');
const Canvas = require('canvas');
const fs = require('fs');
const path = require('path');

let AUTH_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjEwMGE3YTVlLWNlMTItNDU5MC05ZTEwLTE0MmViOWY3ZTkwMSIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWUiOiJMR1RZUVoiLCJqdGkiOiIyYTc0MmQwYy0wNGU4LTQyN2MtOWVjMC1kY2NiZjU1MDBlNTIiLCJleHAiOjE3NTM1MTM0OTAsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6NTAwMCIsImF1ZCI6IioifQ.H-gnWFes3Qyie-VPzuBcK94voFZ1jx5KMv1B3GsaXM4";
const API_VERSION = "41";

const PLACEHOLDER_SPRITE = 'i-dunno.png';
const PLACEHOLDER_PERK = 'Sprite/Food/Tier-2/SleepingPill.png';

const CANVAS_WIDTH = 1100;
const PET_WIDTH = 50;
const BATTLE_HEIGHT = 125;

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
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "grey";
  ctx.fillText(
    "Lvl",
    x,
    y - 6
  );
  ctx.font = "18px sans-serif";
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
  ctx.font = "12px sans-serif";
  ctx.fillText(
    `Lv${toyJSON.level}`,
    x + PET_WIDTH/2,
    y + 3 * PET_WIDTH/2
  );
}

client.once(Events.ClientReady, async readyClient => {
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
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    console.log(PETS[0]);
  }
});

client.on('messageCreate', async (message) => {
  // check whether message contains the code format
  let participationId;
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
  ctx.font = "18px sans-serif";

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

    if(battles[i].playerBoard.toy.imagePath){
      drawToy(
        ctx,
        battles[i].playerBoard.toy,
        (5) * (PET_WIDTH + 25) + turnNumberIconSize,
        baseYPosition
      )
    }

    for(let x = 0; x < battles[i].oppBoard.boardPets.length; x++){
      let baseXPosition = CANVAS_WIDTH - (x * (PET_WIDTH + 25) + PET_WIDTH + 25);
      let petJSON = battles[i].oppBoard.boardPets[x];
      await drawPet(ctx, petJSON, baseXPosition, baseYPosition, false);
    }

    if(battles[i].oppBoard.toy.imagePath){
      drawToy(
        ctx,
        battles[i].oppBoard.toy,
        CANVAS_WIDTH - ((5 + 1) * (PET_WIDTH + 25)),
        baseYPosition
      )
    }
  }
  message.reply({files: [{attachment: canvas.toBuffer(), name: "replay.png"}]});
});


client.login(process.env.DISCORD_TOKEN);