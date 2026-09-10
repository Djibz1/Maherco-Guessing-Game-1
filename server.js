const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(__dirname));

const rooms = new Map();
const MIN_PLAYERS = 4;
const MAX_PLAYERS = 12;
const ROUND_COUNT = 10;
const DOUBLE_POINTS_FROM_ROUND = 7; // rounds 8-10

const rounds = [
 {cat:'SPORTS', title:'Top 10 Highest-Paid Athletes', items:['Cristiano Ronaldo','Jon Rahm','Tyson Fury','Lionel Messi','LeBron James','Stephen Curry','Giannis Antetokounmpo','Luka Dončić','Kevin Durant','Patrick Mahomes']},
 {cat:'MOVIES', title:'Top 10 Highest-Grossing Movies', items:['Avatar','Avengers: Endgame','Avatar: The Way of Water','Titanic','Star Wars: The Force Awakens','Avengers: Infinity War','Spider-Man: No Way Home','Ne Zha 2','Inside Out 2','Jurassic World']},
 {cat:'GAMES', title:'Top 10 Best-Selling Video Games', items:['Minecraft','Grand Theft Auto V','Tetris','Wii Sports','PUBG','Mario Kart 8 / Deluxe','Red Dead Redemption 2','Terraria','The Elder Scrolls V: Skyrim','Super Mario Bros.']},
 {cat:'FOOTBALL', title:"Top 10 Ballon d'Or Winners by Wins", items:['Lionel Messi','Cristiano Ronaldo','Michel Platini','Johan Cruyff','Marco van Basten','Franz Beckenbauer','Ronaldo Nazário','Zinédine Zidane','Ronaldinho','Karim Benzema']},
 {cat:'MUSIC', title:'Top 10 Best-Selling Music Artists', items:['The Beatles','Elvis Presley','Michael Jackson','Elton John','Queen','ABBA','Led Zeppelin','Madonna','Pink Floyd','Eagles']},
 {cat:'TECH', title:'Top 10 Most Valuable Companies', items:['Apple','Microsoft','Saudi Aramco','NVIDIA','Alphabet','Amazon','Meta','Berkshire Hathaway','TSMC','Broadcom']},
 {cat:'SPORTS', title:'Top 10 Most Followed Footballers on Instagram', items:['Cristiano Ronaldo','Lionel Messi','Neymar','Kylian Mbappé','Karim Benzema','Marcelo','Ronaldinho','Sergio Ramos','Mohamed Salah','Paul Pogba']},
 {cat:'COUNTRIES', title:'Top 10 Most Populous Countries', items:['India','China','United States','Indonesia','Pakistan','Nigeria','Brazil','Bangladesh','Russia','Ethiopia']},
 {cat:'GENERAL', title:'Top 10 Most Spoken Languages', items:['English','Mandarin Chinese','Hindi','Spanish','French','Arabic','Bengali','Portuguese','Russian','Urdu']},
 {cat:'SPORTS', title:'Top 10 Most Valuable Sports Teams', items:['Dallas Cowboys','Golden State Warriors','Los Angeles Rams','New York Giants','New England Patriots','Los Angeles Lakers','New York Yankees','New York Knicks','Los Angeles Dodgers','San Francisco 49ers']}
];

function makeCode(){ let c; do c=Math.random().toString(36).slice(2,8).toUpperCase(); while(rooms.has(c)); return c; }
function publicRoom(room, socketId){
  return {code:room.code,isHost:room.host===socketId,roundIndex:room.roundIndex,remaining:room.remaining,time:room.time,prize:room.prize,started:room.started,locked:room.locked,
    players:[...room.players.values()].map(p=>({id:p.id,name:p.name,score:p.score,host:p.id===room.host,submitted:p.submitted}))};
}
function broadcastLobby(room){ for(const p of room.players.values()) io.to(p.id).emit('lobbyUpdate', publicRoom(room, p.id)); }
function clearRoomTimer(room){ if(room.timer){clearInterval(room.timer); room.timer=null;} }

function startRound(room){
  room.started=true; room.submissions.clear(); room.remaining=room.time;
  for(const p of room.players.values()) p.submitted=false;
  io.to(room.code).emit('roundStarted',{roundIndex:room.roundIndex,remaining:room.remaining,players:publicRoom(room,null).players});
  clearRoomTimer(room);
  room.timer=setInterval(()=>{ room.remaining--; io.to(room.code).emit('tick',{remaining:room.remaining}); if(room.remaining<=0){clearRoomTimer(room); finishRound(room);} },1000);
}

function finishRound(room){
  if(!room.started) return;
  room.started=false;
  room.started=false;
  clearRoomTimer(room);
  const correctItems=rounds[room.roundIndex].items;
  for(const [id,sub] of room.submissions){
    const chosen=Array.isArray(sub.chosen)?sub.chosen.slice(0,10):[];
    const correct=correctItems.map((answer,i)=>chosen[i]===answer);
    const basePoints=correct.filter(Boolean).length;
    const multiplier=room.roundIndex>=DOUBLE_POINTS_FROM_ROUND?2:1;
    const points=basePoints*multiplier;
    const p=room.players.get(id); if(p){p.score+=points;p.lastResult={correct,points,multiplier};}
  }
  for(const p of room.players.values()) if(!room.submissions.has(p.id)) p.lastResult={correct:Array(10).fill(false),points:0,multiplier:room.roundIndex>=DOUBLE_POINTS_FROM_ROUND?2:1};
  const allSubmitted=room.submissions.size===room.players.size;
  for(const p of room.players.values()){
    const result=p.lastResult;
    io.to(p.id).emit('roundSubmitted',{title:`Round ${room.roundIndex+1}`,items:correctItems,correct:result.correct,points:result.points,allSubmitted,players:publicRoom(room,null).players});
  }
  setTimeout(()=>{
    if(!rooms.has(room.code)) return;
    room.roundIndex++;
    if(room.roundIndex>=ROUND_COUNT){
      const players=publicRoom(room,null).players;
      io.to(room.code).emit('finalResults',{players,prize:room.prize});
      clearRoomTimer(room); rooms.delete(room.code);
    } else startRound(room);
  },4500);
}

io.on('connection',socket=>{
  socket.on('createRoom',({name,time,prize,maxPlayers}= {})=>{
    const clean=String(name||'').trim().slice(0,30)||'Host';
    const room={code:makeCode(),host:socket.id,time:Math.max(30,Math.min(600,Number(time)||180)),prize:Math.max(0,Number(prize)||0),maxPlayers:Math.max(4,Math.min(12,Number(maxPlayers)||12)),locked:false,players:new Map(),roundIndex:0,remaining:180,started:false,submissions:new Map(),timer:null};
    room.remaining=room.time;
    room.players.set(socket.id,{id:socket.id,name:clean,score:0,submitted:false});
    rooms.set(room.code,room); socket.join(room.code);
    socket.emit('roomCreated',{...publicRoom(room,socket.id),playerId:socket.id});
  });

  socket.on('joinRoom',({code,name}= {})=>{
    const room=rooms.get(String(code||'').trim().toUpperCase());
    if(!room)return socket.emit('errorMessage','Room not found.');
    if(room.started)return socket.emit('errorMessage','The game has already started.');
    if(room.locked)return socket.emit('errorMessage','Room is locked.');
    if(room.players.size>=room.maxPlayers)return socket.emit('errorMessage',`Room is full (${room.maxPlayers} players).`);
    const clean=String(name||'').trim().slice(0,30);
    if(!clean)return socket.emit('errorMessage','Enter your name.');
    if([...room.players.values()].some(p=>p.name.toLowerCase()===clean.toLowerCase())) return socket.emit('errorMessage','That name is already in use.');
    room.players.set(socket.id,{id:socket.id,name:clean,score:0,submitted:false}); socket.join(room.code);
    socket.emit('roomJoined',{...publicRoom(room,socket.id),playerId:socket.id}); broadcastLobby(room);
  });

  socket.on('toggleRoomLock',()=>{
    for(const room of rooms.values()) if(room.host===socket.id){
      if(room.started) return socket.emit('errorMessage','The game has already started.');
      room.locked=!room.locked; broadcastLobby(room); return;
    }
  });

  socket.on('startGame',()=>{
    for(const room of rooms.values()) if(room.host===socket.id){
      if(room.players.size<MIN_PLAYERS)return socket.emit('errorMessage',`At least ${MIN_PLAYERS} players are required.`);
      startRound(room); return;
    }
  });

  socket.on('submitRound',({chosen}= {})=>{
    for(const room of rooms.values()) if(room.players.has(socket.id)&&room.started&&!room.submissions.has(socket.id)){
      room.players.get(socket.id).submitted=true;
      room.submissions.set(socket.id,{chosen:Array.isArray(chosen)?chosen.slice(0,10):[]});
      io.to(room.code).emit('scoresUpdate',{players:publicRoom(room,null).players});
      if(room.submissions.size===room.players.size) finishRound(room);
      return;
    }
  });

  socket.on('closeRoom',({code}= {})=>{
    const room=rooms.get(String(code||'').toUpperCase());
    if(!room || room.host!==socket.id) return;
    clearRoomTimer(room); io.to(room.code).emit('roomClosed'); rooms.delete(room.code);
  });

  socket.on('leaveRoom',({code}= {})=>{
    const room=rooms.get(String(code||'').toUpperCase());
    if(!room || !room.players.has(socket.id) || room.host===socket.id) return;
    room.players.delete(socket.id); room.submissions.delete(socket.id); socket.leave(room.code); socket.emit('leftRoom');
    if(room.players.size===0){clearRoomTimer(room);rooms.delete(room.code);} else broadcastLobby(room);
  });

  socket.on('disconnect',()=>{
    for(const [code,room] of rooms){
      if(!room.players.has(socket.id)) continue;
      const wasHost=room.host===socket.id;
      room.players.delete(socket.id); room.submissions.delete(socket.id);
      if(room.players.size===0){clearRoomTimer(room);rooms.delete(code);continue;}
      if(wasHost){room.host=room.players.keys().next().value;io.to(code).emit('hostChanged',{hostId:room.host});}
      if(room.started && room.submissions.size===room.players.size) finishRound(room); else broadcastLobby(room);
    }
  });
});

const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log(`TOP 10 server running on http://localhost:${PORT}`));
