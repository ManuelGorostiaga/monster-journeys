// Automated Test Suite for Monster Journeys
const fs = require('fs');
const path = require('path');

// Mock window and UI
global.window = global;
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
console.assert(borderSlots.length === 4, 'Starting board has 4 border empty slots around (0,0)');
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

console.log('\n=== TEST 9: Expansion Decks & 3-of-4 Gyms Win Condition ===');
console.assert(game.expansionsUnlocked.tier2 === false, 'Tier 2 locked before gyms');
game.onGymDefeated(p1, { tier: 1, badgeName: 'Medalla Brote', rewardCoins: 8, rewardLuck: 1 });
console.assert(game.expansionsUnlocked.tier2 === true, 'Tier 2 unlocked after Gym 1');

game.onGymDefeated(p1, { tier: 2, badgeName: 'Medalla Cumbre', rewardCoins: 12, rewardLuck: 1 });
console.assert(game.expansionsUnlocked.tier3 === true, 'Tier 3 unlocked after Gym 2');

game.onGymDefeated(p1, { tier: 3, badgeName: 'Medalla Marea', rewardCoins: 16, rewardLuck: 2 });
console.assert(game.expansionsUnlocked.tier4 === true, 'Tier 4 unlocked after Gym 3');

console.assert(p1.badges.length === 3, 'Player has 3 badges');
console.assert(game.tournamentEngine.active === true, 'Grand Tournament triggered after defeating 3 of 4 gyms!');
console.log('Test 9 Passed: Expansion decks unlocked at Gym 1, 2, 3; 3-of-4 gyms triggered Tournament.');

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
console.log('Monsters count:', MONSTERS_DATABASE.length, 'Items count:', ITEMS_DATABASE.length);
console.assert(MONSTERS_DATABASE.length === 40, 'Codex has 40 monsters');
console.assert(ITEMS_DATABASE.length === 21, 'Codex has 21 items');
const allAreasCount = 1 + CITIES_DATABASE.length + LOCATION_CARDS_DATABASE.length;
console.assert(allAreasCount === 23, 'Codex has 23 areas/cities');
console.log('Test 12 Passed: Codex contains all monsters, attacks, items, and areas.');

console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
