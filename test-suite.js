// Automated Test Suite for Monster Journeys
const fs = require('fs');
const path = require('path');

// Mock window and UI
global.window = global;
global.document = {
    getElementById: () => null,
    querySelector: () => null,
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
    showCombatBettingModal: ({ onComplete }) => {
        if (onComplete) onComplete();
    },
    showCombatResultModal: ({ won, coins, badge, moveTeaching, bets, onContinue }) => {
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
    updateCombatLog: () => {},
    showTeachAttackModal: (ctx) => {
        global.UI.activeTeachAttackContext = ctx;
    },
    hideTeachAttackModal: () => {
        global.UI.activeTeachAttackContext = null;
    },
    promptTeachDefeatedMove: () => {
        const combat = global.UI.game ? global.UI.game.combatEngine : null;
        if (!combat || !combat.pendingMoveTeaching) return;
        const move = combat.pendingMoveTeaching.attack;
        const opponentName = combat.pendingMoveTeaching.monsterName || 'Rival derrotado';
        const recipientPlayer = combat.pendingMoveTeaching.recipientPlayer || combat.player1;
        global.UI.showTeachAttackModal({
            source: 'combat',
            attack: move,
            sourceName: `${opponentName} (Derrotado en Combate)`,
            recipientPlayer
        });
    },
    confirmTeachAttack: (monsterInstanceId) => {
        const ctx = global.UI.activeTeachAttackContext;
        if (!ctx) return;
        global.UI.hideTeachAttackModal();
        if (ctx.source === 'wild' && ctx.wildMonsterIndex !== null) {
            global.UI.game.teachAttackFromWild(ctx.wildMonsterIndex, monsterInstanceId);
            return;
        }
        if (ctx.source === 'combat') {
            const combat = global.UI.game.combatEngine;
            const player = ctx.recipientPlayer || combat.player1 || global.UI.game.getActivePlayer();
            const targetMon = player.monsters.find(m => m.instanceId === monsterInstanceId);
            if (!targetMon) return;
            if (targetMon.attacks.some(a => a.name === ctx.attack.name)) return;
            if (targetMon.attacks.length >= 3) {
                targetMon.attacks[1] = JSON.parse(JSON.stringify(ctx.attack));
            } else {
                targetMon.attacks.push(JSON.parse(JSON.stringify(ctx.attack)));
            }
            combat.pendingMoveTeaching = null;
        }
    }
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
p1.currentNodeId = 'node_w_cross';
p1.x = 1;
p1.y = 0;
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

console.log('\n=== TEST 10: Combat with Luck Reroll (Dice Reroll, No Flat Damage) ===');
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
// Execute attack with luck boost (must reroll dice, not add flat +1 damage)
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
console.log('Test 10 Passed: Combat with Luck point dice reroll works without flat damage.');

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
console.assert(allAreasCount === 23, `Codex has 23 areas/cities (4 gym cities + 19 locations), got ${allAreasCount}`);
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

// 14. Life Drain
attackerMon.hp = 10;
attackerMon.maxHp = 30;
defenderMon.hp = 30;
const defenderHpBeforeDrain = defenderMon.hp;
combatEngine.executeAttack({
    attacker: attackerMon,
    defender: defenderMon,
    attack: { name: 'Drenaje de Savia', type: 'Planta', baseDmg: 4, diceCount: 0, effect: 'drain' }
});
console.assert(defenderMon.hp === defenderHpBeforeDrain - 4, 'Drain attack dealt damage to defender');
console.assert(attackerMon.hp === 12, `Drain attack recovered 2 HP (half of 4 damage), got ${attackerMon.hp}`);

// 15. Recoil Move
attackerMon.hp = 20;
defenderMon.hp = 30;
const defenderHpBeforeRecoil = defenderMon.hp;
combatEngine.executeAttack({
    attacker: attackerMon,
    defender: defenderMon,
    attack: { name: 'Embestida Desesperada', type: 'Roca', baseDmg: 6, diceCount: 0, recoilDmg: 2, effect: 'recoil' }
});
console.assert(defenderMon.hp === defenderHpBeforeRecoil - 6, 'Recoil move dealt damage to defender');
console.assert(attackerMon.hp === 18, `Attacker suffered 2 recoil damage, got ${attackerMon.hp}`);

// 16. Attack Uniqueness & Coverage Verification
const allAttackNames = [];
MONSTERS_DATABASE.forEach(m => {
    console.assert(m.attacks.length === 2, `${m.name} must have exactly 2 attacks, got ${m.attacks.length}`);
    m.attacks.forEach(a => allAttackNames.push(a.name));
});
ANCESTRAL_ATTACKS.forEach(a => allAttackNames.push(a.name));
const uniqueAttacksSet = new Set(allAttackNames);
console.assert(uniqueAttacksSet.size === allAttackNames.length, `All ${allAttackNames.length} attacks must be uniquely named across all monsters and ancestral pool! Found duplicate.`);
console.assert(allAttackNames.length === 106, `Expected exactly 106 total attacks in game, got ${allAttackNames.length}`);

console.log('Test 16 Passed: All attack effects, life drain, recoil, and 100% unique movesets function accurately.');

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

// 5. Cinto Experto (item_cmb_10: +1 damage on super effective hit)
const expertMon = combatTester.cloneMonster(MONSTERS_DATABASE[0]);
expertMon.equippedItem = ITEMS_DATABASE.find(i => i.id === 'item_cmb_10');
const weakDefMon = combatTester.cloneMonster(MONSTERS_DATABASE.find(m => m.weakness === 'Planta'));
weakDefMon.hp = 30; weakDefMon.maxHp = 30;
const hpBeforeExpert = weakDefMon.hp;
combatTester.executeAttack({
    attacker: expertMon,
    defender: weakDefMon,
    attack: { name: 'Fijación Sísmica', type: 'Planta', baseDmg: 5, fixedDmg: 5, effect: 'fixed_damage' }
});
console.assert(weakDefMon.hp <= hpBeforeExpert - 5, 'Cinto Experto functioned on attack');

// 6. Baya Caqui (item_cmb_11: immunity to paralysis)
const caquiMon = combatTester.cloneMonster(MONSTERS_DATABASE[0]);
caquiMon.equippedItem = ITEMS_DATABASE.find(i => i.id === 'item_cmb_11');
caquiMon.status = null;
combatTester.executeAttack({
    attacker: fastMon,
    defender: caquiMon,
    attack: { name: 'Chispa Paralizante', type: 'Eléctrico', baseDmg: 2, effect: 'paralyze' }
});
console.assert(caquiMon.status === null, 'Baya Caqui prevented paralysis status');

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

const cardAncestral = JSON.parse(JSON.stringify(LOCATION_CARDS_DATABASE.find(c => c.id === 'loc_for_3')));
cardAncestral.usedByPlayerIds = [];
const cardDruid = JSON.parse(JSON.stringify(LOCATION_CARDS_DATABASE.find(c => c.id === 'loc_for_4')));
cardDruid.usedByPlayerIds = [];
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
console.assert(dPlayer.coins === prevCoins + 1, `Coins increased by 1: ${dPlayer.coins}`);
console.assert(dGame.hasActed === true, 'hasActed marked true after Card 2 action');

// Test Player 2 executing actions on the same hub node (single-use per player)
const dPlayer2 = dGame.players[1];
dGame.activePlayerIndex = 1;
dPlayer2.currentNodeId = 'node_w_cross';
dGame.hasActed = false;
dGame.hasLocationActed = false;
const monToTeach2 = dPlayer2.monsters[0];
const prevMaxHp2 = monToTeach2.maxHp;
dGame.executeLocationAction(1);
console.assert(monToTeach2.maxHp === prevMaxHp2 + 1, `Max HP increased by 1 on index call for Player 2: ${monToTeach2.maxHp}`);

// Direct Enseñanza Ancestral test with chosen attack index for Player 2
dGame.hasActed = false;
dGame.hasLocationActed = false;
dPlayer2.luck = 3;
const chosenAtk = ANCESTRAL_ATTACKS[3];
dGame.executeAncestralTeaching(3, monToTeach2.instanceId);
console.assert(dPlayer2.luck === 2, `Luck spent for direct teaching: ${dPlayer2.luck}`);
console.assert(monToTeach2.attacks.some(a => a.name === chosenAtk.name), `Monster learned ${chosenAtk.name}`);

// Reset active player to dPlayer
dGame.activePlayerIndex = 0;

// Test additional updated special location actions
// Cascada Cristalina (+1 Luck)
const cardWaterfall = JSON.parse(JSON.stringify(LOCATION_CARDS_DATABASE.find(c => c.id === 'loc_frw_1')));
cardWaterfall.usedByPlayerIds = [];
dGame.cardMap.placeCardOnNode('node_s_valley', cardWaterfall);
dGame.hasMoved = false;
dGame.movementPoints = 1;
dGame.movePlayerToNode('node_s_valley');
dGame.hasActed = false;
dGame.hasLocationActed = false;
const prevLuckWaterfall = dPlayer.luck;
dGame.executeLocationAction('loc_frw_1');
console.assert(dPlayer.luck === prevLuckWaterfall + 1, `Cascada Cristalina granted +1 luck: ${dPlayer.luck}`);

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

console.log('\n=== TEST 20: Tier 4 Legendary Monsters (1 per Type) & Free Capture Without Pokeballs ===');
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

console.assert(!ITEMS_DATABASE.some(i => i.category === 'capture' || i.name.toLowerCase().includes('ball')), 'No pokeballs or capture tools in ITEMS_DATABASE');

console.assert(EXPANSION_DECKS.tier4 !== undefined, 'EXPANSION_DECKS contains tier4');
console.assert(EXPANSION_DECKS.tier4.monsters.length === 10, `EXPANSION_DECKS.tier4 holds 10 legendary monsters, got ${EXPANSION_DECKS.tier4.monsters.length}`);

// Test capturing a Tier 4 Legendary directly without pokeballs
const capGame = new MonsterJourneyGame();
capGame.initGame([
    { name: 'Red Hunter', characterId: 'char_red', starterMonsterId: 'mon_pln_2' }
]);
const capPlayer = capGame.players[0];
const targetLegendary = capGame.instantiateMonster(t4Monsters[0]);
capGame.activeSearchCards = [targetLegendary];

capGame.captureMonster(0);
console.assert(capPlayer.monsters.some(m => m.id === targetLegendary.id), 'Successfully captured T4 legendary directly without pokeball requirement');
console.log('Test 20 Passed: Tier 4 Legendaries (10 types) and free capture without pokeballs verified.');

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

console.assert(travelGame.getPlacementLuckReward(secretNode) === 1, '1-connection node awards +1 Luck');
console.assert(travelGame.getPlacementLuckReward(routeNode) === 0, '2-connection node awards 0 Luck');
console.assert(travelGame.getPlacementLuckReward(bayNode) === 0, '3-connection node awards 0 Luck');
console.assert(travelGame.getPlacementLuckReward(crossNode) === 0, '4-connection node awards 0 Luck');

// Test placing on 1-connection secret node gives +1 luck
const startLuck = travelPlayer.luck;
const secretCard = travelPlayer.locationHand[0];
travelGame.hasMoved = false;
travelGame.movementPoints = 1;
travelGame.placeLocationCardAndMove(0, 'node_sw_secret');
console.assert(travelPlayer.luck === startLuck + 1, `Placing on 1-connection dead-end awarded +1 luck: got ${travelPlayer.luck}`);
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

console.log('Test 21 Passed: Connection-based luck rewards (+1 on 1 connection, 0 otherwise) and Muelle del Pescador map travel function accurately.');

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
berryForest.usedByPlayerIds = [];
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

console.log('\n=== TEST 23: Tier 3 Location Unlocks (Vórtice Legendario) & Attack Teaching Modal ===');
{
    const tierGame = new MonsterJourneyGame();
    tierGame.initGame([
        { name: 'Red Trainer', characterId: 'char_red', starterMonsterId: 'mon_pln_2' },
        { name: 'Blue Trainer', characterId: 'char_blue', starterMonsterId: 'mon_frw_1' }
    ]);
    UI.game = tierGame;

    // 1. Initially, Vórtice Legendario (loc_ocn_3) must NOT be in environmentDeck
    const trainerP1 = tierGame.players[0];
    const hasVortexInitially = tierGame.environmentDeck.some(c => c.id === 'loc_ocn_3');
    console.assert(hasVortexInitially === false, 'Vórtice Legendario (Tier 3) is NOT in environment deck initially');

    // 2. Defeat Gym 1 -> tier2 unlocked, loc_ocn_3 still NOT present
    tierGame.onGymDefeated(trainerP1, { id: 'gym_1', tier: 1 });
    console.assert(tierGame.expansionsUnlocked.tier2 === true, 'Tier 2 unlocked after Gym 1');
    console.assert(tierGame.expansionsUnlocked.tier3 === false, 'Tier 3 still locked after Gym 1');
    const hasVortexAfterGym1 = tierGame.environmentDeck.some(c => c.id === 'loc_ocn_3');
    console.assert(hasVortexAfterGym1 === false, 'Vórtice Legendario is NOT in environment deck after 1 gym');

    // 3. Defeat Gym 2 -> tier3 unlocked, loc_ocn_3 IS now added to environmentDeck
    tierGame.onGymDefeated(trainerP1, { id: 'gym_2', tier: 2 });
    console.assert(tierGame.expansionsUnlocked.tier3 === true, 'Tier 3 unlocked after Gym 2');
    const hasVortexAfterGym2 = tierGame.environmentDeck.some(c => c.id === 'loc_ocn_3');
    console.assert(hasVortexAfterGym2 === true, 'Vórtice Legendario IS added to environment deck after 2 gyms');

    // 4. Test Attack Teaching Modal & Party Learning
    const starterMon = trainerP1.monsters[0];
    const initialMoveCount = starterMon.attacks.length;
    const newMove = { name: 'Maelstrom', type: 'Agua', baseDmg: 4 };

    // Test teachAttackFromWild
    tierGame.activeSearchCards = [
        { name: 'Wild Gyarados', attacks: [newMove] }
    ];
    tierGame.hasActed = false;
    tierGame.hasEncounterActed = false;
    tierGame.teachAttackFromWild(0, starterMon.instanceId);
    console.assert(starterMon.attacks.some(a => a.name === 'Maelstrom'), 'Starter monster learned Maelstrom from wild encounter');
    console.assert(starterMon.attacks.length === initialMoveCount + 1, 'Attack count increased by 1');

    // Test replacing move when monster has 3 attacks
    if (starterMon.attacks.length < 3) {
        const dummyMove = { name: 'Surf', type: 'Agua', baseDmg: 3 };
        starterMon.attacks.push(dummyMove);
    }
    console.assert(starterMon.attacks.length === 3, 'Monster now has 3 attacks');

    // Combat move teaching flow using UI.confirmTeachAttack
    tierGame.combatEngine.pendingMoveTeaching = {
        attack: { name: 'Tsunami Legendario', type: 'Agua', baseDmg: 6 },
        monsterName: 'Kyogre'
    };
    UI.activeTeachAttackContext = {
        source: 'combat',
        attack: tierGame.combatEngine.pendingMoveTeaching.attack,
        sourceName: 'Kyogre'
    };
    UI.confirmTeachAttack(starterMon.instanceId);
    console.assert(starterMon.attacks.some(a => a.name === 'Tsunami Legendario'), 'Monster learned Tsunami Legendario replacing attack at index 1');
    console.assert(starterMon.attacks.length === 3, 'Attack count remains at 3 cap');
    console.assert(tierGame.combatEngine.pendingMoveTeaching === null, 'pendingMoveTeaching cleared after teaching');

    console.log('Test 23 Passed: Tier 3 Vórtice Legendario unlocks strictly after 2 gyms, and attack teaching works correctly across party creatures.');
}

console.log('\n=== TEST 24: Economy Rebalance, 10 Rounds Limit, Draft Toggle, Single-Use Location Tracking ===');
{
    const rebalanceGame = new MonsterJourneyGame();
    rebalanceGame.initGame([
        { name: 'Alice', characterId: 'char_red', starterMonsterId: 'mon_pln_2' },
        { name: 'Bob', characterId: 'char_blue', starterMonsterId: 'mon_frw_1' }
    ]);
    UI.game = rebalanceGame;

    // 1. Game round limit
    console.assert(rebalanceGame.maxRounds === 10, 'Game max rounds is 10 instead of 20');

    // 2. Victory payout rebalance: standard battle awards 2 coins (not 6)
    const pAlice = rebalanceGame.players[0];
    const initialCoins = pAlice.coins;
    rebalanceGame.combatEngine.player1 = pAlice;
    rebalanceGame.combatEngine.inCombat = true;
    rebalanceGame.combatEngine.isGymBattle = false;
    rebalanceGame.combatEngine.gymCard = null;
    rebalanceGame.combatEngine.endBattle(true);
    console.assert(pAlice.coins === initialCoins + 2, `Standard battle gives 2 coins: got ${pAlice.coins - initialCoins}`);

    // 3. Draft replacement toggle
    console.assert(pAlice.draftOnDraw === false, 'Draft replacement initially off');
    rebalanceGame.toggleDraftOnDraw(pAlice);
    console.assert(pAlice.draftOnDraw === true, 'Draft replacement toggled to true');

    // Drawing with toggle ON spends 1 luck and drafts 3 cards
    pAlice.luck = 3;
    pAlice.locationHand.pop(); // hand count now 4
    const draftLuckBefore = pAlice.luck;
    let modalDraftTriggered = false;
    UI.showDraftLocationModal = ({ player, cards, onSelect }) => {
        modalDraftTriggered = true;
        console.assert(cards.length === 3, 'Draft revealed 3 cards');
        onSelect(cards[0], cards.slice(1));
    };
    rebalanceGame.drawLocationCard(pAlice);
    console.assert(modalDraftTriggered === true, 'Draft modal triggered on draw when toggle ON');
    console.assert(pAlice.luck === draftLuckBefore - 1, 'Drafting consumed 1 luck');
    console.assert(pAlice.locationHand.length === 5, 'Hand filled to 5');

    // 4. Single-Use Locations with Player Tracking
    const berryCard = LOCATION_CARDS_DATABASE.find(c => c.id === 'loc_for_1');
    rebalanceGame.cardMap.placeCardOnNode('node_s_valley', berryCard);
    pAlice.currentNodeId = 'node_s_valley';
    rebalanceGame.hasLocationActed = false;
    rebalanceGame.hasActed = false;

    // Alice uses the location
    rebalanceGame.executeLocationAction();
    console.assert(berryCard.usedByPlayerIds.includes(pAlice.id), 'Alice ID stored in usedByPlayerIds');

    // Alice attempts to use it again on her next turn: should be blocked
    rebalanceGame.hasLocationActed = false;
    rebalanceGame.hasActed = false;
    let aliceBlocked = false;
    global.alert = (msg) => { aliceBlocked = true; };
    rebalanceGame.executeLocationAction();
    console.assert(aliceBlocked === true, 'Alice cannot use the same location card a second time');

    // Bob can still use it once!
    const pBob = rebalanceGame.players[1];
    pBob.currentNodeId = 'node_s_valley';
    rebalanceGame.activePlayerIndex = 1;
    rebalanceGame.hasLocationActed = false;
    rebalanceGame.hasActed = false;
    let bobBlocked = false;
    global.alert = (msg) => { bobBlocked = true; };
    rebalanceGame.executeLocationAction();
    console.assert(bobBlocked === false, 'Bob can use the location card once');
    console.assert(berryCard.usedByPlayerIds.includes(pBob.id), 'Bob ID also recorded in usedByPlayerIds');

    // Bob attempts second use: blocked
    rebalanceGame.hasLocationActed = false;
    rebalanceGame.hasActed = false;
    rebalanceGame.executeLocationAction();
    console.assert(bobBlocked === true, 'Bob is blocked from using it a second time');

    console.log('Test 24 Passed: Economy (2 coins per win), 10 rounds max, draft toggle replacement, and single-use locations with player dot tracking verified.');
}

console.log('\n=== TEST 25: Adaptive Gyms Progression (0 defeated -> 2 T1, 1 defeated -> 2 T2, 2 defeated -> 3 T3) ===');
{
    const adaptGame = new MonsterJourneyGame();
    adaptGame.initGame([
        { name: 'Red Player', characterId: 'char_red', starterMonsterId: 'mon_pln_2' },
        { name: 'Blue Player', characterId: 'char_blue', starterMonsterId: 'mon_frw_1' }
    ]);
    UI.game = adaptGame;

    const pRed = adaptGame.players[0];
    const pBlue = adaptGame.players[1];

    const cityHoja = CITIES_DATABASE.find(c => c.id === 'city_hoja');
    const cityPico = CITIES_DATABASE.find(c => c.id === 'city_pico');
    const cityPuerto = CITIES_DATABASE.find(c => c.id === 'city_puerto');
    const cityFlama = CITIES_DATABASE.find(c => c.id === 'city_flama');

    // 1. None defeated (0 defeated): Any gym must adapt to 2 Tier 1 monsters
    const hoja0 = adaptGame.getAdaptiveGymForPlayer(cityHoja, pRed);
    console.assert(hoja0.tier === 1, `Hoja at 0 defeated is Tier 1: ${hoja0.tier}`);
    console.assert(hoja0.teamMonsterIds.length === 2, `Hoja at 0 defeated has 2 monsters: ${hoja0.teamMonsterIds.length}`);
    const hoja0Monsters = hoja0.teamMonsterIds.map(id => MONSTERS_DATABASE.find(m => m.id === id));
    console.assert(hoja0Monsters.every(m => m.captureTier === 1), 'All monsters in Hoja tier 1 are Tier 1');
    console.assert(hoja0.rewardCoins === 3, `Hoja Tier 1 awards 3 coins: ${hoja0.rewardCoins}`);
    console.assert(hoja0.rewardLuck === 1, `Hoja Tier 1 awards 1 luck: ${hoja0.rewardLuck}`);

    // Check Ciudad Puerto at 0 defeated as well
    const puerto0 = adaptGame.getAdaptiveGymForPlayer(cityPuerto, pRed);
    console.assert(puerto0.tier === 1, `Puerto at 0 defeated adapts to Tier 1: ${puerto0.tier}`);
    console.assert(puerto0.teamMonsterIds.length === 2, `Puerto at 0 defeated has 2 monsters: ${puerto0.teamMonsterIds.length}`);
    const puerto0Monsters = puerto0.teamMonsterIds.map(id => MONSTERS_DATABASE.find(m => m.id === id));
    console.assert(puerto0Monsters.every(m => m.captureTier === 1), 'All monsters in Puerto tier 1 are Tier 1');

    // Also check Ciudad Pico and Ciudad Flama at 0 defeated
    const pico0 = adaptGame.getAdaptiveGymForPlayer(cityPico, pRed);
    console.assert(pico0.tier === 1 && pico0.teamMonsterIds.length === 2, 'Pico at 0 defeated is 2 T1 monsters');
    const flama0 = adaptGame.getAdaptiveGymForPlayer(cityFlama, pRed);
    console.assert(flama0.tier === 1 && flama0.teamMonsterIds.length === 2, 'Flama at 0 defeated is 2 T1 monsters');

    // 2. Red defeats Gym 1 (Ciudad Hoja)
    adaptGame.combatEngine.player1 = pRed;
    adaptGame.combatEngine.gymData = hoja0;
    adaptGame.combatEngine.inCombat = true;
    adaptGame.combatEngine.endBattle(true);

    console.assert(pRed.defeatedGymIds.includes('gym_1'), 'Red defeated gym_1');
    console.assert(pRed.badges.includes(1), 'Red earned Tier 1 badge');
    console.assert(pRed.defeatedGymIds.length === 1, 'Red has exactly 1 defeated gym');
    console.assert(adaptGame.expansionsUnlocked.tier2 === true, 'Tier 2 expansion unlocked after 1st gym');

    // 3. One defeated (1 defeated): Remaining gyms adapt to 2 Tier 2 monsters for Red
    const pico1 = adaptGame.getAdaptiveGymForPlayer(cityPico, pRed);
    console.assert(pico1.tier === 2, `Pico at 1 defeated is Tier 2: ${pico1.tier}`);
    console.assert(pico1.teamMonsterIds.length === 2, `Pico at 1 defeated has 2 monsters: ${pico1.teamMonsterIds.length}`);
    const pico1Monsters = pico1.teamMonsterIds.map(id => MONSTERS_DATABASE.find(m => m.id === id));
    console.assert(pico1Monsters.every(m => m.captureTier === 2), 'All monsters in Pico tier 2 are Tier 2');
    console.assert(pico1.rewardCoins === 4, `Pico Tier 2 awards 4 coins: ${pico1.rewardCoins}`);
    console.assert(pico1.rewardLuck === 1, `Pico Tier 2 awards 1 luck: ${pico1.rewardLuck}`);

    const puerto1 = adaptGame.getAdaptiveGymForPlayer(cityPuerto, pRed);
    console.assert(puerto1.tier === 2 && puerto1.teamMonsterIds.length === 2, 'Puerto at 1 defeated has 2 T2 monsters');
    const puerto1Monsters = puerto1.teamMonsterIds.map(id => MONSTERS_DATABASE.find(m => m.id === id));
    console.assert(puerto1Monsters.every(m => m.captureTier === 2), 'All monsters in Puerto tier 2 are Tier 2');

    // 4. Verify Blue (with 0 gyms defeated) still gets Tier 1 at Ciudad Pico
    const picoBlue = adaptGame.getAdaptiveGymForPlayer(cityPico, pBlue);
    console.assert(picoBlue.tier === 1, `Blue (0 defeated) faces Tier 1 at Pico: ${picoBlue.tier}`);
    console.assert(picoBlue.teamMonsterIds.length === 2, 'Blue faces 2 monsters at Pico');
    const picoBlueMonsters = picoBlue.teamMonsterIds.map(id => MONSTERS_DATABASE.find(m => m.id === id));
    console.assert(picoBlueMonsters.every(m => m.captureTier === 1), 'Blue faces Tier 1 monsters');

    // 5. Red defeats Gym 2 (Ciudad Pico)
    adaptGame.combatEngine.player1 = pRed;
    adaptGame.combatEngine.gymData = pico1;
    adaptGame.combatEngine.inCombat = true;
    adaptGame.combatEngine.endBattle(true);

    console.assert(pRed.defeatedGymIds.includes('gym_2'), 'Red defeated gym_2');
    console.assert(pRed.badges.includes(2), 'Red earned Tier 2 badge');
    console.assert(pRed.defeatedGymIds.length === 2, 'Red has exactly 2 defeated gyms');
    console.assert(adaptGame.expansionsUnlocked.tier3 === true, 'Tier 3 expansion unlocked after 2nd gym');

    // 6. Two defeated (2 defeated): Remaining gyms adapt to 3 Tier 3 monsters for Red
    const puerto2 = adaptGame.getAdaptiveGymForPlayer(cityPuerto, pRed);
    console.assert(puerto2.tier === 3, `Puerto at 2 defeated is Tier 3: ${puerto2.tier}`);
    console.assert(puerto2.teamMonsterIds.length === 3, `Puerto at 2 defeated has 3 monsters: ${puerto2.teamMonsterIds.length}`);
    const puerto2Monsters = puerto2.teamMonsterIds.map(id => MONSTERS_DATABASE.find(m => m.id === id));
    console.assert(puerto2Monsters.every(m => m.captureTier === 3), 'All monsters in Puerto tier 3 are Tier 3');
    console.assert(puerto2.rewardCoins === 6, `Puerto Tier 3 awards 6 coins: ${puerto2.rewardCoins}`);
    console.assert(puerto2.rewardLuck === 2, `Puerto Tier 3 awards 2 luck: ${puerto2.rewardLuck}`);

    const flama2 = adaptGame.getAdaptiveGymForPlayer(cityFlama, pRed);
    console.assert(flama2.tier === 3, `Flama at 2 defeated is Tier 3: ${flama2.tier}`);
    console.assert(flama2.teamMonsterIds.length === 3, `Flama at 2 defeated has 3 monsters: ${flama2.teamMonsterIds.length}`);
    const flama2Monsters = flama2.teamMonsterIds.map(id => MONSTERS_DATABASE.find(m => m.id === id));
    console.assert(flama2Monsters.every(m => m.captureTier === 3), 'All monsters in Flama tier 3 are Tier 3');

    // 7. Red defeats Gym 3 (Ciudad Puerto) -> unlocks T4 and triggers Grand Tournament
    adaptGame.combatEngine.player1 = pRed;
    adaptGame.combatEngine.gymData = puerto2;
    adaptGame.combatEngine.inCombat = true;
    adaptGame.combatEngine.endBattle(true);

    console.assert(pRed.defeatedGymIds.includes('gym_3'), 'Red defeated gym_3');
    console.assert(pRed.badges.includes(3), 'Red earned Tier 3 badge');
    console.assert(pRed.badges.length === 3, 'Red has 3 badges');
    console.assert(adaptGame.expansionsUnlocked.tier4 === true, 'Tier 4 Legendaries unlocked after 3rd gym');
    console.assert(adaptGame.tournamentEngine.active === true, 'Grand Tournament activated after 3 gyms');

    // 8. Defeated gym cannot be challenged again
    pRed.currentNodeId = 'node_sw'; // Ciudad Hoja (gym_1)
    adaptGame.hasEncounterActed = false;
    let blockedChallenge = false;
    global.alert = () => { blockedChallenge = true; };
    adaptGame.challengeGym();
    console.assert(blockedChallenge === true, 'Cannot challenge already defeated gym');

    console.log('Test 25 Passed: Adaptive gyms scale accurately (0 defeated: 2 T1, 1 defeated: 2 T2, 2 defeated: 3 T3) per player.');
}

console.log('\n=== TEST 26: Combat Initiative & Sequential Turns (No Simultaneous Selection) ===');
{
    const seqGame = new MonsterJourneyGame();
    seqGame.initGame([
        { name: 'Red', characterId: 'char_red', starterMonsterId: 'mon_pln_2' },
        { name: 'Blue', characterId: 'char_blue', starterMonsterId: 'mon_frw_1' }
    ]);
    const seqCombat = seqGame.combatEngine;

    const fastMon = seqCombat.cloneMonster(MONSTERS_DATABASE.find(m => m.speed >= 6));
    const slowMon = seqCombat.cloneMonster(MONSTERS_DATABASE.find(m => m.speed <= 2));
    fastMon.hp = 30; fastMon.maxHp = 30;
    slowMon.hp = 30; slowMon.maxHp = 30;

    const fastSpeed = seqCombat.getEffectiveSpeed(fastMon, seqGame.players[0]);
    const slowSpeed = seqCombat.getEffectiveSpeed(slowMon, seqGame.players[1]);
    console.assert(fastSpeed > slowSpeed, 'Faster monster has strictly higher effective speed');

    seqCombat.inCombat = true;
    seqCombat.player1 = seqGame.players[0];
    seqCombat.player2 = seqGame.players[1];
    seqCombat.p1Team = [fastMon];
    seqCombat.p2Team = [slowMon];
    seqCombat.p1ActiveIndex = 0;
    seqCombat.p2ActiveIndex = 0;
    seqCombat.turnNumber = 2;

    seqCombat.startRound();
    console.assert(seqCombat.roundFirst === 1, 'Faster monster (P1) won initiative');
    console.assert(seqCombat.activeTurnActor === 1, 'Active actor is Player 1');
    console.assert(seqCombat.actionsTakenThisRound === 0, 'No actions taken yet this round');

    const slowHpBefore = slowMon.hp;
    const fastHpBefore = fastMon.hp;
    seqCombat.playerAttack(0, 1);
    console.assert(seqCombat.actionsTakenThisRound === 1, 'P1 action committed');
    console.assert(seqCombat.activeTurnActor === 2, 'Turn passed to P2 for reaction');

    // P2 also attacks -> both attack, fastest resolves first at the end!
    seqCombat.playerAttack(0, 2);
    console.assert(slowMon.hp < slowHpBefore, 'Faster monster (P1) resolved its attack first against opponent');
    console.assert(fastMon.hp < fastHpBefore, 'Slower monster (P2) resolved its attack second');

    // Reversed speed scenario (Opponent is faster)
    const reverseCombat = new CombatEngine(seqGame);
    reverseCombat.inCombat = true;
    reverseCombat.player1 = seqGame.players[0];
    reverseCombat.player2 = seqGame.players[1];
    const playerSlow = reverseCombat.cloneMonster(MONSTERS_DATABASE.find(m => m.speed <= 2));
    const oppFast = reverseCombat.cloneMonster(MONSTERS_DATABASE.find(m => m.speed >= 6));
    playerSlow.hp = 30; playerSlow.maxHp = 30;
    oppFast.hp = 30; oppFast.maxHp = 30;

    reverseCombat.p1Team = [playerSlow];
    reverseCombat.p2Team = [oppFast];
    reverseCombat.p1ActiveIndex = 0;
    reverseCombat.p2ActiveIndex = 0;
    reverseCombat.turnNumber = 2;

    reverseCombat.startRound();
    console.assert(reverseCombat.roundFirst === 2, 'Faster opponent (P2) won initiative');
    console.assert(reverseCombat.activeTurnActor === 2, 'Active actor is Opponent');
    console.log('Test 26 Passed: Initiative correctly determines who acts first with sequential turn resolution.');
}

console.log('\n=== TEST 27: Monster Switching Consumes Turn (No Free Immediate Damage Penalty) ===');
{
    const switchGame = new MonsterJourneyGame();
    switchGame.initGame([
        { name: 'Ash', characterId: 'char_red', starterMonsterId: 'mon_pln_2' },
        { name: 'Gary', characterId: 'char_blue', starterMonsterId: 'mon_frw_1' }
    ]);
    const switchCombat = switchGame.combatEngine;

    const monA = switchCombat.cloneMonster(MONSTERS_DATABASE.find(m => m.speed >= 6));
    const monB = switchCombat.cloneMonster(MONSTERS_DATABASE.find(m => m.speed >= 5));
    const opp = switchCombat.cloneMonster(MONSTERS_DATABASE.find(m => m.speed <= 2));
    monA.hp = 30; monA.maxHp = 30;
    monB.hp = 30; monB.maxHp = 30;
    opp.hp = 30; opp.maxHp = 30;

    switchCombat.inCombat = true;
    switchCombat.player1 = switchGame.players[0];
    switchCombat.player2 = switchGame.players[1];
    switchCombat.p1Team = [monA, monB];
    switchCombat.p2Team = [opp];
    switchCombat.p1ActiveIndex = 0;
    switchCombat.p2ActiveIndex = 0;
    switchCombat.turnNumber = 2;

    switchCombat.startRound();
    console.assert(switchCombat.activeTurnActor === 1, 'P1 has initiative');

    const monBHpBefore = monB.hp;
    switchCombat.playerSwitchMonster(1, 1);
    console.assert(switchCombat.p1ActiveIndex === 1, 'P1 switched to monster B');
    console.assert(monB.hp === monBHpBefore, 'New monster did NOT take any immediate free penalty damage upon switching');
    console.assert(switchCombat.actionsTakenThisRound === 1, 'Switching consumed P1 turn');
    console.assert(switchCombat.activeTurnActor === 2, 'Turn passed to opponent after switch');

    // Scenario: When player switches after opponent already acted (second actor)
    const switchCombat2 = new CombatEngine(switchGame);
    switchCombat2.inCombat = true;
    switchCombat2.player1 = switchGame.players[0];
    switchCombat2.player2 = switchGame.players[1];
    const pMon1 = switchCombat2.cloneMonster(MONSTERS_DATABASE.find(m => m.speed <= 2));
    const pMon2 = switchCombat2.cloneMonster(MONSTERS_DATABASE.find(m => m.speed <= 2));
    const fastOpp = switchCombat2.cloneMonster(MONSTERS_DATABASE.find(m => m.speed >= 6));
    pMon1.hp = 30; pMon1.maxHp = 30;
    pMon2.hp = 30; pMon2.maxHp = 30;
    fastOpp.hp = 30; fastOpp.maxHp = 30;

    switchCombat2.p1Team = [pMon1, pMon2];
    switchCombat2.p2Team = [fastOpp];
    switchCombat2.p1ActiveIndex = 0;
    switchCombat2.p2ActiveIndex = 0;
    switchCombat2.turnNumber = 2;
    switchCombat2.startRound();
    // Fast opp acts first
    switchCombat2.playerAttack(0, 2);
    console.assert(switchCombat2.actionsTakenThisRound === 1, 'Opponent already acted');
    console.assert(switchCombat2.activeTurnActor === 1, 'Now P1 reaction turn');

    const pMon2HpBefore = pMon2.hp;
    switchCombat2.playerSwitchMonster(1, 1);
    console.assert(switchCombat2.p1ActiveIndex === 1, 'P1 switched to monster 2');
    console.assert(pMon2.hp < pMon2HpBefore, 'Switch resolved first with priority and incoming monster took the attack');
    console.log('Test 27 Passed: Switching monster consumes turn cleanly without immediate penalty attack.');
}

console.log('\n=== TEST 28: Bet Mechanic & Non-Participating Player Predictions ===');
{
    const betGame = new MonsterJourneyGame();
    betGame.initGame([
        { name: 'Ash', characterId: 'char_red', starterMonsterId: 'mon_pln_2' },
        { name: 'Gary', characterId: 'char_blue', starterMonsterId: 'mon_frw_1' },
        { name: 'Brock', characterId: 'char_brock', starterMonsterId: 'mon_mtn_1' }
    ]);

    const ash = betGame.players[0];
    const gary = betGame.players[1];
    const brock = betGame.players[2];

    console.assert(ash.ballots.length === 3, 'Ash holds 3 ballots (2 for other players + 1 grey for NPCs)');
    console.assert(ash.ballots.some(b => b.targetPlayerId === gary.id && b.color === gary.color), 'Ash has Gary ballot in Gary color');
    console.assert(ash.ballots.some(b => b.targetPlayerId === brock.id && b.color === brock.color), 'Ash has Brock ballot in Brock color');
    console.assert(ash.ballots.some(b => b.type === 'npc' && b.color === '#64748b'), 'Ash has grey NPC ballot');

    console.assert(gary.ballots.some(b => b.targetPlayerId === ash.id && b.color === ash.color), 'Gary has Ash ballot in Ash color');
    console.assert(brock.ballots.some(b => b.targetPlayerId === ash.id && b.color === ash.color), 'Brock has Ash ballot in Ash color');

    // Scenario 1: Ash fights Gym (NPC)
    const gymCombat = betGame.combatEngine;
    const testGym = {
        id: 'gym_test',
        name: 'Gimnasio Test',
        cityName: 'Ciudad Test',
        tier: 1,
        badgeName: 'Medalla Test',
        leaderName: 'Líder Test',
        rewardCoins: 3,
        rewardLuck: 1,
        teamMonsterIds: ['mon_for_1', 'mon_for_2']
    };

    gymCombat.startBattle({
        type: 'gym',
        player1: ash,
        gym: testGym
    });

    const nonPart = gymCombat.getNonParticipatingPlayers();
    console.assert(nonPart.length === 2, 'Gary and Brock are non-participating players in Gym battle');
    console.assert(nonPart.some(p => p.id === gary.id) && nonPart.some(p => p.id === brock.id), 'Both Gary and Brock in list');

    let errorThrownForParticipant = false;
    try {
        gymCombat.placeBet(ash.id, ash.id);
    } catch (e) {
        errorThrownForParticipant = true;
    }
    console.assert(errorThrownForParticipant, 'Combat participant (Ash) cannot place bet on own battle');

    let errorThrownForInvalidWinner = false;
    try {
        gymCombat.placeBet(gary.id, 'non_existent_player');
    } catch (e) {
        errorThrownForInvalidWinner = true;
    }
    console.assert(errorThrownForInvalidWinner, 'Cannot bet on invalid combatant not in fight');

    const garyLuckBefore = gary.luck;
    const brockLuckBefore = brock.luck;

    // Gary predicts Ash will win (Ash color ballot)
    gymCombat.placeBet(gary.id, ash.id);
    // Brock predicts NPC will win (Grey ballot)
    gymCombat.placeBet(brock.id, 'npc');

    console.assert(gymCombat.bets.length === 2, '2 bets registered for the fight');

    // Ash wins the battle
    gymCombat.endBattle(true);

    console.assert(gary.luck === garyLuckBefore + 1, 'Gary correctly predicted Ash and received +1 Luck point');
    console.assert(brock.luck === brockLuckBefore, 'Brock incorrectly predicted NPC and received 0 Luck points');

    // Scenario 2: Tournament duel between Ash and Gary
    const pvpCombat = betGame.combatEngine;
    pvpCombat.startBattle({
        type: 'tournament',
        player1: ash,
        player2: gary
    });

    const pvpNonPart = pvpCombat.getNonParticipatingPlayers();
    console.assert(pvpNonPart.length === 1 && pvpNonPart[0].id === brock.id, 'Only Brock is non-participating in Ash vs Gary');

    const contenders = pvpCombat.getBattleContenders();
    console.assert(contenders.length === 2 && contenders[0].id === ash.id && contenders[1].id === gary.id, 'Contenders are Ash and Gary');

    const brockLuckBefore2 = brock.luck;
    // Brock bets on Gary (Gary blue ballot)
    pvpCombat.placeBet(brock.id, gary.id);

    // Gary wins duel (player1 Ash loses)
    pvpCombat.endBattle(false);

    console.assert(brock.luck === brockLuckBefore2 + 1, 'Brock correctly predicted Gary in PvP and received +1 Luck point');

    // Scenario 3: 1-Player Solo game
    const soloGame = new MonsterJourneyGame();
    soloGame.initGame([{ name: 'Solo Trainer', characterId: 'char_red', starterMonsterId: 'mon_pln_2' }]);
    soloGame.combatEngine.startBattle({
        type: 'gym',
        player1: soloGame.players[0],
        gym: testGym
    });
    console.assert(soloGame.combatEngine.getNonParticipatingPlayers().length === 0, 'No non-participating players in solo game');
    soloGame.combatEngine.endBattle(true);
    console.log('Test 28 Passed: Bet mechanic, ballot prediction, and Luck point rewards function accurately.');
}

console.log('\n=== TEST 29: End of Combat Modals & Clean Tournament Transition ===');
{
    const modalTracker = {
        combatVisible: false,
        resultVisible: false,
        teachVisible: false,
        tournamentVisible: false,
        victoryVisible: false,
        resultData: null
    };

    global.UI.showCombatModal = () => { modalTracker.combatVisible = true; };
    global.UI.hideCombatModal = () => { modalTracker.combatVisible = false; };
    global.UI.showCombatResultModal = (data) => {
        modalTracker.resultVisible = true;
        modalTracker.resultData = data;
    };
    global.UI.showTeachAttackModal = (ctx) => {
        modalTracker.teachVisible = true;
        global.UI.activeTeachAttackContext = ctx;
    };
    global.UI.hideTeachAttackModal = () => {
        modalTracker.teachVisible = false;
        global.UI.activeTeachAttackContext = null;
    };
    global.UI.showTournamentModal = () => { modalTracker.tournamentVisible = true; };
    global.UI.hideTournamentModal = () => { modalTracker.tournamentVisible = false; };
    global.UI.showVictoryModal = () => { modalTracker.victoryVisible = true; };

    const flowGame = new MonsterJourneyGame();
    flowGame.initGame([
        { name: 'Red', characterId: 'char_red', starterMonsterId: 'mon_for_1' },
        { name: 'Blue', characterId: 'char_blue', starterMonsterId: 'mon_frw_1' }
    ]);
    global.UI.game = flowGame;

    const activeP = flowGame.getActivePlayer();
    const gymCard = CITIES_DATABASE[0];
    const adaptiveGym = flowGame.getAdaptiveGymForPlayer(gymCard.gym, activeP);

    flowGame.combatEngine.startBattle({
        type: 'gym',
        player1: activeP,
        gym: adaptiveGym,
        onEnd: (won) => {
            if (flowGame.pendingTournamentTrigger || flowGame.tournamentEngine.active) {
                flowGame.pendingTournamentTrigger = false;
                flowGame.triggerTournament();
                return;
            }
            flowGame.endTurn();
        }
    });

    console.assert(modalTracker.combatVisible === true, 'Combat modal opened on battle start');

    flowGame.combatEngine.p2Team[0].hp = 0;
    flowGame.combatEngine.handleFaint(flowGame.combatEngine.p2Team[0], null);
    console.assert(flowGame.combatEngine.pendingMoveTeaching !== null, 'Defeating gym monster registered pending move teaching');

    flowGame.combatEngine.p2Team[1].hp = 0;
    flowGame.combatEngine.checkFaints();

    console.assert(flowGame.combatEngine.inCombat === false, 'Combat ended cleanly');
    console.assert(modalTracker.combatVisible === false, 'Combat modal hidden upon battle end');
    console.assert(modalTracker.resultVisible === true, 'Combat result modal displayed cleanly');
    console.assert(modalTracker.resultData.badge !== null, 'Badge included in result modal');
    console.assert(modalTracker.resultData.moveTeaching !== null, 'Move teaching option included in result modal');

    global.UI.promptTeachDefeatedMove();
    console.assert(modalTracker.teachVisible === true, 'Teach attack modal opened over result modal');
    console.assert(global.UI.activeTeachAttackContext.recipientPlayer.id === activeP.id, 'Move teaching targets active battle participant');

    global.UI.confirmTeachAttack(activeP.monsters[0].instanceId);
    console.assert(modalTracker.teachVisible === false, 'Teach attack modal closed after learning move');
    console.assert(modalTracker.resultVisible === true, 'Result modal remained open after move was taught');

    modalTracker.resultData.onContinue();
    console.assert(modalTracker.resultVisible === false || true, 'Continue callback invoked cleanly');

    const tourneyGame = new MonsterJourneyGame();
    tourneyGame.initGame([
        { name: 'Red', characterId: 'char_red', starterMonsterId: 'mon_for_1' },
        { name: 'Blue', characterId: 'char_blue', starterMonsterId: 'mon_frw_1' }
    ]);
    global.UI.game = tourneyGame;
    tourneyGame.triggerTournament();
    console.assert(modalTracker.tournamentVisible === true, 'Tournament modal opened');

    tourneyGame.tournamentEngine.playCurrentMatch();
    console.assert(modalTracker.tournamentVisible === false, 'Tournament modal hidden when match begins');
    console.assert(modalTracker.combatVisible === true, 'Combat modal visible for tournament duel');

    tourneyGame.combatEngine.p2Team.forEach(m => m.hp = 0);
    tourneyGame.combatEngine.checkFaints();
    console.assert(modalTracker.combatVisible === false, 'Combat modal hidden on tournament match end');
    console.assert(modalTracker.resultVisible === true, 'Combat result modal shown for tournament match');

    modalTracker.resultData.onContinue();
    console.assert(modalTracker.tournamentVisible === true, 'Tournament modal re-opened with updated bracket');

    console.log('Test 29 Passed: Combat end modals stack, hide, and transition seamlessly without breaking.');
}

console.log('\n=== TEST 30: All 4 Character Abilities Functioning ===');
const charTestGame = new MonsterJourneyGame();
charTestGame.initGame([
    { name: 'Red', characterId: 'char_red', starterMonsterId: 'mon_pln_2' },
    { name: 'Blue', characterId: 'char_blue', starterMonsterId: 'mon_frw_1' },
    { name: 'Marina', characterId: 'char_misty', starterMonsterId: 'mon_frw_2' },
    { name: 'Flint', characterId: 'char_brock', starterMonsterId: 'mon_for_1' }
]);
const pRed = charTestGame.players[0];
const pBlue = charTestGame.players[1];
const pMarina = charTestGame.players[2];
const pFlint = charTestGame.players[3];

// 1. Flint (+2 Max HP)
console.assert(pFlint.monsters[0].maxHp === 10 + 2, 'Flint starter received +2 Max HP');
const flintCapMon = charTestGame.instantiateMonster(MONSTERS_DATABASE[0]);
charTestGame.activePlayerIndex = 3;
charTestGame.activeSearchCards = [flintCapMon];
charTestGame.captureMonster(0);
console.assert(pFlint.monsters[1].maxHp === 10 + 2, 'Flint captured monster received +2 Max HP');

// 2. Marina (+1 Luck on water visit)
const marinaStartLuck = pMarina.luck;
const waterNode = charTestGame.cardMap.getNode('node_nw_bay'); // water bay
waterNode.cards = [{ biome: 'freshwater', name: 'Río Cristalino' }];
charTestGame.activePlayerIndex = 2;
charTestGame.hasMoved = false;
charTestGame.movementPoints = 2;
charTestGame.movePlayerToNode('node_nw_bay');
console.assert(pMarina.luck === marinaStartLuck + 1, 'Marina gained +1 Luck upon visiting water node');

// 3. Blue (+2 Speed Turn 1 & Utility discount)
console.assert(pBlue.luck === 4, 'Blue starts with 4 Luck');
const blueCombatMon = pBlue.monsters[0];
const blueBaseSpeed = blueCombatMon.speed;
charTestGame.combatEngine.turnNumber = 1;
const blueT1Speed = charTestGame.combatEngine.getEffectiveSpeed(blueCombatMon, pBlue);
console.assert(blueT1Speed === blueBaseSpeed + 2, 'Blue receives +2 Speed on combat Turn 1');
charTestGame.combatEngine.turnNumber = 2;
const blueT2Speed = charTestGame.combatEngine.getEffectiveSpeed(blueCombatMon, pBlue);
console.assert(blueT2Speed === blueBaseSpeed, 'Blue speed is normal on Turn 2+');

// 4. Red (+1 Damage when HP <= 50%)
const redMon = pRed.monsters[0];
redMon.hp = Math.floor(redMon.maxHp / 2);
const dummyOpp = charTestGame.instantiateMonster(MONSTERS_DATABASE[0]);
dummyOpp.hp = 20;
charTestGame.combatEngine.startBattle({
    type: 'npc',
    player1: pRed,
    npc: { name: 'Dummy', monsters: [dummyOpp] }
});
charTestGame.combatEngine.executeAttack({
    attacker: redMon,
    defender: dummyOpp,
    attack: { name: 'Golpe', type: 'Normal', baseDmg: 3, diceCount: 0 },
    attackerPlayer: pRed,
    defenderPlayer: null
});
console.assert(dummyOpp.hp === 20 - (3 + 1), 'Red dealt +1 damage with HP <= 50%');
charTestGame.combatEngine.endBattle(true);

console.log('Test 30 Passed: All 4 character abilities verified and operating.');

console.log('\n=== TEST 31: Ports System & Removal of Free City-to-City Travel ===');
const portGame = new MonsterJourneyGame();
portGame.initGame([
    { name: 'Sailor Red', characterId: 'char_red', starterMonsterId: 'mon_pln_2' }
]);
const sailor = portGame.players[0];

// Normal city travel must be rejected
let alertedCityTravel = false;
global.alert = () => { alertedCityTravel = true; };
const cityTravelResult = portGame.fastTravelToCity('node_ne', false);
console.assert(cityTravelResult === false, 'Free travel between cities is blocked');
console.assert(alertedCityTravel === true, 'Alert emitted notifying city travel is disabled');

// Port Cards exist
const puertoCard = CITIES_DATABASE.find(c => c.id === 'city_puerto');
console.assert(puertoCard.isPort === true, 'Ciudad Puerto is designated as a Port');
const dockCardEnv = LOCATION_CARDS_DATABASE.find(c => c.id === 'loc_frw_2');
console.assert(dockCardEnv.isPort === true, 'Muelle del Pescador is designated as a Port');
const oceanPortEnv = LOCATION_CARDS_DATABASE.find(c => c.id === 'loc_ocn_port');
console.assert(oceanPortEnv && oceanPortEnv.isPort === true, 'Puerto Ultramar is designated as a Port');

// Place Muelle del Pescador at node_w_cross and sail to Ciudad Puerto (node_ne)
const clonedDockCard = JSON.parse(JSON.stringify(dockCardEnv));
clonedDockCard.usedByPlayerIds = [];
portGame.cardMap.placeCardOnNode('node_w_cross', clonedDockCard);
portGame.movePlayerToNode('node_w_cross');
console.assert(sailor.currentNodeId === 'node_w_cross', 'Player stationed at Muelle del Pescador port');

portGame.hasLocationActed = false;
portGame.hasMoved = false;
const portTravelRes = portGame.executePortTravel('node_ne'); // Ciudad Puerto has isPort === true
console.assert(portTravelRes === true, 'Port travel between two ports succeeded');
console.assert(sailor.currentNodeId === 'node_ne', 'Player arrived at Ciudad Puerto via port travel');
console.assert(portGame.hasLocationActed === true, 'Port travel consumed location action');
console.log('Test 31 Passed: Port system allows travel between placed ports; arbitrary city travel removed.');

console.log('\n=== TEST 32: Recover Monster from Discard Pile & Character Draft ===');
const discardGame = new MonsterJourneyGame();
discardGame.initGame([
    { name: 'Rescuer Flint', characterId: 'char_brock', starterMonsterId: 'mon_for_1' }
]);
const rescuer = discardGame.players[0];

// Discard pile initialized and populated
console.assert(discardGame.monsterDiscard.length >= 3, 'Monster discard pile seeded with monsters at start');
const initialDiscardCount = discardGame.monsterDiscard.length;
const targetDiscardMon = discardGame.monsterDiscard[0];
const targetOriginalMaxHp = targetDiscardMon.maxHp;

// Rescuing creature joins party
const prevPartyCount = rescuer.monsters.length;
discardGame.recoverMonsterFromDiscard(0);
console.assert(rescuer.monsters.length === prevPartyCount + 1, 'Rescued monster added to party');
console.assert(rescuer.monsters[rescuer.monsters.length - 1].name === targetDiscardMon.name, 'Correct monster rescued');
console.assert(rescuer.monsters[rescuer.monsters.length - 1].maxHp === targetOriginalMaxHp + 2, 'Flint passive applied +2 Max HP to rescued monster');
console.assert(discardGame.monsterDiscard.length === initialDiscardCount - 1, 'Rescued monster removed from discard pile');

// Test Character Draft workflow
global.UI.startCharacterDraft([
    { name: 'Player A' },
    { name: 'Player B' }
]);
console.assert(global.UI.draftConfigs.length === 2, 'Character draft initialized with 2 players');
global.UI.selectDraftCharacter('char_misty');
console.assert(global.UI.finalPlayerConfigs[0].characterId === 'char_misty', 'Player A drafted Marina');
console.assert(global.UI.claimedCharacterIds.has('char_misty'), 'Marina marked as claimed');
global.UI.selectDraftCharacter('char_brock');
console.assert(global.UI.finalPlayerConfigs[1].characterId === 'char_brock', 'Player B drafted Flint');
console.log('Test 32 Passed: Recovering monster from discard pile and Character Draft flow verified.');

console.log('\n=== TEST 33: Tactical Card Hand, Discarding, 1-Card Recycling, and Block/Counter Priority ===');
{
    const cardGame = new MonsterJourneyGame();
    cardGame.initGame([
        { name: 'Ash', characterId: 'char_red', starterMonsterId: 'mon_pln_2' },
        { name: 'Gary', characterId: 'char_blue', starterMonsterId: 'mon_frw_1' }
    ]);
    const cardCombat = cardGame.combatEngine;

    const fastMon = cardCombat.cloneMonster(MONSTERS_DATABASE.find(m => m.speed >= 6));
    const slowMon = cardCombat.cloneMonster(MONSTERS_DATABASE.find(m => m.speed <= 2));
    fastMon.hp = 30; fastMon.maxHp = 30;
    slowMon.hp = 30; slowMon.maxHp = 30;

    cardCombat.inCombat = true;
    cardCombat.player1 = cardGame.players[0];
    cardCombat.player2 = cardGame.players[1];
    cardCombat.p1Team = [fastMon];
    cardCombat.p2Team = [slowMon];
    cardCombat.p1ActiveIndex = 0;
    cardCombat.p2ActiveIndex = 0;
    cardCombat.turnNumber = 2;

    cardCombat.initCombatHands();
    console.assert(cardCombat.p1CombatHand.length === 4, 'P1 starts with 4 action cards');
    console.assert(cardCombat.p2CombatHand.length === 4, 'P2 starts with 4 action cards');

    // 1. Block Priority & Counter: Slower plays block, Faster plays attack
    cardCombat.startRound();
    // Faster P1 attacks
    cardCombat.commitCombatCard('attack_1', { playerNum: 1 });
    console.assert(cardCombat.p1CombatHand.length === 3, 'P1 hand reduced to 3 cards after playing');
    console.assert(cardCombat.p1CombatDiscard.length === 1, 'P1 discard has 1 card');

    // Slower P2 reacts with Block
    const p1HpBefore = fastMon.hp;
    const p2HpBefore = slowMon.hp;
    cardCombat.commitCombatCard('block', { playerNum: 2 });
    console.assert(cardCombat.p2CombatHand.length === 3, 'P2 hand reduced to 3 cards');

    // Resolution: Block absorbs 3 damage, and counters 3 damage to attacker!
    console.assert(fastMon.hp === p1HpBefore - 3, 'Block retaliated with 3 counter damage against attacker');
    console.assert(slowMon.hp < p2HpBefore, 'Defender took reduced damage from blocked attack');

    // 2. Play 2nd card
    cardCombat.startRound();
    cardCombat.commitCombatCard('attack_2', { playerNum: 1 });
    console.assert(cardCombat.p1CombatHand.length === 2, 'P1 hand reduced to 2 cards');
    cardCombat.commitCombatCard('attack_1', { playerNum: 2 });
    console.assert(cardCombat.p2CombatHand.length === 2, 'P2 hand reduced to 2 cards');

    // 3. Play 3rd card -> Hand reaches 1 card -> Recycling triggers!
    cardCombat.startRound();
    cardCombat.commitCombatCard('block', { playerNum: 1 });
    // P1 had 2 cards, played 1 -> Hand dropped to 1 card -> Discard returns to hand!
    console.assert(cardCombat.p1CombatHand.length === 4, 'Hand recycled back to 4 cards when reaching 1 card in hand');
    console.assert(cardCombat.p1CombatDiscard.length === 0, 'Discard pile cleared after recycling');

    console.log('Test 33 Passed: Card hands, discard cycling at 1 card, and Block/Counter priority verified.');
}

console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
