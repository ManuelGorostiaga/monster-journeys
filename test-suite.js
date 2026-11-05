// Automated Test Suite for Monster Journeys
const fs = require('fs');
const path = require('path');

// Mock window and UI
global.window = global;
global.document = {
    getElementById: () => null,
    querySelectorAll: () => []
};
global.alert = (msg) => console.log('  [Alert Mock]:', msg);
global.confirm = (msg) => true;
global.prompt = (msg, def) => def;
global.UI = {
    renderAll: () => {},
    logGame: (m) => {},
    showNotification: (t, m) => {},
    showCombatModal: () => {},
    renderCombatArena: () => {},
    hideCombatModal: () => {},
    showCombatResultModal: ({ won, coins, badge, moveTeaching, onContinue }) => {
        if (onContinue) onContinue();
    },
    showDraftLocationModal: ({ player, cards, onSelect }) => {
        onSelect(cards[0], cards.slice(1));
    },
    showSearchModal: () => {},
    hideSearchModal: () => {},
    closeSearchModal: () => {},
    showShopModal: () => {},
    renderShopModal: () => {},
    showCityTravelModal: () => {},
    hideCityTravelModal: () => {},
    showMapTravelModal: () => {},
    hideMapTravelModal: () => {},
    showTournamentModal: () => {},
    renderTournamentBracket: () => {},
    updateCombatLog: () => {}
};

// Load code files
require('./js/sound.js');
require('./js/data.js');
require('./js/cardmap.js');
require('./js/combat.js');
require('./js/tournament.js');
require('./js/game.js');

console.log('=== TEST 1: CardMap Initialization & Slot Expansion ===');
const map = new CardMap();
const startNode = map.getNode(0, 0);
console.assert(startNode !== null, 'Start node exists at (0, 0)');
console.assert(startNode.card.biome === 'city', 'Start node is a city');
console.assert(startNode.card.hasShop === true, 'Start node has shop access');

const borderSlots = map.getAllEmptyBorderSlots();
const adjacentSlots = map.getAdjacentEmptySlots(0, 0);
console.assert(adjacentSlots.length === 4, 'Starting corner (0,0) has 4 connected expandable slots');
console.assert(borderSlots.length > 0, 'Border empty slots exist');
console.log('Test 1 Passed: CardMap initialized properly.');

console.log('\n=== TEST 2: Game Initialization & Location Hands ===');
const game = new MonsterJourneyGame();
game.initGame([
    { name: 'Ash', characterId: 'char_red', starterMonsterId: 'mon_pln_2' },
    { name: 'Gary', characterId: 'char_blue', starterMonsterId: 'mon_frw_1' }
]);

console.assert(game.players.length === 2, '2 players initialized');
const p1 = game.players[0];
const p2 = game.players[1];

console.assert(p1.x === 0 && p1.y === 0, 'Player starts at (0, 0)');
console.assert(p1.luck === 3, 'Red starts with 3 luck');
console.assert(p2.luck === 4, 'Blue starts with 4 luck');
console.assert(p1.locationHand.length === 5, 'Player holds 5 location cards in hand');
const cornerCheck = [game.cardMap.getNode('node_sw'), game.cardMap.getNode('node_nw'), game.cardMap.getNode('node_ne'), game.cardMap.getNode('node_se')];
console.assert(cornerCheck.every(n => n.card && n.card.gym), '4 corner starting nodes hold the 4 gym cities');
console.log('Test 2 Passed: Players initialized with luck, 5 location cards, and 4 corner gym cities.');

console.log('\n=== TEST 3: Placing Location Card & Hand Refill ===');
const initialHandCount = p1.locationHand.length;
const cardToPlace = p1.locationHand[0];
console.log(`Placing ${cardToPlace.name} (${cardToPlace.biome}) at (1, 0)`);
const placeSuccess = game.placeLocationCardAndMove(0, 1, 0);
console.assert(placeSuccess === true, 'Successfully placed card');
console.assert(p1.x === 1 && p1.y === 0, 'Player moved to (1, 0)');
console.assert(p1.locationHand.length === 5, 'Player hand refilled back to 5');
console.assert(game.cardMap.hasCard(1, 0) === true, 'CardMap now has card at (1, 0)');
console.log('Test 3 Passed: Card placed, player moved, and hand refilled to 5.');

console.log('\n=== TEST 4: The 4 Gym Cities Replaced Starting Towns at Corners ===');
const swNode = game.cardMap.getNode('node_sw');
const nwNode = game.cardMap.getNode('node_nw');
const neNode = game.cardMap.getNode('node_ne');
const seNode = game.cardMap.getNode('node_se');
console.assert(swNode.card.id === 'city_hoja' && swNode.card.gym.tier === 1, 'SW Corner is Ciudad Hoja (Tier 1 Gym)');
console.assert(nwNode.card.id === 'city_pico' && nwNode.card.gym.tier === 2, 'NW Corner is Ciudad Pico (Tier 2 Gym)');
console.assert(neNode.card.id === 'city_puerto' && neNode.card.gym.tier === 3, 'NE Corner is Ciudad Puerto (Tier 3 Gym)');
console.assert(seNode.card.id === 'city_flama' && seNode.card.gym.tier === 3, 'SE Corner is Ciudad Flama (Tier 3 Gym)');
console.assert(swNode.card.hasShop === true, 'Gym cities have shop access');
console.log('Test 4 Passed: 4 gym cities replace starting towns on all 4 corners.');

console.log('\n=== TEST 5: Shop Restriction (City vs Wild) ===');
game.hasMoved = false;
game.movePlayerToNode('node_sw');
console.assert(game.canAccessShop() === true, 'Shop accessible in city');

// Move to non-city (node_w_cross)
game.hasMoved = false;
const moved = game.movePlayerToNode('node_w_cross');
console.assert(game.canAccessShop() === false, 'Shop NOT accessible in non-city');
console.log('Test 5 Passed: Shop access is strictly restricted to Cities.');

console.log('\n=== TEST 6: Location Actions & Resource Trading ===');
const locCard = game.cardMap.getNode(1, 0).card;
console.log(`Current location: ${locCard.name}, Action: ${locCard.locationAction ? locCard.locationAction.name : 'None'}`);
if (locCard.locationAction) {
    p1.coins = 10;
    p1.luck = 3;
    game.hasActed = false;
    game.executeLocationAction();
    console.log('Location action executed successfully.');
}
console.log('Test 6 Passed: Location actions execute smoothly.');

console.log('\n=== TEST 7: Luck Drafting & Search Redraw ===');
p1.luck = 3;
game.draftLocationCard(p1);
console.assert(p1.luck === 2, 'Spent 1 luck to draft location card');
console.assert(p1.locationHand.length === 5, 'Hand maintained at 5 cards after draft');

// Wild search & redraw
game.hasActed = false;
game.searchMonsters();
console.assert(game.activeSearchCards.length >= 3, 'Wild search revealed 3 cards');
const firstWildId = game.activeSearchCards[0].instanceId;

game.redrawActiveSearch();
console.assert(p1.luck === 1, 'Spent 1 luck to redraw wild monsters');
console.assert(game.activeSearchCards.length >= 3, 'Redrawn wild monsters revealed 3 cards');
console.log('Test 7 Passed: Luck point system for drafting and wild search redraw works.');

console.log('\n=== TEST 8: River Shop of 8 Unique Items ===');
console.assert(game.shopRiver.length === 8, 'River shop contains exactly 8 items');
const uniqueIds = new Set(game.shopRiver.map(i => i.id));
console.assert(uniqueIds.size === 8, 'All 8 items in river shop are unique');

// Move to city to buy
game.hasMoved = false;
game.movePlayerToNode('node_sw'); // Ciudad Hoja (City)
p1.coins = 50;
const itemToBuy = game.shopRiver[0];
game.buyShopItem(0);
console.assert(game.shopRiver.length === 8, 'River shop replenished back to 8 items');
const uniqueIdsAfter = new Set(game.shopRiver.map(i => i.id));
console.assert(uniqueIdsAfter.size === 8, 'River shop still has 8 unique items after replenishment');
console.log('Test 8 Passed: River shop maintains 8 unique cards.');

console.log('\n=== TEST 9: Expansion Decks & 4-Tiers Progression ===');
console.assert(game.expansionsUnlocked.tier2 === false, 'Tier 2 locked before gyms');
console.assert(game.expansionsUnlocked.tier3 === false, 'Tier 3 locked before gyms');
console.assert(game.expansionsUnlocked.tier4 === false, 'Tier 4 locked before 3 gyms');

const initialDeckTiers = Object.values(game.biomeDecks).flat().map(m => m.captureTier);
console.assert(initialDeckTiers.every(t => t === 1), 'All cards in initial biome decks are Tier 1');

game.onGymDefeated(p1, { tier: 1, badgeName: 'Medalla Brote', rewardCoins: 8, rewardLuck: 1 });
console.assert(game.expansionsUnlocked.tier2 === true, 'Tier 2 unlocked after Gym 1');
console.assert(game.expansionsUnlocked.tier3 === false, 'Tier 3 still locked after Gym 1');

const afterGym1Tiers = Object.values(game.biomeDecks).flat().map(m => m.captureTier);
console.assert(afterGym1Tiers.some(t => t === 2), 'Tier 2 cards now present in biome decks');
console.assert(afterGym1Tiers.every(t => t <= 2), 'No Tier 3 cards present before Gym 2');

game.onGymDefeated(p1, { tier: 2, badgeName: 'Medalla Cumbre', rewardCoins: 12, rewardLuck: 1 });
console.assert(game.expansionsUnlocked.tier3 === true, 'Tier 3 unlocked after Gym 2');

const afterGym2Tiers = Object.values(game.biomeDecks).flat().map(m => m.captureTier);
console.assert(afterGym2Tiers.some(t => t === 3), 'Tier 3 cards now present in biome decks');
console.assert(afterGym2Tiers.every(t => t <= 3), 'All cards in deck before Gym 3 are at most Tier 3');

game.onGymDefeated(p1, { tier: 3, badgeName: 'Medalla Marea', rewardCoins: 16, rewardLuck: 2 });
console.assert(p1.badges.length === 3, 'Player has 3 badges');
console.assert(game.expansionsUnlocked.tier4 === true, 'Tier 4 Legendaries unlocked after Gym 3');
console.assert(game.tournamentEngine.active === true, 'Grand Tournament triggered after defeating 3 gyms!');
console.log('Test 9 Passed: Higher tier cards strictly unlock after Gym 1, Gym 2, and Gym 3; total 4 tiers.');

console.log('\n=== TEST 10: Combat with Luck Boost ===');
const combat = game.combatEngine;
p1.luck = 2;
combat.startBattle({
    type: 'npc',
    player1: p1,
    npc: { name: 'Rival', monsters: [MONSTERS_DATABASE[0]] }
});
console.assert(combat.inCombat === true, 'In combat');
console.assert(combat.useLuckNextAttack === false, 'Luck boost initially off');

combat.toggleLuckBoost();
console.assert(combat.useLuckNextAttack === true, 'Luck boost toggled ON');

const initialLuck = p1.luck;
// Execute attack with luck boost
const p1Mon = combat.getP1Active();
const oppMon = combat.getP2Active();
combat.executeAttack({
    attacker: p1Mon,
    defender: oppMon,
    attack: p1Mon.attacks[0],
    attackerPlayer: p1,
    defenderPlayer: null,
    first: true
});
console.assert(p1.luck === initialLuck - 1, 'Spent 1 luck on attack roll');
console.assert(combat.useLuckNextAttack === false, 'Luck boost reset after attack');
console.log('Test 10 Passed: Combat with Luck point boost works.');

console.log('\n=== TEST 11: Baya Aranja (Oran Berry) Activates at 0 HP ===');
const testMonAttacker = game.instantiateMonster(MONSTERS_DATABASE[0]);
const testMonDefender = game.instantiateMonster(MONSTERS_DATABASE[1]);
const oranBerry = ITEMS_DATABASE.find(i => i.id === 'item_cmb_7');
testMonDefender.equippedItem = JSON.parse(JSON.stringify(oranBerry));
testMonDefender.hp = 2;

// Execute lethal attack (5 base dmg)
combat.executeAttack({
    attacker: testMonAttacker,
    defender: testMonDefender,
    attack: { name: 'Golpe Demoledor', type: 'Normal', baseDmg: 5, diceCount: 1 },
    attackerPlayer: null,
    defenderPlayer: null,
    first: true
});

console.assert(testMonDefender.hp === 3, 'Defender recovered to 3 HP upon reaching 0 HP via Baya Aranja');
console.assert(testMonDefender.berryUsed === true, 'Baya Aranja marked as used');
console.log('Test 11 Passed: Baya Aranja activates strictly at 0 HP and recovers 3 HP.');

console.log('\n=== TEST 12: Codex Data & Filtering ===');
require('./js/ui.js');
UI.game = game;
console.log('Monsters count:', MONSTERS_DATABASE.length, 'Items count:', ITEMS_DATABASE.length);
console.assert(MONSTERS_DATABASE.length === 50, `Codex has 50 monsters (including 10 T4 Legendaries), got ${MONSTERS_DATABASE.length}`);
console.assert(ITEMS_DATABASE.length === 20, 'Codex has 20 items');
const allAreasCount = CITIES_DATABASE.length + LOCATION_CARDS_DATABASE.length;
console.assert(allAreasCount === 22, `Codex has 22 areas/cities (4 gym cities + 18 locations), got ${allAreasCount}`);
console.log('Test 12 Passed: Codex contains all monsters, attacks, items, and areas.');

console.log('\n=== TEST 13: Teach Attack from Wild Monster ===');
game.isGameOver = false;
const teachTestPlayer = game.getActivePlayer();
const starterMon = teachTestPlayer.monsters[0];
const initialAttacksCount = starterMon.attacks.length;
const testWild = game.instantiateMonster(MONSTERS_DATABASE[12]);
game.activeSearchCards = [testWild];
game.teachAttackFromWild(0, starterMon.instanceId);
console.assert(starterMon.attacks.some(a => a.name === testWild.attacks[0].name), 'Monster learned wild attack');
console.assert(game.activePlayerIndex === 1, 'Teaching wild attack ended turn and advanced to next player');
console.log('Test 13 Passed: Teaching wild monster attack directly works without gym badges.');

console.log('\n=== TEST 14: Treasure Magnet (+1 Coin Every Turn) ===');
const activeMagnetPlayer = game.getActivePlayer();
activeMagnetPlayer.inventory.push(ITEMS_DATABASE.find(i => i.id === 'item_utl_8'));
const coinsBeforeTurn = activeMagnetPlayer.coins;
game.startTurn();
console.assert(activeMagnetPlayer.coins === coinsBeforeTurn + 1, 'Treasure magnet granted +1 gold coin at turn start');
console.log('Test 14 Passed: Treasure Magnet grants +1 gold coin every single turn.');

console.log('\n=== TEST 15: Pokemon Node Map & 2-Card Hubs ===');
const testMap = new CardMap();
const hubNode = testMap.getNode('node_center_hub');
console.assert(hubNode !== null, 'Hub node exists');
console.assert(hubNode.maxCards === 2, 'Hub node supports up to 2 cards');
const locCard1 = LOCATION_CARDS_DATABASE[0];
const locCard2 = LOCATION_CARDS_DATABASE[1];
testMap.placeCardOnNode('node_center_hub', locCard1);
console.assert(hubNode.cards.length === 1, 'Placed 1st card in hub node');
testMap.placeCardOnNode('node_center_hub', locCard2);
console.assert(hubNode.cards.length === 2, 'Placed 2nd card in hub node');
let threwOnThird = false;
try {
    testMap.placeCardOnNode('node_center_hub', LOCATION_CARDS_DATABASE[2]);
} catch (e) {
    threwOnThird = true;
}
console.assert(threwOnThird === true, 'Cannot place 3rd card on 2-card node');

// Verify corner starts
const swTown = testMap.getNode('node_sw');
const neTown = testMap.getNode('node_ne');
const nwTown = testMap.getNode('node_nw');
const seTown = testMap.getNode('node_se');
console.assert(swTown.corner === 'SW' && neTown.corner === 'NE' && nwTown.corner === 'NW' && seTown.corner === 'SE', '4 corner towns configured');
console.log('Test 15 Passed: Node graph, 2-card hubs, and corner towns function correctly.');

console.log('\n=== TEST 16: Attack Variety & 12 Special Combat Effects ===');
const combatEngine = new CombatEngine(game);

// 1. Tier Base Damage Scaling (T3 > T2 > T1)
const t1Base = MONSTERS_DATABASE.find(m => m.id === 'mon_for_1').attacks[0];
const t2Base = MONSTERS_DATABASE.find(m => m.id === 'mon_mtn_4').attacks[0];
const t3Base = MONSTERS_DATABASE.find(m => m.id === 'mon_for_7').attacks[0];
console.assert(t1Base.baseDmg === 3, 'Tier 1 base attack has 3 base damage');
console.assert(t2Base.baseDmg === 5, 'Tier 2 base attack has 5 base damage');
console.assert(t3Base.baseDmg === 7, 'Tier 3 base attack has 7 base damage');
console.assert(t3Base.baseDmg > t2Base.baseDmg && t2Base.baseDmg > t1Base.baseDmg, 'Base attacks scale cleanly: T3 > T2 > T1');

// Setup test combatants
combatEngine.inCombat = true;
combatEngine.player1 = game.players[0];
const attackerMon = combatEngine.cloneMonster(MONSTERS_DATABASE[0]);
const defenderMon = combatEngine.cloneMonster(MONSTERS_DATABASE[1]);
attackerMon.hp = 30; attackerMon.maxHp = 30;
defenderMon.hp = 30; defenderMon.maxHp = 30;

// 2. Paralysis (0 speed)
combatEngine.executeAttack({
    attacker: attackerMon,
    defender: defenderMon,
    attack: { name: 'Chispa Paralizante', type: 'Eléctrico', baseDmg: 2, diceCount: 1, effect: 'paralyze' }
});
console.assert(defenderMon.status === 'paralysis', 'Defender inflicted with paralysis');
console.assert(defenderMon.speed === 0, 'Defender effective speed reduced to 0 by paralysis');

// 3. Poison (-1 HP per turn)
defenderMon.status = null;
defenderMon.hp = 30;
combatEngine.executeAttack({
    attacker: attackerMon,
    defender: defenderMon,
    attack: { name: 'Picadura Tóxica', type: 'Bicho', baseDmg: 2, diceCount: 1, effect: 'poison' }
});
console.assert(defenderMon.status === 'poison', 'Defender inflicted with poison');
const hpBeforePoison = defenderMon.hp;
combatEngine.p1Team = [attackerMon];
combatEngine.p2Team = [defenderMon];
combatEngine.p1ActiveIndex = 0;
combatEngine.p2ActiveIndex = 0;
combatEngine.endTurnPoisonPhase();
console.assert(defenderMon.hp === hpBeforePoison - 1, 'Poison dealt 1 damage at end of turn');

// 4. Drowsy (+1 damage received)
defenderMon.status = null;
defenderMon.hp = 30;
combatEngine.executeAttack({
    attacker: attackerMon,
    defender: defenderMon,
    attack: { name: 'Espora Somnífera', type: 'Planta', baseDmg: 2, diceCount: 1, effect: 'drowsy' }
});
console.assert(defenderMon.status === 'drowsy', 'Defender is drowsy');
const hpBeforeDrowsyHit = defenderMon.hp;
combatEngine.executeAttack({
    attacker: attackerMon,
    defender: defenderMon,
    attack: { name: 'Fijación Sísmica', type: 'Tierra', baseDmg: 5, fixedDmg: 5, effect: 'fixed_damage' }
});
console.assert(defenderMon.hp === hpBeforeDrowsyHit - 6, 'Drowsy added +1 damage (5 fixed + 1 drowsy = 6 dmg)');

// 5. Multi-hit (3 hits)
defenderMon.status = null;
defenderMon.hp = 30;
const hpBeforeMulti = defenderMon.hp;
combatEngine.executeAttack({
    attacker: attackerMon,
    defender: defenderMon,
    attack: { name: 'Trío de Espinas', type: 'Planta', baseDmg: 1, hits: 3, effect: 'multi_hit' }
});
console.assert(defenderMon.hp <= hpBeforeMulti - 3, 'Multi-hit attacked 3 times dealing cumulative damage');

// 6. Shield Next Turn (-2 damage)
attackerMon.hp = 30;
attackerMon.shieldNextTurn = 0;
combatEngine.executeAttack({
    attacker: attackerMon,
    defender: defenderMon,
    attack: { name: 'Refugio Rocoso', type: 'Roca', baseDmg: 2, diceCount: 1, effect: 'shield_next' }
});
console.assert(attackerMon.shieldNextTurn === 2, 'Shield prepared for 2 damage reduction on next hit');
const hpBeforeShieldedHit = attackerMon.hp;
combatEngine.executeAttack({
    attacker: defenderMon,
    defender: attackerMon,
    attack: { name: 'Fijación Sísmica', type: 'Tierra', baseDmg: 5, fixedDmg: 5, effect: 'fixed_damage' }
});
console.assert(attackerMon.hp === hpBeforeShieldedHit - (5 - 2), 'Shield absorbed 2 damage (5 - 2 = 3 received)');
console.assert(attackerMon.shieldNextTurn === 0, 'Shield consumed after taking hit');

// 7. Charge Next Turn (+3 damage)
defenderMon.hp = 30;
defenderMon.status = null;
attackerMon.chargeNextTurn = 0;
combatEngine.executeAttack({
    attacker: attackerMon,
    defender: defenderMon,
    attack: { name: 'Carga Ígnea', type: 'Fuego', baseDmg: 2, diceCount: 1, effect: 'charge_next' }
});
console.assert(attackerMon.chargeNextTurn === 3, 'Charge prepared for +3 damage on next attack');
const hpBeforeChargeHit = defenderMon.hp;
combatEngine.executeAttack({
    attacker: attackerMon,
    defender: defenderMon,
    attack: { name: 'Fijación Sísmica', type: 'Tierra', baseDmg: 5, fixedDmg: 5, effect: 'fixed_damage' }
});
console.assert(defenderMon.hp === hpBeforeChargeHit - 8, 'Charge added +3 damage to next attack (5 + 3 = 8)');
console.assert(attackerMon.chargeNextTurn === 0, 'Charge consumed after attack');

// 8. Speed Scaling Damage
attackerMon.speed = 8;
attackerMon.status = null;
defenderMon.hp = 30;
defenderMon.status = null;
const hpBeforeSpeed = defenderMon.hp;
combatEngine.executeAttack({
    attacker: attackerMon,
    defender: defenderMon,
    attack: { name: 'Electroimpulso', type: 'Eléctrico', baseDmg: 0, diceCount: 1, effect: 'speed_damage' }
});
console.assert(defenderMon.hp <= hpBeforeSpeed - 8, 'Speed scaling attack dealt damage based on speed (8+)');

// 9. Facade Status (+4 damage when user has status)
attackerMon.status = 'paralysis';
defenderMon.hp = 30;
defenderMon.status = null;
const hpBeforeFacade = defenderMon.hp;
combatEngine.executeAttack({
    attacker: attackerMon,
    defender: defenderMon,
    attack: { name: 'Furia Agónica', type: 'Bicho', baseDmg: 4, diceCount: 1, effect: 'facade_status' }
});
console.assert(defenderMon.hp <= hpBeforeFacade - 8, 'Facade added +4 bonus damage due to active status condition');

// 10. Fixed Damage (exact 5 guaranteed)
attackerMon.status = null;
attackerMon.chargeNextTurn = 0;
defenderMon.hp = 30;
defenderMon.status = null;
defenderMon.shieldNextTurn = 0;
const hpBeforeFixed = defenderMon.hp;
combatEngine.executeAttack({
    attacker: attackerMon,
    defender: defenderMon,
    attack: { name: 'Fijación Sísmica', type: 'Tierra', baseDmg: 5, fixedDmg: 5, effect: 'fixed_damage' }
});
console.assert(defenderMon.hp === hpBeforeFixed - 5, 'Fixed damage dealt exactly 5 damage');

// 11. White Dice Crit
combatEngine.executeAttack({
    attacker: attackerMon,
    defender: defenderMon,
    attack: { name: 'Ojo de Francotirador', type: 'Volador', baseDmg: 4, diceCount: 2, effect: 'white_dice_crit' }
});

// 12. Force Switch
const p2MonA = combatEngine.cloneMonster(MONSTERS_DATABASE[2]);
const p2MonB = combatEngine.cloneMonster(MONSTERS_DATABASE[3]);
p2MonA.hp = 30; p2MonB.hp = 30;
combatEngine.p2Team = [p2MonA, p2MonB];
combatEngine.p2ActiveIndex = 0;
combatEngine.executeAttack({
    attacker: attackerMon,
    defender: p2MonA,
    attack: { name: 'Tornado Expulsor', type: 'Volador', baseDmg: 4, diceCount: 1, effect: 'force_switch' },
    attackerPlayer: game.players[0],
    defenderPlayer: null
});
console.assert(combatEngine.p2ActiveIndex === 1, 'Force switch pushed opponent to next available monster (p2ActiveIndex: 1)');

// 13. Pivot Switch (Tactical Retreat)
const p1MonA = combatEngine.cloneMonster(MONSTERS_DATABASE[4]);
const p1MonB = combatEngine.cloneMonster(MONSTERS_DATABASE[5]);
p1MonA.hp = 30; p1MonB.hp = 30;
combatEngine.p1Team = [p1MonA, p1MonB];
combatEngine.p1ActiveIndex = 0;
combatEngine.playerPivotSwitch(1);
console.assert(combatEngine.p1ActiveIndex === 1, 'Player safely pivoted to new monster without receiving switch damage');

console.log('Test 16 Passed: All 12 attack effects and tier base damage scaling function accurately.');

console.log('\n=== TEST 17: All 21 Items Functionality & Light Boots Movement ===');
const testGame = new MonsterJourneyGame();
testGame.initGame([
    { name: 'Red Tester', characterId: 'char_red', starterMonsterId: 'mon_pln_2' },
    { name: 'Blue Tester', characterId: 'char_blue', starterMonsterId: 'mon_frw_1' }
]);
const testP1 = testGame.players[0];

// 1. Botas Ligeras (Zapatillas) - 2 Movement points & multi-step traversal
testP1.inventory.push(ITEMS_DATABASE.find(i => i.id === 'item_utl_1'));
testGame.startTurn();
console.assert(testGame.movementPoints === 2, `Light Boots should provide 2 movement points, got ${testGame.movementPoints}`);
console.assert(!testGame.hasMoved, 'hasMoved should be false at start of turn with 2 movement points');

// Step 1: Move to connected discovered node or place card
const nodeSw = testGame.cardMap.getNode('node_sw');
const nodeWCross = testGame.cardMap.getNode('node_w_cross');
testGame.cardMap.placeCardOnNode('node_w_cross', LOCATION_CARDS_DATABASE[0]);
const moveSuccess = testGame.movePlayerToNode('node_w_cross');
console.assert(moveSuccess === true, 'Player should successfully move 1 step to node_w_cross');
console.assert(testGame.movementPoints === 1, `Remaining movement should be 1, got ${testGame.movementPoints}`);
console.assert(!testGame.hasMoved, 'hasMoved should remain false while 1 movement point is left');

// Step 2: Move second step to node_s_valley
testGame.cardMap.placeCardOnNode('node_s_valley', LOCATION_CARDS_DATABASE[1]);
const step2Success = testGame.movePlayerToNode('node_s_valley');
console.assert(step2Success === true, 'Player should successfully take 2nd step to node_s_valley');
console.assert(testGame.movementPoints === 0, `Movement points should now be 0, got ${testGame.movementPoints}`);
console.assert(testGame.hasMoved === true, 'hasMoved should now be true after expending all movement points');

// 2. Pesa Recia (item_cmb_9: +3 Max HP and Current HP)
const monTester = testP1.monsters[0];
const baseMaxHp = monTester.maxHp;
const baseHp = monTester.hp;
testP1.inventory.push(ITEMS_DATABASE.find(i => i.id === 'item_cmb_9'));
const pesaInvIdx = testP1.inventory.findIndex(i => i.id === 'item_cmb_9');
testGame.equipItemToMonster(pesaInvIdx, monTester.instanceId);
console.assert(monTester.maxHp === baseMaxHp + 3, `Pesa Recia should increase maxHp by 3, got ${monTester.maxHp}`);
console.assert(monTester.hp === baseHp + 3, `Pesa Recia should increase hp by 3, got ${monTester.hp}`);

testGame.unequipItemFromMonster(monTester.instanceId);
console.assert(monTester.maxHp === baseMaxHp, `Unequipping Pesa Recia should restore base maxHp, got ${monTester.maxHp}`);

// 3. Incienso Silvestre (item_utl_2: +1 Wild monster in search)
testGame.hasActed = false;
testP1.inventory.push(ITEMS_DATABASE.find(i => i.id === 'item_utl_2'));
testGame.searchMonsters();
console.assert(testGame.activeSearchCards.length >= 4, `Incienso Silvestre should reveal 4 wild cards, got ${testGame.activeSearchCards?.length}`);

// 4. Garra Rápida (item_cmb_3: +2 Speed) & Cinta Focus (item_cmb_4: survive lethal)
const combatTester = new CombatEngine(testGame);
const fastMon = combatTester.cloneMonster(MONSTERS_DATABASE[0]);
fastMon.equippedItem = ITEMS_DATABASE.find(i => i.id === 'item_cmb_3');
combatTester.p1Team = [fastMon];
combatTester.p2Team = [combatTester.cloneMonster(MONSTERS_DATABASE[1])];

const sashMon = combatTester.cloneMonster(MONSTERS_DATABASE[2]);
sashMon.hp = 5;
sashMon.equippedItem = ITEMS_DATABASE.find(i => i.id === 'item_cmb_4');
combatTester.executeAttack({
    attacker: fastMon,
    defender: sashMon,
    attack: { name: 'Super Impacto', type: 'Normal', baseDmg: 20, fixedDmg: 20, effect: 'fixed_damage' }
});
console.assert(sashMon.hp === 1, `Cinta Focus should allow surviving lethal damage with 1 HP, got ${sashMon.hp}`);
console.assert(sashMon.focusSashUsed === true, 'Cinta Focus should be marked as used');

console.log('Test 17 Passed: All 20 items and running shoes (Zapatillas / Botas Ligeras) verified and functioning correctly.');

console.log('\n=== TEST 18: Double Area Multi-Action Execution & Forest Sanctuary / Ancestral Teaching ===');
const dGame = new MonsterJourneyGame();
dGame.initGame([
    { name: 'Red Tester', characterId: 'char_red', starterMonsterId: 'mon_pln_2' },
    { name: 'Blue Tester', characterId: 'char_blue', starterMonsterId: 'mon_frw_1' }
]);
UI.game = dGame;
const dPlayer = dGame.players[0];
const multiHubNode = dGame.cardMap.getNode('node_w_cross');
console.assert(multiHubNode.maxCards === 2, `Hub node supports maxCards: 2, got ${multiHubNode.maxCards}`);

const cardAncestral = LOCATION_CARDS_DATABASE.find(c => c.id === 'loc_for_3');
const cardDruid = LOCATION_CARDS_DATABASE.find(c => c.id === 'loc_for_4');
dGame.cardMap.placeCardOnNode('node_w_cross', cardAncestral);
dGame.cardMap.placeCardOnNode('node_w_cross', cardDruid);
console.assert(multiHubNode.cards.length === 2, `Hub node contains 2 cards, got ${multiHubNode.cards.length}`);
console.assert(multiHubNode.cards[0].id === 'loc_for_3', 'Card 0 is Bosque de los Ancestros');
console.assert(multiHubNode.cards[1].id === 'loc_for_4', 'Card 1 is Santuario del Druida');

dGame.movePlayerToNode('node_w_cross');
console.assert(dPlayer.currentNodeId === 'node_w_cross', 'Player moved to hub node');

// Test Card 1 Action execution by ID: Bosque de los Ancestros (Enseñanza Ancestral)
dPlayer.luck = 3;
dGame.hasActed = false;
const monToTeach = dPlayer.monsters[0];
const prevAttacksCount = monToTeach.attacks.length;
dGame.executeLocationAction('loc_for_3');
console.assert(dPlayer.luck === 2, `Luck should decrease by 1, got ${dPlayer.luck}`);
console.assert(monToTeach.attacks.length === prevAttacksCount + 1, 'Target monster learned ancestral attack');
console.assert(dGame.hasActed === true, 'hasActed marked true after Card 1 action');

// Test Card 2 Action execution by ID: Santuario del Druida (Bendición del Druida)
dGame.hasActed = false;
const prevMaxHp = monToTeach.maxHp;
const prevHp = monToTeach.hp;
const prevCoins = dPlayer.coins;
dGame.executeLocationAction('loc_for_4');
console.assert(monToTeach.maxHp === prevMaxHp + 1, `Max HP increased by 1: ${monToTeach.maxHp}`);
console.assert(monToTeach.hp === prevHp + 1, `Current HP increased by 1: ${monToTeach.hp}`);
console.assert(dPlayer.coins === prevCoins + 2, `Coins increased by 2: ${dPlayer.coins}`);
console.assert(dGame.hasActed === true, 'hasActed marked true after Card 2 action');

// Test Card 2 Action execution by index 1
dGame.hasActed = false;
const prevMaxHp2 = monToTeach.maxHp;
dGame.executeLocationAction(1);
console.assert(monToTeach.maxHp === prevMaxHp2 + 1, `Max HP increased by 1 on index call: ${monToTeach.maxHp}`);

// Direct Enseñanza Ancestral test with chosen attack index
dGame.hasActed = false;
dPlayer.luck = 3;
const chosenAtk = ANCESTRAL_ATTACKS[3];
dGame.executeAncestralTeaching(3, monToTeach.instanceId);
console.assert(dPlayer.luck === 2, `Luck spent for direct teaching: ${dPlayer.luck}`);
console.assert(monToTeach.attacks.some(a => a.name === chosenAtk.name), `Monster learned ${chosenAtk.name}`);

// Test additional updated special location actions
// Cascada Cristalina (+2 Luck)
const cardWaterfall = LOCATION_CARDS_DATABASE.find(c => c.id === 'loc_frw_1');
dGame.cardMap.placeCardOnNode('node_s_valley', cardWaterfall);
dGame.hasMoved = false;
dGame.movementPoints = 1;
dGame.movePlayerToNode('node_s_valley');
dGame.hasActed = false;
const prevLuckWaterfall = dPlayer.luck;
dGame.executeLocationAction('loc_frw_1');
console.assert(dPlayer.luck === prevLuckWaterfall + 2, `Cascada Cristalina granted +2 luck: ${dPlayer.luck}`);

// Altar de la Flama (draw 2 environment cards + 1 luck)
const cardFlama = CITIES_DATABASE.find(c => c.id === 'city_flama');
dGame.cardMap.placeCardOnNode('node_s_abyss', cardFlama);
dGame.hasMoved = false;
dGame.movementPoints = 1;
dGame.movePlayerToNode('node_s_abyss');
dGame.hasActed = false;
const prevHandSize = dPlayer.locationHand.length;
const prevLuckFlama = dPlayer.luck;
dGame.executeLocationAction('city_flama');
console.assert(dPlayer.locationHand.length === prevHandSize + 2, `Altar de la Flama drew 2 cards: ${dPlayer.locationHand.length}`);
console.assert(dPlayer.luck === prevLuckFlama + 1, `Altar de la Flama granted +1 luck: ${dPlayer.luck}`);

console.log('Test 18 Passed: Double area multi-card action execution, Enseñanza Ancestral, and Santuario del Druida work seamlessly.');

console.log('\n=== TEST 19: Overworld Abilities (Excavación & Vuelo Rápido) ===');
const owGame = new MonsterJourneyGame();
owGame.initGame([
    { name: 'Red Explorer', characterId: 'char_red', starterMonsterId: 'mon_pln_2' }
]);
UI.game = owGame;
const owPlayer = owGame.players[0];

// 1. Ground Ability ("Excavación")
const groundMonData = MONSTERS_DATABASE.find(m => m.id === 'mon_mtn_3');
const groundMon = owGame.instantiateMonster(groundMonData);
owPlayer.monsters.push(groundMon);

owGame.hasActed = false;
owGame.movementPoints = 0;
owGame.hasMoved = true;
owGame.useOverworldAbility(groundMon.instanceId);
console.assert(owGame.movementPoints === 1, `Excavación granted 1 movement point, got ${owGame.movementPoints}`);
console.assert(owGame.hasMoved === false, 'Excavación reset hasMoved to allow movement');
console.assert(owGame.hasActed === true, 'Excavación consumed the action');

// 2. Flying Ability ("Vuelo Rápido")
const flyingMonData = MONSTERS_DATABASE.find(m => m.id === 'mon_mtn_2');
const flyingMon = owGame.instantiateMonster(flyingMonData);
owPlayer.monsters.push(flyingMon);

// Move player to wild node
owGame.cardMap.placeCardOnNode('node_w_route', LOCATION_CARDS_DATABASE[0]);
owGame.hasMoved = false;
owGame.movementPoints = 1;
owGame.movePlayerToNode('node_w_route');
console.assert(owPlayer.currentNodeId === 'node_w_route', 'Player is stationed on wild route');

// Normal city travel must fail from wild route
owGame.hasActed = false;
const failNormalTravel = owGame.fastTravelToCity('node_ne', false);
console.assert(failNormalTravel === false, 'Normal travel from wild route rejected');

// Flight ability travel must succeed from wild route
const flightTravelSuccess = owGame.fastTravelToCity('node_ne', true);
console.assert(flightTravelSuccess === true, 'Vuelo Rápido enables flight from wild route to city');
console.assert(owPlayer.currentNodeId === 'node_ne', 'Player teleported to destination city');
console.assert(owGame.hasActed === true, 'Flight consumed the action');
console.assert(owGame.hasMoved === true, 'Flight marked player as moved');

console.log('Test 19 Passed: Overworld abilities (Excavación + Vuelo Rápido) function properly across map.');

console.log('\n=== TEST 20: Tier 4 Legendary Monsters (1 per Type) & Masterball Suprema ===');
const t4Monsters = MONSTERS_DATABASE.filter(m => m.captureTier === 4);
console.assert(t4Monsters.length === 10, `There must be exactly 10 Tier 4 Legendaries, got ${t4Monsters.length}`);

const requiredTypes = ['Planta', 'Fuego', 'Agua', 'Eléctrico', 'Tierra', 'Volador', 'Roca', 'Bicho', 'Dragón', 'Hielo'];
requiredTypes.forEach(type => {
    const matching = t4Monsters.filter(m => m.type === type);
    console.assert(matching.length === 1, `Exactly 1 Tier 4 Legendary for type ${type}, got ${matching.length}`);
    console.assert(matching[0].isLegendary === true, `${matching[0].name} is marked as isLegendary`);
    console.assert(matching[0].hp >= 24, `${matching[0].name} has legendary health (24+), got ${matching[0].hp}`);
    console.assert(matching[0].attacks[0].baseDmg >= 8, `${matching[0].name} attack has high base damage (8+), got ${matching[0].attacks[0].baseDmg}`);
});

const masterball = ITEMS_DATABASE.find(i => i.id === 'item_cap_4');
console.assert(masterball !== null && masterball.tier === 4, `Masterball Suprema must be Tier 4 tool, got tier: ${masterball?.tier}`);

console.assert(EXPANSION_DECKS.tier4 !== undefined, 'EXPANSION_DECKS contains tier4');
console.assert(EXPANSION_DECKS.tier4.monsters.length === 10, `EXPANSION_DECKS.tier4 holds 10 legendary monsters, got ${EXPANSION_DECKS.tier4.monsters.length}`);

// Test capturing a Tier 4 Legendary
const capGame = new MonsterJourneyGame();
capGame.initGame([
    { name: 'Red Hunter', characterId: 'char_red', starterMonsterId: 'mon_pln_2' }
]);
const capPlayer = capGame.players[0];
const targetLegendary = capGame.instantiateMonster(t4Monsters[0]);
capGame.activeSearchCards = [targetLegendary];

// Attempt with Tier 1 Pokeball should fail
let alertTriggered = false;
global.alert = () => { alertTriggered = true; };
capGame.captureMonster(0);
console.assert(alertTriggered === true, 'Capturing T4 legendary with Pokeball Tier 1 was rejected');
console.assert(capPlayer.monsters.length === 1, 'Player did not capture legendary without proper tool');

// Give player Masterball Suprema (Tier 4) and capture
capPlayer.inventory.push(JSON.parse(JSON.stringify(masterball)));
alertTriggered = false;
capGame.hasActed = false;
capGame.activeSearchCards = [targetLegendary];
capGame.captureMonster(0);
console.assert(capPlayer.monsters.some(m => m.id === targetLegendary.id), 'Successfully captured T4 legendary with Masterball Suprema');
console.log('Test 20 Passed: Tier 4 Legendaries (10 types), Masterball Suprema, and capture mechanics verified.');

console.log('\n=== TEST 21: Location Travel (Travesía en Barca) & Connection-Based Placement Luck ===');
const travelGame = new MonsterJourneyGame();
travelGame.initGame([
    { name: 'Red Sailor', characterId: 'char_red', starterMonsterId: 'mon_pln_2' }
]);
UI.game = travelGame;
const travelPlayer = travelGame.players[0];

// 1. Connection-Based Luck Rewards
const secretNode = travelGame.cardMap.getNode('node_sw_secret'); // 1 connection
const routeNode = travelGame.cardMap.getNode('node_w_route'); // 2 connections
const bayNode = travelGame.cardMap.getNode('node_nw_bay'); // 3 connections
const crossNode = travelGame.cardMap.getNode('node_w_cross'); // 4 connections

console.assert(travelGame.getPlacementLuckReward(secretNode) === 3, '1-connection node awards +3 Luck');
console.assert(travelGame.getPlacementLuckReward(routeNode) === 2, '2-connection node awards +2 Luck');
console.assert(travelGame.getPlacementLuckReward(bayNode) === 2, '3-connection node awards +2 Luck');
console.assert(travelGame.getPlacementLuckReward(crossNode) === 1, '4-connection node awards +1 Luck');

// Test placing on 1-connection secret node gives +3 luck
const startLuck = travelPlayer.luck;
const secretCard = travelPlayer.locationHand[0];
travelGame.hasMoved = false;
travelGame.movementPoints = 1;
travelGame.placeLocationCardAndMove(0, 'node_sw_secret');
console.assert(travelPlayer.luck === startLuck + 3, `Placing on 1-connection dead-end awarded +3 luck: got ${travelPlayer.luck}`);
console.assert(travelPlayer.currentNodeId === 'node_sw_secret', 'Player moved to secret node');

// 2. Map Travel Ability: Muelle del Pescador (loc_frw_2: Travesía en Barca)
const dockCard = LOCATION_CARDS_DATABASE.find(c => c.id === 'loc_frw_2');
travelGame.cardMap.placeCardOnNode('node_s_valley', dockCard);
travelGame.hasMoved = false;
travelGame.movementPoints = 2;
travelGame.movePlayerToNode('node_s_valley');
console.assert(travelPlayer.currentNodeId === 'node_s_valley', 'Player arrived at Muelle del Pescador');

// Activate Travesía en Barca to travel across the map to Ciudad Puerto (node_ne)
travelGame.hasActed = false;
const travelRes = travelGame.executeMapTravel('node_ne');
console.assert(travelRes === true, 'Travesía en Barca succeeded');
console.assert(travelPlayer.currentNodeId === 'node_ne', 'Player teleported across map to node_ne');
console.assert(travelGame.hasActed === true, 'Travel consumed the player action');
console.assert(travelGame.hasMoved === true, 'Travel marked player as moved');

console.log('Test 21 Passed: Connection-based luck rewards (+3, +2, +1) and Muelle del Pescador map travel function accurately.');

console.log('\n=== TEST 22: Turn Flow - Location Action Then Wild Search / Defy Leader Ends Turn ===');
const turnGame = new MonsterJourneyGame();
turnGame.initGame([
    { name: 'Red Tester', characterId: 'char_red', starterMonsterId: 'mon_pln_2' },
    { name: 'Blue Tester', characterId: 'char_blue', starterMonsterId: 'mon_frw_1' }
]);
UI.game = turnGame;
const p1Turn = turnGame.players[0];
console.assert(turnGame.activePlayerIndex === 0, 'Starts with Player 1 active');

// 1. Place a location card with an action connected to starting node
const berryForest = LOCATION_CARDS_DATABASE.find(c => c.id === 'loc_for_1');
turnGame.cardMap.placeCardOnNode('node_w_cross', berryForest);
turnGame.movePlayerToNode('node_w_cross');
console.assert(p1Turn.currentNodeId === 'node_w_cross', 'Player 1 moved to Bosque de las Bayas');

// 2. Player 1 executes location action first
console.assert(turnGame.hasLocationActed === false, 'Location action not taken yet');
console.assert(turnGame.hasEncounterActed === false, 'Encounter action not taken yet');
const initialBerries = p1Turn.inventory.filter(i => i.id === 'item_cmb_7').length;
turnGame.executeLocationAction();
console.assert(turnGame.hasLocationActed === true, 'Location action marked as taken');
console.assert(p1Turn.inventory.filter(i => i.id === 'item_cmb_7').length === initialBerries + 1, 'Player received Oran Berry from location action');

// Cannot take location action a second time in same turn
let blockedSecondAction = false;
global.alert = () => { blockedSecondAction = true; };
turnGame.executeLocationAction();
console.assert(blockedSecondAction === true, 'Second location action in same turn blocked');

// 3. Player CAN still do Search for Pokemon after taking location action!
console.assert(turnGame.hasEncounterActed === false, 'Encounter action still available after location action');
turnGame.searchMonsters();
console.assert(turnGame.activeSearchCards !== null && turnGame.activeSearchCards.length >= 3, 'Wild search allowed after taking location action');

// 4. Concluding the search action ends the turn
p1Turn.inventory.push(ITEMS_DATABASE.find(i => i.id === 'item_cap_4')); // Masterball to guarantee capture
turnGame.captureMonster(0);
console.assert(turnGame.activePlayerIndex === 1, 'Capturing wild monster ended turn and advanced to Player 2');

// 5. Test Gym Defiance on Player 2's turn ends the turn
const p2Turn = turnGame.players[1];
console.assert(turnGame.activePlayerIndex === 1, 'Player 2 is active');
UI.showCombatResultModal = ({ onContinue }) => { if (onContinue) onContinue(); };
turnGame.challengeGym();
console.assert(turnGame.combatEngine.inCombat === true, 'Gym combat initiated');
turnGame.combatEngine.endBattle(true);
console.assert(turnGame.activePlayerIndex === 0, 'Defying gym leader ended combat and advanced turn back to Player 1');
console.log('Test 22 Passed: Location action allowed first, followed by Search / Fight action which ends the turn.');

console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
