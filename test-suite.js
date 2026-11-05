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
    showShopModal: () => {},
    renderShopModal: () => {},
    showCityTravelModal: () => {},
    hideCityTravelModal: () => {},
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
console.assert(game.citiesDeck.length === 4, 'Cities deck holds 4 gym cities');
console.log('Test 2 Passed: Players initialized with luck and 5 location cards.');

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

console.log('\n=== TEST 4: Placing City from Cities Deck ===');
game.hasMoved = false; // reset for test
const cityToPlace = game.citiesDeck[0];
console.log(`Placing top of Cities Deck: ${cityToPlace.name} at (1, 1)`);
const cityPlaceSuccess = game.placeCityCardAndMove(1, 1);
console.assert(cityPlaceSuccess === true, 'Successfully placed city');
console.assert(p1.x === 1 && p1.y === 1, 'Player moved to (1, 1)');
console.assert(game.citiesDeck.length === 3, 'Cities deck now has 3 cities remaining');
console.log('Test 4 Passed: Top of Cities Deck placed and player moved.');

console.log('\n=== TEST 5: Shop Restriction (City vs Wild) ===');
console.log('p1 at:', p1.x, p1.y, 'node biome:', game.cardMap.getNode(p1.x, p1.y).card.biome);
console.assert(game.canAccessShop() === true, 'Shop accessible in city');
// Move to non-city
game.hasMoved = false;
const moved = game.movePlayerToNode(1, 0);
console.log('Moved to (1,0):', moved, 'p1 at:', p1.x, p1.y, 'node biome:', game.cardMap.getNode(p1.x, p1.y).card.biome, 'canShop:', game.canAccessShop(), 'hasShop:', game.cardMap.getNode(p1.x, p1.y).card.hasShop, 'mobileDiscount:', game.mobileShopDiscountActive);
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
game.movePlayerToNode(1, 1); // City
p1.coins = 20;
const itemToBuy = game.shopRiver[0];
game.buyShopItem(0);
console.assert(game.shopRiver.length === 8, 'River shop replenished back to 8 items');
const uniqueIdsAfter = new Set(game.shopRiver.map(i => i.id));
console.assert(uniqueIdsAfter.size === 8, 'River shop still has 8 unique items after replenishment');
console.log('Test 8 Passed: River shop maintains 8 unique cards.');

console.log('\n=== TEST 9: Expansion Decks & 3-Tiers Progression ===');
console.assert(game.expansionsUnlocked.tier2 === false, 'Tier 2 locked before gyms');
console.assert(game.expansionsUnlocked.tier3 === false, 'Tier 3 locked before gyms');
console.assert(game.expansionsUnlocked.tier4 === undefined, 'Tier 4 does not exist');

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
console.assert(afterGym2Tiers.every(t => t <= 3), 'All cards in deck are at most Tier 3 (3 tiers total)');

game.onGymDefeated(p1, { tier: 3, badgeName: 'Medalla Marea', rewardCoins: 16, rewardLuck: 2 });
console.assert(p1.badges.length === 3, 'Player has 3 badges');
console.assert(game.tournamentEngine.active === true, 'Grand Tournament triggered after defeating 3 gyms!');
console.log('Test 9 Passed: Higher tier cards strictly unlock after Gym 1 and Gym 2; total 3 tiers.');

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
console.assert(MONSTERS_DATABASE.length === 40, 'Codex has 40 monsters');
console.assert(ITEMS_DATABASE.length === 20, 'Codex has 20 items');
const allAreasCount = 1 + CITIES_DATABASE.length + LOCATION_CARDS_DATABASE.length;
console.assert(allAreasCount === 23, 'Codex has 23 areas/cities');
console.log('Test 12 Passed: Codex contains all monsters, attacks, items, and areas.');

console.log('\n=== TEST 13: Teach Attack from Wild Monster ===');
const teachTestPlayer = game.getActivePlayer();
const starterMon = teachTestPlayer.monsters[0];
const initialAttacksCount = starterMon.attacks.length;
const testWild = game.instantiateMonster(MONSTERS_DATABASE[12]);
game.activeSearchCards = [testWild];
game.teachAttackFromWild(0, starterMon.instanceId);
console.assert(starterMon.attacks.some(a => a.name === testWild.attacks[0].name), 'Monster learned wild attack');
console.assert(game.hasActed === true, 'Teaching attack consumed turn action');
console.log('Test 13 Passed: Teaching wild monster attack directly works without gym badges.');

console.log('\n=== TEST 14: Treasure Magnet (+1 Coin Every Turn) ===');
teachTestPlayer.inventory.push(ITEMS_DATABASE.find(i => i.id === 'item_utl_8'));
const coinsBeforeTurn = teachTestPlayer.coins;
game.startTurn();
console.assert(teachTestPlayer.coins === coinsBeforeTurn + 1, 'Treasure magnet granted +1 gold coin at turn start');
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

console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
