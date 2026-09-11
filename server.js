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

const QUESTION_BANK = [
{topic:'football',cat:'FOOTBALL',title:"Top 10 Countries with the Most FIFA World Cup Titles",items:['Brazil','Germany','Italy','Argentina','France','Uruguay','England','Spain','Netherlands','Hungary']},
{topic:'football',cat:'FOOTBALL',title:"Top 10 Players with the Most Ballon d'Or Wins",items:['Lionel Messi','Cristiano Ronaldo','Michel Platini','Johan Cruyff','Marco van Basten','Franz Beckenbauer','Ronaldo Nazário','Zinédine Zidane','Alfredo Di Stéfano','Kevin Keegan']},
{topic:'football',cat:'FOOTBALL',title:'Top 10 Clubs with the Most UEFA Champions League Titles',items:['Real Madrid','AC Milan','Liverpool','Bayern Munich','Barcelona','Ajax','Inter Milan','Manchester United','Benfica','Nottingham Forest']},
{topic:'football',cat:'FOOTBALL',title:'Top 10 International Goal Scorers in Men’s Football',items:['Cristiano Ronaldo','Lionel Messi','Ali Daei','Sunil Chhetri','Mokhtar Dahari','Ali Mabkhout','Romelu Lukaku','Robert Lewandowski','Godfrey Chitalu','Ferenc Puskás']},
{topic:'football',cat:'FOOTBALL',title:'Top 10 Most Expensive Football Transfers',items:['Neymar','Kylian Mbappé','João Félix','Antoine Griezmann','Philippe Coutinho','Declan Rice','Jack Grealish','Moises Caicedo','Enzo Fernández','Ousmane Dembélé']},
{topic:'football',cat:'FOOTBALL',title:'Top 10 Players with the Most UEFA Champions League Goals',items:['Cristiano Ronaldo','Lionel Messi','Robert Lewandowski','Karim Benzema','Raúl','Ruud van Nistelrooy','Thomas Müller','Kylian Mbappé','Thierry Henry','Erling Haaland']},
{topic:'football',cat:'FOOTBALL',title:'Top 10 Countries by FIFA World Cup Appearances',items:['Brazil','Germany','Argentina','Mexico','Italy','France','England','Spain','Uruguay','Belgium']},
{topic:'f1',cat:'FORMULA 1',title:'Top 10 Formula 1 Drivers by World Championships',items:['Lewis Hamilton','Michael Schumacher','Juan Manuel Fangio','Sebastian Vettel','Alain Prost','Max Verstappen','Jack Brabham','Jackie Stewart','Niki Lauda','Nelson Piquet']},
{topic:'f1',cat:'FORMULA 1',title:'Top 10 Formula 1 Drivers by Race Wins',items:['Lewis Hamilton','Michael Schumacher','Max Verstappen','Sebastian Vettel','Alain Prost','Ayrton Senna','Fernando Alonso','Nigel Mansell','Jackie Stewart','Jim Clark']},
{topic:'f1',cat:'FORMULA 1',title:'Top 10 Formula 1 Teams by Constructors’ Championships',items:['Ferrari','McLaren','Williams','Mercedes','Red Bull Racing','Lotus','Cooper','Renault','Brabham','Tyrrell']},
{topic:'f1',cat:'FORMULA 1',title:'Top 10 Drivers by Formula 1 Pole Positions',items:['Lewis Hamilton','Michael Schumacher','Ayrton Senna','Sebastian Vettel','Max Verstappen','Jim Clark','Alain Prost','Nigel Mansell','Nico Rosberg','Juan Manuel Fangio']},
{topic:'athletes',cat:'ATHLETES',title:'Top 10 Athletes with the Most Olympic Gold Medals',items:['Michael Phelps','Larisa Latynina','Paavo Nurmi','Mark Spitz','Carl Lewis','Usain Bolt','Birgit Fischer','Allyson Felix','Lenny Krayzelburg','Jenny Thompson']},
{topic:'athletes',cat:'ATHLETES',title:'Top 10 Highest-Paid Athletes in a Single Year',items:['Cristiano Ronaldo','Jon Rahm','Lionel Messi','LeBron James','Stephen Curry','Giannis Antetokounmpo','Luka Dončić','Kevin Durant','Patrick Mahomes','Tiger Woods']},
{topic:'athletes',cat:'ATHLETES',title:'Top 10 Most Decorated Olympic Athletes by Total Medals',items:['Michael Phelps','Larisa Latynina','Marit Bjørgen','Nikolai Andrianov','Ole Einar Bjørndalen','Edoardo Mangiarotti','Boris Shakhlin','Paavo Nurmi','Dara Torres','Natalie Coughlin']},
{topic:'movies',cat:'MOVIES',title:'Top 10 Highest-Grossing Movies Worldwide',items:['Avatar','Avengers: Endgame','Avatar: The Way of Water','Titanic','Ne Zha 2','Star Wars: The Force Awakens','Avengers: Infinity War','Spider-Man: No Way Home','Zootopia 2','Inside Out 2']},
{topic:'movies',cat:'MOVIES',title:'Top 10 Highest-Grossing Animated Movies',items:['Ne Zha 2','Inside Out 2','Zootopia 2','The Lion King','Inside Out','Despicable Me 4','Toy Story 4','Toy Story 3','Moana 2','Finding Dory']},
{topic:'movies',cat:'MOVIES',title:'Top 10 Movies with the Most Academy Award Wins',items:['The Lord of the Rings: The Return of the King','Titanic','Ben-Hur','West Side Story','Gone with the Wind','The Last Emperor','Gandhi','Amadeus','Slumdog Millionaire','Cabaret']},
{topic:'tv',cat:'TV SHOWS',title:'Top 10 Most-Watched TV Series on Netflix',items:['Squid Game','Wednesday','Stranger Things','Adolescence','Bridgerton','DAHMER','Money Heist','Lupin','The Queen’s Gambit','Fool Me Once']},
{topic:'anime',cat:'ANIME',title:'Top 10 Best-Selling Manga Series',items:['One Piece','Doraemon','Golgo 13','Detective Conan','Dragon Ball','Naruto','Slam Dunk','KochiKame','Demon Slayer','Crayon Shin-chan']},
{topic:'anime',cat:'ANIME',title:'Top 10 Longest-Running Anime Series',items:['Sazae-san','Nintama Rantarō','Ojarumaru','Doraemon','Crayon Shin-chan','Chibi Maruko-chan','Detective Conan','One Piece','Anpanman','Pokémon']},
{topic:'superheroes',cat:'SUPERHEROES',title:'Top 10 Highest-Grossing Superhero Movies',items:['Avengers: Endgame','Spider-Man: No Way Home','Avengers: Infinity War','The Avengers','Avengers: Age of Ultron','Black Panther','Deadpool & Wolverine','Iron Man 3','Captain America: Civil War','Spider-Man: Far From Home']},
{topic:'disney',cat:'DISNEY',title:'Top 10 Highest-Grossing Disney Animated Films',items:['The Lion King','Frozen II','Frozen','Zootopia','Moana','Big Hero 6','Tangled','Ralph Breaks the Internet','Encanto','Moana 2']},
{topic:'netflix',cat:'NETFLIX',title:'Top 10 Most-Watched Netflix Films',items:['Red Notice','Don’t Look Up','Carry-On','The Adam Project','Bird Box','Back in Action','Leave the World Behind','The Gray Man','Damsel','We Can Be Heroes']},
{topic:'horror',cat:'HORROR',title:'Top 10 Highest-Grossing Horror Movies',items:['It','It Chapter Two','The Exorcist','The Nun','The Nun II','A Quiet Place','A Quiet Place Part II','The Conjuring','The Conjuring 2','Annabelle: Creation']},
{topic:'actors',cat:'ACTORS & ACTRESSES',title:'Top 10 Actors with the Most Academy Award Acting Nominations',items:['Meryl Streep','Katharine Hepburn','Jack Nicholson','Bette Davis','Laurence Olivier','Spencer Tracy','Paul Newman','Al Pacino','Denzel Washington','Glenn Close']},
{topic:'characters',cat:'FAMOUS CHARACTERS',title:'Top 10 Iconic Movie Characters',items:['James Bond','Indiana Jones','Harry Potter','Darth Vader','Rocky Balboa','Forrest Gump','Jack Sparrow','Ellen Ripley','The Joker','Terminator']},
{topic:'video_games',cat:'VIDEO GAMES',title:'Top 10 Best-Selling Video Games of All Time',items:['Minecraft','Grand Theft Auto V','Tetris','Wii Sports','PUBG','Mario Kart 8 / Deluxe','Red Dead Redemption 2','Terraria','The Elder Scrolls V: Skyrim','The Witcher 3']},
{topic:'playstation',cat:'PLAYSTATION',title:'Top 10 Best-Selling PlayStation Games',items:['Grand Theft Auto V','Gran Turismo 3: A-Spec','Gran Turismo 5','Gran Turismo 4','Gran Turismo Sport','The Last of Us','Final Fantasy VII','Gran Turismo 2','Gran Turismo','God of War']},
{topic:'xbox',cat:'XBOX',title:'Top 10 Xbox Game Franchises',items:['Halo','Minecraft','Forza','Gears of War','Fable','Age of Empires','Microsoft Flight Simulator','Sea of Thieves','State of Decay','Killer Instinct']},
{topic:'nintendo',cat:'NINTENDO',title:'Top 10 Best-Selling Nintendo Franchises',items:['Mario','Pokémon','Wii Series','The Legend of Zelda','Animal Crossing','Super Smash Bros.','Donkey Kong','Kirby','Splatoon','Fire Emblem']},
{topic:'game_characters',cat:'GAME CHARACTERS',title:'Top 10 Iconic Video Game Characters',items:['Mario','Pikachu','Sonic the Hedgehog','Link','Lara Croft','Pac-Man','Master Chief','Kratos','Steve','Donkey Kong']},
{topic:'gaming_franchises',cat:'GAMING FRANCHISES',title:'Top 10 Best-Selling Video Game Franchises',items:['Mario','Pokémon','Call of Duty','Tetris','Grand Theft Auto','Minecraft','FIFA / EA Sports FC','The Sims','Wii','Final Fantasy']},
{topic:'esports',cat:'ESPORTS',title:'Top 10 Esports Games by Prize Money Awarded',items:['Dota 2','Fortnite','League of Legends','Counter-Strike','Arena of Valor','PUBG Mobile','PUBG','Rainbow Six Siege','StarCraft II','Overwatch']},
{topic:'open_world',cat:'OPEN-WORLD GAMES',title:'Top 10 Best-Selling Open-World Games',items:['Grand Theft Auto V','Minecraft','Red Dead Redemption 2','The Elder Scrolls V: Skyrim','The Legend of Zelda: Breath of the Wild','Terraria','Grand Theft Auto: San Andreas','Grand Theft Auto IV','The Witcher 3','Cyberpunk 2077']},
{topic:'music_artists',cat:'MUSIC',title:'Top 10 Best-Selling Music Artists of All Time',items:['The Beatles','Elvis Presley','Michael Jackson','Elton John','Queen','ABBA','Led Zeppelin','Madonna','Pink Floyd','Eagles']},
{topic:'music_songs',cat:'MUSIC',title:'Top 10 Best-Selling Singles of All Time',items:['White Christmas','Candle in the Wind 1997','Rock Around the Clock','I Will Always Love You','In the Summertime','Silent Night','We Are the World','My Heart Will Go On','I Want to Hold Your Hand','Despacito']},
{topic:'music_albums',cat:'MUSIC',title:'Top 10 Best-Selling Albums of All Time',items:['Thriller','Back in Black','The Dark Side of the Moon','The Bodyguard','Bat Out of Hell','Their Greatest Hits (1971–1975)','Rumours','Saturday Night Fever','Led Zeppelin IV','Come On Over']},
{topic:'music_rappers',cat:'RAPPERS',title:'Top 10 Best-Selling Rappers by Album Sales',items:['Eminem','Drake','Tupac Shakur','Jay-Z','Kanye West','Nicki Minaj','50 Cent','Lil Wayne','Nelly','Snoop Dogg']},
{topic:'music_bands',cat:'BANDS',title:'Top 10 Best-Selling Bands of All Time',items:['The Beatles','Queen','ABBA','Led Zeppelin','Pink Floyd','The Rolling Stones','AC/DC','Maroon 5','U2','Aerosmith']},
{topic:'arabic_music',cat:'ARABIC MUSIC',title:'Top 10 Popular Arabic Music Artists',items:['Amr Diab','Nancy Ajram','Elissa','Tamer Hosny','Sherine','Mohamed Ramadan','Kadim Al Sahir','Wael Kfoury','Assala','Hussain Al Jassmi']},
{topic:'arabic_singers',cat:'ARABIC SINGERS',title:'Top 10 Influential Arab Singers',items:['Umm Kulthum','Fairuz','Abdel Halim Hafez','Mohamed Abdel Wahab','Amr Diab','Kadim Al Sahir','Warda','Majida El Roumi','George Wassouf','Ragheb Alama']},
{topic:'arabic_songs',cat:'ARABIC SONGS',title:'Top 10 Iconic Arabic Songs',items:['Enta Omri','Nassam Alayna El Hawa','Ahwak','Alf Leila Wa Leila','Khosara Khosara','Tamally Maak','Ana Fi Entezarak','Baeed Annak','Law Kont','Sidi Mansour']},
{topic:'countries',cat:'COUNTRIES',title:'Top 10 Most Populous Countries',items:['India','China','United States','Indonesia','Pakistan','Nigeria','Brazil','Bangladesh','Russia','Ethiopia']},
{topic:'cities',cat:'CITIES',title:'Top 10 Largest Urban Areas by Population',items:['Tokyo','Delhi','Shanghai','Dhaka','Cairo','São Paulo','Mexico City','Beijing','Mumbai','Osaka']},
{topic:'capitals',cat:'CAPITALS',title:'Top 10 National Capitals by Population',items:['Tokyo','Beijing','Cairo','Mexico City','Dhaka','Kinshasa','Lima','Seoul','Jakarta','Moscow']},
{topic:'landmarks',cat:'LANDMARKS',title:'Top 10 Famous Tourist Attractions',items:['Times Square','Central Park','Disneyland Park','Eiffel Tower','Niagara Falls','Grand Bazaar','Forbidden City','Louvre Museum','Great Wall of China','Colosseum']},
{topic:'geography',cat:'GEOGRAPHY',title:'Top 10 Largest Countries by Area',items:['Russia','Canada','China','United States','Brazil','Australia','India','Argentina','Kazakhstan','Algeria']},
{topic:'languages',cat:'LANGUAGES',title:'Top 10 Most Spoken Languages',items:['English','Mandarin Chinese','Hindi','Spanish','French','Modern Standard Arabic','Bengali','Portuguese','Russian','Urdu']},
{topic:'history',cat:'HISTORY',title:'Top 10 Longest-Serving U.S. Presidents by Time in Office',items:['Franklin D. Roosevelt','Grover Cleveland','Woodrow Wilson','Harry S. Truman','Dwight D. Eisenhower','Andrew Jackson','James Madison','James Monroe','Theodore Roosevelt','Bill Clinton']},
{topic:'science',cat:'SCIENCE',title:'Top 10 Most Common Elements in Earth’s Crust',items:['Oxygen','Silicon','Aluminum','Iron','Calcium','Sodium','Potassium','Magnesium','Hydrogen','Titanium']},
{topic:'space',cat:'SPACE',title:'Top 10 Largest Moons in the Solar System',items:['Ganymede','Titan','Callisto','Io','Moon','Europa','Triton','Titania','Rhea','Oberon']},
{topic:'inventions',cat:'INVENTIONS',title:'Top 10 Inventions That Changed the World',items:['Printing Press','Electricity Grid','Internet','Telephone','Internal Combustion Engine','Airplane','Computer','Vaccination','Radio','Steam Engine']},
{topic:'famous_people',cat:'FAMOUS PEOPLE',title:'Top 10 Most Followed People on Instagram',items:['Cristiano Ronaldo','Lionel Messi','Selena Gomez','Kylie Jenner','Dwayne Johnson','Ariana Grande','Kim Kardashian','Beyoncé','Khloé Kardashian','Justin Bieber']},
{topic:'world_records',cat:'WORLD RECORDS',title:'Top 10 Fastest Land Animals',items:['Cheetah','Pronghorn','Springbok','Wildebeest','Lion','Blackbuck','Hare','Greyhound','Ostrich','Coyote']},
{topic:'food',cat:'FOOD',title:'Top 10 Popular Cuisines in the World',items:['Italian','Japanese','Chinese','Indian','Mexican','French','Thai','Spanish','Turkish','Greek']},
{topic:'fast_food',cat:'FAST FOOD',title:'Top 10 Largest Fast-Food Chains by Global Store Count',items:["McDonald’s","Subway","Starbucks","KFC","Domino’s Pizza","Burger King","Pizza Hut","Dunkin’","Baskin-Robbins","Wendy’s"]},
{topic:'cars',cat:'CARS',title:'Top 10 Best-Selling Car Models of All Time',items:['Toyota Corolla','Ford F-Series','Volkswagen Golf','Honda Civic','Volkswagen Passat','Lada Riva','Honda Accord','Ford Escort','Volkswagen Beetle','Toyota Camry']},
{topic:'luxury',cat:'LUXURY',title:'Top 10 Valuable Luxury Brands',items:['Louis Vuitton','Chanel','Hermès','Gucci','Dior','Cartier','Rolex','Tiffany & Co.','Prada','Burberry']},
{topic:'brands',cat:'BRANDS',title:'Top 10 Most Valuable Global Brands',items:['Apple','Microsoft','Google','Amazon','McDonald’s','Coca-Cola','Instagram','Facebook','Oracle','Visa']},
{topic:'animals',cat:'ANIMALS',title:'Top 10 Largest Land Animals',items:['African Bush Elephant','Asian Elephant','White Rhinoceros','Indian Rhinoceros','Hippopotamus','Giraffe','Gaur','American Bison','Cape Buffalo','Moose']},
{topic:'business',cat:'BUSINESS',title:'Top 10 Largest Companies by Market Capitalization',items:['NVIDIA','Apple','Microsoft','Alphabet','Amazon','Saudi Aramco','Meta','Broadcom','TSMC','Berkshire Hathaway']},
{topic:'tech_companies',cat:'TECHNOLOGY',title:'Top 10 Most Valuable Technology Companies',items:['NVIDIA','Apple','Microsoft','Alphabet','Amazon','Meta','Broadcom','TSMC','Oracle','Tencent']},
{topic:'phones',cat:'PHONES',title:'Top 10 Best-Selling Mobile Phone Models of All Time',items:['Nokia 1100','Nokia 1110','Apple iPhone 6 / 6 Plus','Nokia 105','Nokia 1200','Nokia 5230','Nokia 3210','Nokia 1208','Nokia 2600','Motorola RAZR V3']},
{topic:'computers',cat:'COMPUTERS',title:'Top 10 Important Computer Operating Systems',items:['Windows','macOS','Linux','Android','iOS','Unix','MS-DOS','ChromeOS','Ubuntu','FreeBSD']},
{topic:'ai',cat:'AI',title:'Top 10 Major AI Companies and Platforms',items:['NVIDIA','OpenAI','Google DeepMind','Microsoft','Anthropic','Meta AI','Amazon Web Services','xAI','Mistral AI','Cohere']},
{topic:'internet',cat:'INTERNET',title:'Top 10 Most Visited Websites Worldwide',items:['Google','YouTube','Facebook','Instagram','X','Wikipedia','Reddit','ChatGPT','Amazon','Yahoo']},
{topic:'social_media',cat:'SOCIAL MEDIA',title:'Top 10 Social Platforms by Monthly Active Users',items:['Facebook','YouTube','Instagram','WhatsApp','TikTok','WeChat','Telegram','Messenger','Snapchat','X']}
];
const TOPIC_GROUPS={sports:['football','f1','athletes'],entertainment:['movies','tv','anime','superheroes','disney','netflix','horror','actors','characters'],gaming:['video_games','playstation','xbox','nintendo','game_characters','gaming_franchises','esports','open_world'],music:['music_artists','music_songs','music_albums','music_rappers','music_bands','arabic_music','arabic_singers','arabic_songs'],world:['countries','cities','capitals','landmarks','geography','languages'],knowledge:['history','science','space','inventions','famous_people','world_records'],lifestyle:['food','fast_food','cars','luxury','brands','animals','business'],technology:['tech_companies','phones','computers','ai','internet','social_media']};
const ALL_TOPICS=Object.values(TOPIC_GROUPS).flat();
function normalizeTopics(topics){const valid=new Set(ALL_TOPICS);return [...new Set((Array.isArray(topics)?topics:[]).map(String).filter(x=>valid.has(x)))];}
function pickRounds(selectedTopics){const allowed=new Set(normalizeTopics(selectedTopics));let pool=QUESTION_BANK.filter(q=>allowed.has(q.topic)).sort(()=>Math.random()-.5);if(!pool.length)pool=QUESTION_BANK.slice().sort(()=>Math.random()-.5);const base=pool.slice();while(pool.length<ROUND_COUNT)pool.push(base[pool.length%base.length]);return pool.slice(0,ROUND_COUNT);}
const rounds=QUESTION_BANK;

function makeCode(){ let c; do c=Math.random().toString(36).slice(2,8).toUpperCase(); while(rooms.has(c)); return c; }
function publicRoom(room, socketId){
  return {code:room.code,isHost:room.host===socketId,roundIndex:room.roundIndex,remaining:room.remaining,time:room.time,prize:room.prize,maxPlayers:room.maxPlayers,selectedTopics:room.selectedTopics,started:room.started,locked:room.locked,
    players:[...room.players.values()].map(p=>({id:p.id,name:p.name,score:p.score,host:p.id===room.host,submitted:p.submitted}))};
}
function broadcastLobby(room){ for(const p of room.players.values()) io.to(p.id).emit('lobbyUpdate', publicRoom(room, p.id)); }
function clearRoomTimer(room){ if(room.timer){clearInterval(room.timer); room.timer=null;} }

function startRound(room){
  room.started=true; room.submissions.clear(); room.remaining=room.time;
  for(const p of room.players.values()) p.submitted=false;
  io.to(room.code).emit('roundStarted',{roundIndex:room.roundIndex,remaining:room.remaining,round:room.rounds[room.roundIndex],players:publicRoom(room,null).players});
  clearRoomTimer(room);
  room.timer=setInterval(()=>{ room.remaining--; io.to(room.code).emit('tick',{remaining:room.remaining}); if(room.remaining<=0){clearRoomTimer(room); finishRound(room);} },1000);
}

function finishRound(room){
  if(!room.started) return;
  room.started=false;
  room.started=false;
  clearRoomTimer(room);
  const correctItems=room.rounds[room.roundIndex].items;
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
  socket.on('createRoom',({name,time,prize,maxPlayers,topics}= {})=>{
    const clean=String(name||'').trim().slice(0,30)||'Host';
    const selectedTopics=normalizeTopics(topics); if(selectedTopics.length===0)return socket.emit('errorMessage','Select at least one topic.');
    const room={code:makeCode(),host:socket.id,time:Math.max(30,Math.min(600,Number(time)||180)),prize:Math.max(0,Number(prize)||0),maxPlayers:Math.max(4,Math.min(12,Number(maxPlayers)||12)),selectedTopics,rounds:pickRounds(selectedTopics),locked:false,players:new Map(),roundIndex:0,remaining:180,started:false,submissions:new Map(),timer:null};
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
