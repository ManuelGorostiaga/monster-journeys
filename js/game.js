class MonsterJourneyGame {
    constructor() {
        this.cardMap = new CardMap();
        this.combatEngine = new CombatEngine(this);
        this.tournamentEngine = new TournamentEngine(this);

        this.players = [];
        this.activePlayerIndex = 0;
        this.currentRound = 1;
        this.maxRounds = 10;

        // Turn state
        this.hasMoved = false;
        this._hasActed = false;
        this.hasLocationActed = false;
        this.hasEncounterActed = false;
        this.movementPoints = 1;

        // River Shop of 8 items without duplicates
        this.shopRiver = [];
        this.shopDiscard = [];

        // Encounter decks per biome
        this.biomeDecks = {};

        // Environment Deck & Cities Deck
        this.environmentDeck = [];
        this.environmentDiscard = [];
        this.citiesDeck = [];

        // Expansion deck unlock tracking
        this.totalGymsDefeated = 0;
        this.defeatedGymTiers = new Set();
        this.expansionsUnlocked = {
            tier2: false,
            tier3: false
        };

        // Active search state
        this.activeSearchCards = null;

        // Special discounts / active effects
        this.mobileShopDiscountActive = false;

        this.isGameOver = false;
    }

    get hasActed() {
        return this._hasActed;
    }

    set hasActed(val) {
        this._hasActed = Boolean(val);
        if (!val) {
            this.hasLocationActed = false;
            this.hasEncounterActed = false;
        }
    }

    initGame(playerConfigs) {
        this.players = [];
        this.currentRound = 1;
        this.activePlayerIndex = 0;
        this.hasMoved = false;
        this.hasActed = false;
        this.hasLocationActed = false;
        this.hasEncounterActed = false;
        this.movementPoints = 1;
        this.isGameOver = false;
        this.totalGymsDefeated = 0;
        this.defeatedGymTiers = new Set();
        this.expansionsUnlocked = { tier2: false, tier3: false, tier4: false };

        // Initialize Card Map with Starting Town at (0, 0)
        this.cardMap.initStartingBoard();

        // Initialize Environment Deck & Cities Deck
        this.initEnvironmentDeck();
        this.initCitiesDeck();

        // Initialize biome monster decks
        this.initBiomeDecks();

        // Initialize River Shop (8 unique items)
        this.initShopRiver();

        const cornerNodeIds = ['node_sw', 'node_ne', 'node_nw', 'node_se'];

        // Setup players
        playerConfigs.forEach((cfg, idx) => {
            const charData = CHARACTERS_DATABASE.find(c => c.id === cfg.characterId) || CHARACTERS_DATABASE[idx % CHARACTERS_DATABASE.length];
            const starterData = MONSTERS_DATABASE.find(m => m.id === cfg.starterMonsterId) || MONSTERS_DATABASE.find(m => m.id === charData.starterMonsterId);

            const starterMonster = this.instantiateMonster(starterData);

            // Flint character ability: +2 max HP to all monsters
            if (charData.id === 'char_brock') {
                starterMonster.maxHp += 2;
                starterMonster.hp = starterMonster.maxHp;
            }

            const startingItems = charData.startingItemIds.map(itemId => {
                const item = ITEMS_DATABASE.find(i => i.id === itemId);
                return JSON.parse(JSON.stringify(item));
            });

            const startNodeId = cornerNodeIds[idx % cornerNodeIds.length];
            const startNode = this.cardMap.getNode(startNodeId);

            // Player starts at their respective corner node
            const player = {
                id: `p${idx + 1}`,
                num: idx + 1,
                name: cfg.name || `Jugador ${idx + 1}`,
                characterId: charData.id,
                character: charData,
                color: ['#e53935', '#1e88e5', '#43a047', '#8e24aa'][idx % 4],
                currentNodeId: startNode.id,
                x: startNode.gridX,
                y: startNode.gridY,
                coins: charData.startingCoins,
                luck: charData.startingLuck !== undefined ? charData.startingLuck : 3,
                badges: [], // Array of defeated gym tiers: [1, 2, 3]
                defeatedGymIds: [],
                monsters: [starterMonster], // Up to 4 on board (3 active + 1 reserve)
                storageMonsters: [],
                inventory: startingItems, // Hand of item cards
                locationHand: [], // Hand of location cards (up to 5)
                draftOnDraw: false,
                temporaryModifiers: {
                    searchBonus: 0,
                    captureTierBonus: 0
                }
            };

            // Draw starting 5 location cards
            for (let i = 0; i < 5; i++) {
                const card = this.drawEnvironmentCard();
                if (card) player.locationHand.push(card);
            }

            this.players.push(player);
        });

        this.players.forEach(player => {
            player.ballots = this.createPlayerBallots(player);
        });

        this.startTurn();
    }

    createPlayerBallots(player) {
        if (!player) throw new Error('Player is required to create ballots');
        const otherPlayerBallots = this.players
            .filter(p => p.id !== player.id)
            .map(p => ({
                type: 'player',
                targetPlayerId: p.id,
                targetPlayerName: p.name,
                color: p.color
            }));
        const npcBallot = {
            type: 'npc',
            targetPlayerId: 'npc',
            targetPlayerName: 'NPCs / Gimnasio',
            color: '#64748b'
        };
        return [...otherPlayerBallots, npcBallot];
    }

    initEnvironmentDeck() {
        const isTier3Unlocked = Boolean(this.expansionsUnlocked && this.expansionsUnlocked.tier3);
        const available = LOCATION_CARDS_DATABASE.filter(c => (c.tier || 1) <= (isTier3Unlocked ? 3 : 1));
        this.environmentDeck = [...available].sort(() => Math.random() - 0.5);
        this.environmentDiscard = [];
    }

    initCitiesDeck() {
        this.citiesDeck = [];
    }

    getPlacementLuckReward(node) {
        const connCount = node && node.connections ? node.connections.length : 0;
        if (connCount === 1) return 1;
        return 0;
    }

    toggleDraftOnDraw(player = null) {
        const p = player || this.getActivePlayer();
        p.draftOnDraw = !p.draftOnDraw;
        SoundFX.step();
        if (window.UI) {
            UI.logGame(`🍀 ${p.name} ${p.draftOnDraw ? 'activó' : 'desactivó'} el reemplazo: Draftear 3 cartas por 1 🍀 al robar.`);
            UI.renderAll();
        }
        return p.draftOnDraw;
    }

    drawEnvironmentCard() {
        if (this.environmentDeck.length === 0) {
            if (this.environmentDiscard.length === 0) {
                const isTier3Unlocked = Boolean(this.expansionsUnlocked && this.expansionsUnlocked.tier3);
                const available = LOCATION_CARDS_DATABASE.filter(c => (c.tier || 1) <= (isTier3Unlocked ? 3 : 1));
                this.environmentDeck = [...available].sort(() => Math.random() - 0.5);
            } else {
                this.environmentDeck = [...this.environmentDiscard].sort(() => Math.random() - 0.5);
                this.environmentDiscard = [];
            }
        }
        return this.environmentDeck.pop();
    }

    refillLocationHand(player) {
        if (player.locationHand.length < 5 && player.draftOnDraw) {
            if (player.luck >= 1) {
                this.draftLocationCard(player, () => {
                    this.refillLocationHand(player);
                });
                return;
            } else if (window.UI) {
                UI.logGame(`⚠️ ${player.name} no tiene suficiente Suerte 🍀 para draftear. Robando 1 carta normal.`);
            }
        }

        while (player.locationHand.length < 5) {
            const card = this.drawEnvironmentCard();
            if (!card) break;
            player.locationHand.push(card);
        }
    }

    drawLocationCard(player = null) {
        const p = player || this.getActivePlayer();
        if (p.locationHand.length >= 5) {
            alert('Mano completa (máximo 5 cartas de localización).');
            return false;
        }
        if (p.draftOnDraw) {
            if (p.luck >= 1) {
                this.draftLocationCard(p);
                return true;
            } else if (window.UI) {
                UI.logGame(`⚠️ ${p.name} no tiene suficiente Suerte 🍀 para draftear. Robando 1 carta normal.`);
            }
        }
        const card = this.drawEnvironmentCard();
        if (card) {
            p.locationHand.push(card);
            SoundFX.step();
            if (window.UI) {
                UI.logGame(`🃏 ${p.name} robó 1 carta de localización: **${card.name}**.`);
                UI.renderAll();
            }
            return true;
        }
        return false;
    }

    // Spend 1 luck to draft 3 cards instead of drawing 1
    draftLocationCard(player, onFinish = null) {
        if (player.luck < 1) {
            alert('¡Necesitas al menos 1 Punto de Suerte 🍀 para draftear cartas de localización!');
            if (onFinish) onFinish();
            return;
        }

        player.luck -= 1;
        SoundFX.diceRoll();

        // Reveal 3 cards
        const draftPicks = [];
        for (let i = 0; i < 3; i++) {
            const c = this.drawEnvironmentCard();
            if (c) draftPicks.push(c);
        }

        if (draftPicks.length === 0) {
            if (onFinish) onFinish();
            return;
        }

        if (window.UI) {
            UI.showDraftLocationModal({
                player,
                cards: draftPicks,
                onSelect: (selectedCard, discarded) => {
                    player.locationHand.push(selectedCard);
                    this.environmentDiscard.push(...discarded);
                    while (player.locationHand.length > 5) {
                        player.locationHand.shift();
                    }
                    UI.logGame(`🍀 ${player.name} gastó 1 Suerte y drafteó **${selectedCard.name}**.`);
                    UI.renderAll();
                    if (onFinish) onFinish();
                }
            });
        }
    }

    instantiateMonster(baseMonster) {
        return {
            instanceId: 'inst_' + Math.random().toString(36).substr(2, 9),
            id: baseMonster.id,
            name: baseMonster.name,
            biome: baseMonster.biome,
            type: baseMonster.type,
            weakness: baseMonster.weakness,
            hp: baseMonster.hp,
            maxHp: baseMonster.maxHp,
            speed: baseMonster.speed,
            captureTier: baseMonster.captureTier,
            icon: baseMonster.icon,
            attacks: JSON.parse(JSON.stringify(baseMonster.attacks)),
            overworldAbility: baseMonster.overworldAbility ? JSON.parse(JSON.stringify(baseMonster.overworldAbility)) : null,
            equippedItem: null
        };
    }

    getUnlockedTiers() {
        const tiers = [1];
        if (this.expansionsUnlocked.tier2) tiers.push(2);
        if (this.expansionsUnlocked.tier3) tiers.push(3);
        if (this.expansionsUnlocked.tier4) tiers.push(4);
        return tiers;
    }

    initBiomeDecks() {
        this.biomeDecks = {};
        const allowedTiers = this.getUnlockedTiers();
        Object.keys(BIOMES).forEach(biomeKey => {
            const list = MONSTERS_DATABASE.filter(m => m.biome === biomeKey && allowedTiers.includes(m.captureTier));
            this.biomeDecks[biomeKey] = [...list, ...list, ...list].sort(() => Math.random() - 0.5);
        });
    }

    refillBiomeDeck(biome) {
        const allowedTiers = this.getUnlockedTiers();
        const available = MONSTERS_DATABASE.filter(m => m.biome === biome && allowedTiers.includes(m.captureTier));
        const newCards = [...available, ...available, ...available].sort(() => Math.random() - 0.5);
        if (!this.biomeDecks[biome]) {
            this.biomeDecks[biome] = [];
        }
        this.biomeDecks[biome].push(...newCards);
    }

    drawMonsterCard(biome) {
        if (!this.biomeDecks[biome] || this.biomeDecks[biome].length === 0) {
            this.refillBiomeDeck(biome);
        }
        return this.instantiateMonster(this.biomeDecks[biome].pop());
    }

    // Rule 16: River Shop with 8 unique items
    initShopRiver() {
        this.shopRiver = [];
        this.shopDiscard = [];
        const pool = [...ITEMS_DATABASE].sort(() => Math.random() - 0.5);
        for (const item of pool) {
            if (this.shopRiver.length >= 8) break;
            if (!this.shopRiver.some(i => i.id === item.id)) {
                this.shopRiver.push(JSON.parse(JSON.stringify(item)));
            }
        }
    }

    replenishShopRiver() {
        while (this.shopRiver.length < 8) {
            const available = ITEMS_DATABASE.filter(item => !this.shopRiver.some(r => r.id === item.id));
            if (available.length === 0) break;
            const pick = available[Math.floor(Math.random() * available.length)];
            this.shopRiver.push(JSON.parse(JSON.stringify(pick)));
        }
    }

    getActivePlayer() {
        return this.players[this.activePlayerIndex];
    }

    startTurn() {
        const player = this.getActivePlayer();
        this.hasMoved = false;
        this.hasActed = false;
        this.hasLocationActed = false;
        this.hasEncounterActed = false;
        this.movementPoints = 1;
        this.mobileShopDiscountActive = false;

        // Reset turn-based modifiers
        player.temporaryModifiers.searchBonus = 0;
        player.temporaryModifiers.captureTierBonus = 0;

        // Check for Light Boots (Zapatillas)
        const hasBoots = player.inventory.some(i => i.id === 'item_utl_1') || player.monsters.some(m => m.equippedItem && m.equippedItem.id === 'item_utl_1');
        if (hasBoots) {
            this.movementPoints = 2;
        }

        // Check Treasure Magnet: +1 gold coin every turn!
        const hasMagnet = player.inventory.some(i => i.id === 'item_utl_8');
        if (hasMagnet) {
            player.coins += 1;
            SoundFX.coin();
        }

        // Refill hand up to 5 cards if needed
        this.refillLocationHand(player);

        if (window.UI) {
            UI.renderAll();
            UI.logGame(`Turno de **${player.name}** (Ronda ${this.currentRound}/${this.maxRounds}).`);
        }
    }

    // Movement on connected graph route
    movePlayerToNode(targetXOrId, maybeY) {
        const player = this.getActivePlayer();
        if (this.hasMoved) {
            alert('Ya has realizado tu movimiento en este turno.');
            return false;
        }
        if (!this.movementPoints || this.movementPoints <= 0) {
            this.movementPoints = 1;
        }

        const targetNode = this.cardMap.getNode(targetXOrId, maybeY);
        if (!targetNode) {
            alert('No se encontró el nodo destino en el mapa.');
            return false;
        }

        const currentNode = this.cardMap.getNode(player.currentNodeId || `${player.x},${player.y}`);
        if (!currentNode) {
            throw new Error('Nodo actual del jugador no encontrado en el mapa');
        }

        if (currentNode.id === targetNode.id) {
            return false;
        }

        if (targetNode.cards.length === 0) {
            alert(`El nodo ${targetNode.name} aún no ha sido descubierto.`);
            return false;
        }

        const { reachableDiscovered } = this.cardMap.getReachableNodes(currentNode.id, this.movementPoints);
        const reachInfo = reachableDiscovered.get(targetNode.id);

        const isDirectConnection = currentNode.connections.includes(targetNode.id);
        const gridDist = Math.abs(currentNode.gridX - targetNode.gridX) + Math.abs(currentNode.gridY - targetNode.gridY);
        const canTraverseFallback = isDirectConnection || (gridDist > 0 && gridDist <= this.movementPoints);

        if (!reachInfo && !canTraverseFallback) {
            alert(`No hay una ruta transitable hasta ${targetNode.name} con tus puntos de movimiento disponibles (${this.movementPoints}).`);
            return false;
        }

        const cost = reachInfo ? reachInfo.distance : 1;
        player.currentNodeId = targetNode.id;
        player.x = targetNode.gridX;
        player.y = targetNode.gridY;
        this.movementPoints = Math.max(0, this.movementPoints - cost);
        if (this.movementPoints <= 0) {
            this.hasMoved = true;
        }
        SoundFX.step();

        if (window.UI) {
            const remainingNotice = this.movementPoints > 0 ? ` (${this.movementPoints} paso restante)` : '';
            UI.logGame(`${player.name} se desplazó por la ruta hasta **${targetNode.name}**${remainingNotice}.`);
            UI.renderAll();
        }
        return true;
    }

    // Placing a location card from hand into an adjacent connected slot
    placeLocationCardAndMove(cardIndexInHand, targetXOrId, maybeY) {
        const player = this.getActivePlayer();
        if (this.hasMoved) {
            alert('Ya has realizado tu movimiento en este turno.');
            return false;
        }
        if (!this.movementPoints || this.movementPoints <= 0) {
            this.movementPoints = 1;
        }

        const targetNode = this.cardMap.getNode(targetXOrId, maybeY);
        if (!targetNode) {
            alert('Nodo no encontrado en el mapa.');
            return false;
        }

        const currentNode = this.cardMap.getNode(player.currentNodeId || `${player.x},${player.y}`);
        const isConnected = currentNode ? currentNode.connections.includes(targetNode.id) : true;
        const gridDist = currentNode ? (Math.abs(currentNode.gridX - targetNode.gridX) + Math.abs(currentNode.gridY - targetNode.gridY)) : 1;
        const isAdjacent = isConnected || (gridDist === 1);
        const isSameNodeWithRoom = (currentNode && currentNode.id === targetNode.id && targetNode.cards.length < targetNode.maxCards);

        if (!isAdjacent && !isSameNodeWithRoom) {
            alert('Solo puedes colocar cartas en nodos conectados a tu posición actual.');
            return false;
        }

        if (targetNode.cards.length >= targetNode.maxCards) {
            alert(`El nodo ${targetNode.name} ya tiene su capacidad máxima (${targetNode.maxCards} carta${targetNode.maxCards > 1 ? 's' : ''}).`);
            return false;
        }

        const card = player.locationHand[cardIndexInHand];
        if (!card) return false;

        player.locationHand.splice(cardIndexInHand, 1);
        this.cardMap.placeCardOnNode(targetNode.id, card);

        const luckReward = this.getPlacementLuckReward(targetNode);
        player.luck += luckReward;

        player.currentNodeId = targetNode.id;
        player.x = targetNode.gridX;
        player.y = targetNode.gridY;
        this.movementPoints = Math.max(0, this.movementPoints - 1);
        if (this.movementPoints <= 0) {
            this.hasMoved = true;
        }
        SoundFX.step();

        if (player.inventory.some(i => i.id === 'item_utl_3')) {
            player.coins += 1;
            SoundFX.coin();
        }

        this.refillLocationHand(player);

        if (window.UI) {
            const connCount = targetNode.connections ? targetNode.connections.length : 0;
            const luckText = luckReward > 0 ? ` y ganó **+${luckReward} Suerte 🍀**` : '';
            UI.logGame(`🗺️ ${player.name} descubrió **${card.name}** en ${targetNode.name} (${connCount} conexi${connCount === 1 ? 'ón' : 'ones'})${luckText}.`);
            UI.renderAll();
        }
        return true;
    }

    // Place top of Cities Deck into adjacent connected slot
    placeCityCardAndMove(targetXOrId, maybeY) {
        const player = this.getActivePlayer();
        if (this.hasMoved) {
            alert('Ya has realizado tu movimiento en este turno.');
            return false;
        }
        if (!this.movementPoints || this.movementPoints <= 0) {
            this.movementPoints = 1;
        }

        const targetNode = this.cardMap.getNode(targetXOrId, maybeY);
        if (!targetNode) {
            alert('Nodo no encontrado en el mapa.');
            return false;
        }

        const currentNode = this.cardMap.getNode(player.currentNodeId || `${player.x},${player.y}`);
        const isConnected = currentNode ? currentNode.connections.includes(targetNode.id) : true;
        const gridDist = currentNode ? (Math.abs(currentNode.gridX - targetNode.gridX) + Math.abs(currentNode.gridY - targetNode.gridY)) : 1;
        const isAdjacent = isConnected || (gridDist === 1);
        const isSameNodeWithRoom = (currentNode && currentNode.id === targetNode.id && targetNode.cards.length < targetNode.maxCards);

        if (!isAdjacent && !isSameNodeWithRoom) {
            alert('Solo puedes fundar una ciudad en nodos conectados a tu posición actual.');
            return false;
        }

        if (targetNode.cards.length >= targetNode.maxCards) {
            alert(`El nodo ${targetNode.name} ya tiene su capacidad máxima (${targetNode.maxCards} carta${targetNode.maxCards > 1 ? 's' : ''}).`);
            return false;
        }

        if (this.citiesDeck.length === 0) {
            alert('¡Ya se han colocado todas las ciudades del mazo de ciudades!');
            return false;
        }

        const cityCard = this.citiesDeck.shift();
        this.cardMap.placeCardOnNode(targetNode.id, cityCard);

        const cityLuckReward = this.getPlacementLuckReward(targetNode);
        player.luck += cityLuckReward;

        player.currentNodeId = targetNode.id;
        player.x = targetNode.gridX;
        player.y = targetNode.gridY;
        this.movementPoints = Math.max(0, this.movementPoints - 1);
        if (this.movementPoints <= 0) {
            this.hasMoved = true;
        }
        SoundFX.victory();

        if (player.inventory.some(i => i.id === 'item_utl_3')) {
            player.coins += 1;
            SoundFX.coin();
        }

        const leader = (cityCard.gym && cityCard.gym.leaderName) || cityCard.leaderName || 'Líder de Gimnasio';
        if (window.UI) {
            const connCount = targetNode.connections ? targetNode.connections.length : 0;
            const cityLuckText = cityLuckReward > 0 ? ` y ganó **+${cityLuckReward} Suerte 🍀**` : '';
            UI.logGame(`🏛️ ¡${player.name} fundó la ciudad de **${cityCard.name}** en ${targetNode.name} (${connCount} conexiones)${cityLuckText}! Alberga el Gimnasio de ${leader}.`);
            UI.renderAll();
        }
        return true;
    }

    // Rule 15: Fast Travel between Cities
    fastTravelToCity(targetCityNodeId, isFlight = false) {
        const player = this.getActivePlayer();
        const currentNode = this.cardMap.getNode(player.currentNodeId || `${player.x},${player.y}`);
        if (!isFlight && (!currentNode || !currentNode.cards.some(c => c.biome === 'city'))) {
            alert('Debes estar en una Ciudad para viajar rápidamente a otra.');
            return false;
        }

        const targetNode = this.cardMap.getNode(targetCityNodeId);
        if (!targetNode || !targetNode.cards.some(c => c.biome === 'city')) {
            alert('Solo puedes viajar a nodos que contengan una Ciudad.');
            return false;
        }

        player.currentNodeId = targetNode.id;
        player.x = targetNode.gridX;
        player.y = targetNode.gridY;
        this.hasMoved = true;
        this.hasActed = true;
        SoundFX.victory();

        if (window.UI) {
            UI.hideCityTravelModal();
            UI.logGame(`✈️ ${player.name} usó ${isFlight ? 'Vuelo Rápido' : 'el viaje rápido'} hacia **${targetNode.name}**.`);
            UI.renderAll();
        }
        return true;
    }

    // Requirement 4: Execute Location Action (resource trade or special action)
    executeLocationAction(cardIdOrIndex = null) {
        const player = this.getActivePlayer();
        if (this.hasLocationActed) {
            alert('Ya has tomado la acción de localización en este turno.');
            return;
        }

        const node = this.cardMap.getNode(player.currentNodeId || `${player.x},${player.y}`);
        if (!node || !node.cards || node.cards.length === 0) {
            alert('No hay cartas en esta localización.');
            return;
        }

        let cardWithAction = null;
        if (cardIdOrIndex !== null && cardIdOrIndex !== undefined) {
            if (typeof cardIdOrIndex === 'number') {
                const actionCards = node.cards.filter(c => Boolean(c.locationAction));
                cardWithAction = node.cards[cardIdOrIndex] || actionCards[cardIdOrIndex] || null;
            } else if (typeof cardIdOrIndex === 'string') {
                cardWithAction = node.cards.find(c => c.id === cardIdOrIndex) || null;
            }
        }
        if (!cardWithAction) {
            cardWithAction = node.cards.find(c => Boolean(c.locationAction));
        }

        if (!cardWithAction || !cardWithAction.locationAction) {
            alert('Esta localización no posee una acción especial disponible.');
            return;
        }

        if (!cardWithAction.usedByPlayerIds) {
            cardWithAction.usedByPlayerIds = [];
        }
        if (cardWithAction.usedByPlayerIds.includes(player.id)) {
            alert(`Ya has utilizado esta localización (${cardWithAction.name}). Cada jugador solo puede usarla una vez.`);
            return;
        }

        const action = cardWithAction.locationAction;

        if (action.type === 'trade') {
            const costCoins = action.costCoins || 0;
            const costLuck = action.costLuck || 0;
            const gainCoins = action.gainCoins || 0;
            const gainLuck = action.gainLuck || 0;

            if (player.coins < costCoins) {
                alert(`No tienes suficientes monedas. Requiere ${costCoins} 🪙 y tienes ${player.coins}.`);
                return;
            }
            if (player.luck < costLuck) {
                alert(`No tienes suficiente suerte. Requiere ${costLuck} 🍀 y tienes ${player.luck}.`);
                return;
            }

            player.coins -= costCoins;
            player.luck -= costLuck;
            player.coins += gainCoins;
            player.luck += gainLuck;
            cardWithAction.usedByPlayerIds.push(player.id);
            this.hasLocationActed = true;
            this.hasActed = true;
            SoundFX.coin();

            if (window.UI) {
                UI.logGame(`🔄 ${player.name} realizó la acción de **${cardWithAction.name}**: ${action.desc}`);
                UI.renderAll();
            }
            return;
        }

        if (action.type === 'special') {
            if (cardWithAction.id === 'loc_start_town' || cardWithAction.isStart || (cardWithAction.id && cardWithAction.id.startsWith('loc_start'))) {
                player.monsters.forEach(m => m.hp = m.maxHp);
                player.luck += 1;
                cardWithAction.usedByPlayerIds.push(player.id);
                this.hasLocationActed = true;
                this.hasActed = true;
                SoundFX.victory();
                if (window.UI) UI.logGame(`🏡 ${player.name} descansó en Casa: Curó a su equipo y obtuvo +1 Suerte 🍀.`);
            } else if (cardWithAction.id === 'loc_for_1') {
                const berry = ITEMS_DATABASE.find(i => i.id === 'item_cmb_7');
                if (berry) player.inventory.push(JSON.parse(JSON.stringify(berry)));
                player.luck += 1;
                cardWithAction.usedByPlayerIds.push(player.id);
                this.hasLocationActed = true;
                this.hasActed = true;
                SoundFX.coin();
                if (window.UI) UI.logGame(`🫐 ${player.name} cosechó en Bosque de las Bayas: Obtuvo 1 Baya Aranja y +1 Suerte 🍀.`);
            } else if (cardWithAction.id === 'loc_for_3') {
                if (player.luck < 1) {
                    alert('Requiere al menos 1 Punto de Suerte 🍀.');
                    return;
                }
                if (window.UI && typeof window.UI.promptAncestralTeaching === 'function') {
                    window.UI.promptAncestralTeaching();
                    return;
                }
                const targetMon = player.monsters[0];
                if (targetMon) {
                    this.executeAncestralTeaching(0, targetMon.instanceId);
                }
                return;
            } else if (cardWithAction.id === 'loc_for_4') {
                if (window.UI && typeof window.UI.promptDruidBlessing === 'function') {
                    window.UI.promptDruidBlessing();
                    return;
                }
                const targetMon = player.monsters[0];
                if (targetMon) {
                    this.executeDruidBlessing(targetMon.instanceId);
                }
                return;
            } else if (cardWithAction.id === 'loc_mtn_3') {
                const c1 = this.drawEnvironmentCard();
                const c2 = this.drawEnvironmentCard();
                if (c1) player.locationHand.push(c1);
                if (c2) player.locationHand.push(c2);
                cardWithAction.usedByPlayerIds.push(player.id);
                this.hasLocationActed = true;
                this.hasActed = true;
                SoundFX.step();
                if (window.UI) UI.logGame(`🦅 ${player.name} oteó el horizonte en Nido del Águila y robó 2 cartas de localización extra.`);
            } else if (cardWithAction.id === 'loc_mtn_4') {
                if (player.luck < 1) {
                    alert('Requiere 1 Suerte 🍀.');
                    return;
                }
                player.luck -= 1;
                player.coins += 2;
                cardWithAction.usedByPlayerIds.push(player.id);
                this.hasLocationActed = true;
                this.hasActed = true;
                SoundFX.coin();
                if (window.UI) UI.logGame(`⛏️ ${player.name} excavó en Cueva de los Fósiles: Gastó 1 Suerte y halló 2 Monedas 🪙.`);
            } else if (cardWithAction.id === 'loc_pln_2') {
                this.mobileShopDiscountActive = true;
                cardWithAction.usedByPlayerIds.push(player.id);
                if (window.UI) {
                    UI.showShopModal();
                    UI.logGame(`⛺ ${player.name} visitó la Feria Ambulante con descuento de 1 moneda!`);
                }
                this.hasLocationActed = true;
                this.hasActed = true;
                return;
            } else if (cardWithAction.id === 'loc_pln_4') {
                if (player.luck < 1) {
                    alert('Requiere 1 Suerte 🍀.');
                    return;
                }
                player.luck -= 1;
                player.coins += 2;
                cardWithAction.usedByPlayerIds.push(player.id);
                this.hasLocationActed = true;
                this.hasActed = true;
                SoundFX.victory();
                if (window.UI) UI.logGame(`⚔️ ${player.name} triunfó en Llanura de Duelos: Gastó 1 Suerte y ganó 2 Monedas 🪙.`);
            } else if (cardWithAction.id === 'loc_frw_1') {
                player.luck += 1;
                cardWithAction.usedByPlayerIds.push(player.id);
                this.hasLocationActed = true;
                this.hasActed = true;
                SoundFX.victory();
                if (window.UI) UI.logGame(`🏞️ ${player.name} recibió el Bautismo Fluvial en Cascada Cristalina: +1 Suerte 🍀.`);
            } else if (cardWithAction.id === 'loc_frw_2') {
                if (window.UI && typeof window.UI.showMapTravelModal === 'function') {
                    window.UI.showMapTravelModal();
                    return;
                }
                const currentN = this.cardMap.getNode(player.currentNodeId || `${player.x},${player.y}`);
                const available = Object.values(this.cardMap.nodes).filter(n => n.cards.length > 0 && n.id !== (currentN ? currentN.id : ''));
                if (available.length > 0) {
                    this.executeMapTravel(available[0].id);
                }
                return;
            } else if (cardWithAction.id === 'loc_frw_3') {
                if (player.luck < 1) {
                    alert('Requiere 1 Suerte 🍀.');
                    return;
                }
                player.luck -= 1;
                const c1 = this.drawEnvironmentCard();
                const c2 = this.drawEnvironmentCard();
                if (c1) player.locationHand.push(c1);
                if (c2) player.locationHand.push(c2);
                cardWithAction.usedByPlayerIds.push(player.id);
                this.hasLocationActed = true;
                this.hasActed = true;
                SoundFX.step();
                if (window.UI) UI.logGame(`🪷 ${player.name} halló Paz Interior en Laguna de los Lotos y robó 2 cartas de localización.`);
            } else if (cardWithAction.id === 'loc_ocn_2') {
                player.coins += 2;
                const berry = ITEMS_DATABASE.find(i => i.id === 'item_cmb_7');
                if (berry) player.inventory.push(JSON.parse(JSON.stringify(berry)));
                cardWithAction.usedByPlayerIds.push(player.id);
                this.hasLocationActed = true;
                this.hasActed = true;
                SoundFX.coin();
                if (window.UI) UI.logGame(`🏴‍☠️ ${player.name} saqueó el Navío Naufragado: Encontró 2 Monedas y 1 Baya Aranja.`);
            } else if (cardWithAction.id === 'loc_ocn_3') {
                if (player.luck < 2) {
                    alert('Requiere 2 Suerte 🍀.');
                    return;
                }
                player.luck -= 2;
                cardWithAction.usedByPlayerIds.push(player.id);
                this.hasLocationActed = true;
                this.searchLegendaryMonsters();
                return;
            } else if (cardWithAction.id === 'city_flama') {
                const c1 = this.drawEnvironmentCard();
                const c2 = this.drawEnvironmentCard();
                if (c1) player.locationHand.push(c1);
                if (c2) player.locationHand.push(c2);
                player.luck += 1;
                cardWithAction.usedByPlayerIds.push(player.id);
                this.hasLocationActed = true;
                this.hasActed = true;
                SoundFX.victory();
                if (window.UI) UI.logGame(`🔥 ${player.name} rindió tributo en Altar de la Flama: Robó 2 cartas de localización y ganó +1 Suerte 🍀.`);
            } else {
                cardWithAction.usedByPlayerIds.push(player.id);
                this.hasLocationActed = true;
                this.hasActed = true;
                if (window.UI) UI.logGame(`⚡ ${player.name} activó la acción especial de **${cardWithAction.name}**.`);
            }

            if (window.UI) UI.renderAll();
        }
    }

    executeAncestralTeaching(attackIndex, monsterInstanceId) {
        const player = this.getActivePlayer();
        if (this.hasLocationActed) {
            alert('Ya has tomado la acción de localización en este turno.');
            return;
        }
        if (player.luck < 1) {
            alert('Requiere al menos 1 Punto de Suerte 🍀.');
            return;
        }

        const node = this.cardMap.getNode(player.currentNodeId || `${player.x},${player.y}`);
        const card = node && node.cards ? node.cards.find(c => c.id === 'loc_for_3') : null;
        if (card) {
            if (!card.usedByPlayerIds) card.usedByPlayerIds = [];
            if (card.usedByPlayerIds.includes(player.id)) {
                alert(`Ya has utilizado esta localización (${card.name}).`);
                return;
            }
            card.usedByPlayerIds.push(player.id);
        }

        const attacksPool = (typeof ANCESTRAL_ATTACKS !== 'undefined' ? ANCESTRAL_ATTACKS : window.ANCESTRAL_ATTACKS) || [];
        const attack = attacksPool[attackIndex] || attacksPool[0];
        if (!attack) return;

        const monster = player.monsters.find(m => m.instanceId === monsterInstanceId) || player.monsters[0];
        if (!monster) return;

        if (monster.attacks.some(a => a.name === attack.name)) {
            alert(`${monster.name} ya conoce el ataque ${attack.name}.`);
            return;
        }

        player.luck -= 1;
        if (monster.attacks.length >= 3) {
            monster.attacks[1] = JSON.parse(JSON.stringify(attack));
        } else {
            monster.attacks.push(JSON.parse(JSON.stringify(attack)));
        }

        this.hasLocationActed = true;
        this.hasActed = true;
        SoundFX.victory();
        if (window.UI) {
            UI.logGame(`📖 ¡${player.name} usó Enseñanza Ancestral! ${monster.name} aprendió **${attack.name}**.`);
            UI.renderAll();
        }
    }

    executeDruidBlessing(monsterInstanceId) {
        const player = this.getActivePlayer();
        if (this.hasLocationActed) {
            alert('Ya has tomado la acción de localización en este turno.');
            return;
        }

        const node = this.cardMap.getNode(player.currentNodeId || `${player.x},${player.y}`);
        const card = node && node.cards ? node.cards.find(c => c.id === 'loc_for_4') : null;
        if (card) {
            if (!card.usedByPlayerIds) card.usedByPlayerIds = [];
            if (card.usedByPlayerIds.includes(player.id)) {
                alert(`Ya has utilizado esta localización (${card.name}).`);
                return;
            }
            card.usedByPlayerIds.push(player.id);
        }

        const monster = player.monsters.find(m => m.instanceId === monsterInstanceId) || player.monsters[0];
        if (!monster) return;

        monster.maxHp += 1;
        monster.hp += 1;
        player.coins += 1;
        this.hasLocationActed = true;
        this.hasActed = true;
        SoundFX.victory();
        if (window.UI) {
            UI.logGame(`⛩️ ¡${player.name} recibió la Bendición del Druida! ${monster.name} gana +1 PS Máximo permanente y +1 Moneda 🪙.`);
            UI.renderAll();
        }
    }

    executeMapTravel(targetNodeId) {
        const player = this.getActivePlayer();
        if (this.hasLocationActed) {
            alert('Ya has tomado la acción de localización en este turno.');
            return false;
        }

        const targetNode = this.cardMap.getNode(targetNodeId);
        if (!targetNode || targetNode.cards.length === 0) {
            alert('Solo puedes viajar a nodos descubiertos con cartas.');
            return false;
        }

        const currentNode = this.cardMap.getNode(player.currentNodeId || `${player.x},${player.y}`);
        if (currentNode && currentNode.id === targetNode.id) {
            alert('Ya te encuentras en este nodo.');
            return false;
        }

        const card = currentNode && currentNode.cards ? currentNode.cards.find(c => c.id === 'loc_frw_2') : null;
        if (card) {
            if (!card.usedByPlayerIds) card.usedByPlayerIds = [];
            if (card.usedByPlayerIds.includes(player.id)) {
                alert(`Ya has utilizado esta localización (${card.name}).`);
                return false;
            }
            card.usedByPlayerIds.push(player.id);
        }

        player.currentNodeId = targetNode.id;
        player.x = targetNode.gridX;
        player.y = targetNode.gridY;
        this.hasMoved = true;
        this.hasLocationActed = true;
        this.hasActed = true;
        SoundFX.victory();

        if (window.UI) {
            if (typeof UI.hideMapTravelModal === 'function') UI.hideMapTravelModal();
            UI.logGame(`⛵ ${player.name} usó **Travesía en Barca** desde ${currentNode ? currentNode.name : 'su posición'} hasta **${targetNode.name}**.`);
            UI.renderAll();
        }
        return true;
    }

    // Searching specifically for Tier 4 Legendaries
    searchLegendaryMonsters() {
        const player = this.getActivePlayer();
        const legendaries = MONSTERS_DATABASE.filter(m => m.captureTier >= 4);
        const drawnCards = [...legendaries].sort(() => Math.random() - 0.5).slice(0, 3).map(m => this.instantiateMonster(m));

        this.activeSearchCards = drawnCards;
        this.hasEncounterActed = true;
        this.hasActed = true;
        SoundFX.victory();

        if (window.UI) {
            UI.showSearchModal({
                biome: { name: 'Mítico Legendario', icon: '🌀', color: '#9333ea' },
                cards: drawnCards,
                player: player
            });
        }
    }

    // Requirement 6: Can only access shop from city!
    canAccessShop() {
        const player = this.getActivePlayer();
        if (this.mobileShopDiscountActive) return true;
        const node = this.cardMap.getNode(player.currentNodeId || `${player.x},${player.y}`);
        return Boolean(node && node.cards && node.cards.some(c => c.biome === 'city' || c.hasShop));
    }

    openShop() {
        if (!this.canAccessShop()) {
            alert('⚠️ La Tienda solo está disponible cuando te encuentras en una Ciudad o en un campamento mercantil.');
            return;
        }
        if (window.UI) {
            UI.showShopModal();
        }
    }

    searchMonsters() {
        const player = this.getActivePlayer();
        if (this.hasEncounterActed) {
            alert('Ya has realizado tu búsqueda o combate en este turno.');
            return;
        }

        const currentNode = this.cardMap.getNode(player.currentNodeId || `${player.x},${player.y}`);
        if (!currentNode || !currentNode.card) {
            alert('Debes estar en una localización descubierta para buscar monstruos.');
            return;
        }

        const biome = currentNode.card.biome;
        if (biome === 'city') {
            alert('En las Ciudades no hay monstruos salvajes. ¡Dirígete al Gimnasio para combatir o accede a la Tienda!');
            return;
        }

        let drawCount = 3 + (player.temporaryModifiers.searchBonus || 0);
        if (player.inventory.some(i => i.id === 'item_utl_2')) {
            drawCount += 1;
        }
        if (player.inventory.some(i => i.id === 'item_utl_7')) {
            drawCount += 1;
        }

        const drawnCards = [];
        for (let i = 0; i < drawCount; i++) {
            drawnCards.push(this.drawMonsterCard(biome));
        }

        this.activeSearchCards = drawnCards;
        SoundFX.step();

        if (window.UI) {
            UI.showSearchModal({
                biome: BIOMES[biome],
                cards: drawnCards,
                player: player
            });
        }
    }

    redrawActiveSearch() {
        const player = this.getActivePlayer();
        if (player.luck < 1) {
            alert('¡No tienes suficientes Puntos de Suerte 🍀 para redibujar los monstruos!');
            return;
        }

        const currentNode = this.cardMap.getNode(player.currentNodeId || `${player.x},${player.y}`);
        if (!currentNode || !currentNode.card) return;
        const biome = currentNode.card.biome;

        player.luck -= 1;
        SoundFX.diceRoll();

        let drawCount = 3 + (player.temporaryModifiers.searchBonus || 0);
        if (player.inventory.some(i => i.id === 'item_utl_2')) drawCount += 1;
        if (player.inventory.some(i => i.id === 'item_utl_7')) drawCount += 1;

        const drawnCards = [];
        for (let i = 0; i < drawCount; i++) {
            drawnCards.push(this.drawMonsterCard(biome));
        }

        this.activeSearchCards = drawnCards;
        if (window.UI) {
            UI.logGame(`🍀 ${player.name} gastó 1 Suerte y redibujó las criaturas del encuentro.`);
            UI.showSearchModal({
                biome: BIOMES[biome],
                cards: drawnCards,
                player: player
            });
            UI.renderAll();
        }
    }

    captureMonster(monsterIndex) {
        const player = this.getActivePlayer();
        const monster = this.activeSearchCards[monsterIndex];
        if (!monster) return;

        let highestToolTier = 0;
        player.inventory.forEach(item => {
            if (item.category === 'capture' && item.tier) {
                if (item.tier > highestToolTier) highestToolTier = item.tier;
            }
        });

        highestToolTier += (player.temporaryModifiers.captureTierBonus || 0);

        if (highestToolTier < monster.captureTier) {
            alert(`⚠️ No puedes capturar a ${monster.name}!\nRequiere una Herramienta de Captura de Tier ${monster.captureTier}, pero tu herramienta máxima actual es Tier ${highestToolTier}.`);
            return;
        }

        SoundFX.captureSuccess();

        if (player.characterId === 'char_brock') {
            monster.maxHp += 2;
            monster.hp = monster.maxHp;
        }

        if (player.monsters.length < 4) {
            player.monsters.push(monster);
            if (window.UI) UI.logGame(`🎉 ¡${player.name} capturó a **${monster.name}** (Tier ${monster.captureTier})!`);
        } else {
            player.storageMonsters.push(monster);
            if (window.UI) UI.logGame(`🎉 ¡${player.name} capturó a **${monster.name}** (Tier ${monster.captureTier})! Tu tablero personal ya tiene 4 criaturas, enviada a tu Reserva.`);
        }

        this.hasActed = true;
        this.hasEncounterActed = true;
        this.activeSearchCards = null;

        if (window.UI) {
            if (typeof UI.hideTeachAttackModal === 'function') UI.hideTeachAttackModal();
            UI.hideSearchModal();
            UI.renderAll();
        }

        this.endTurn();
    }

    teachAttackFromWild(monsterIndex, targetMonsterInstanceId) {
        const player = this.getActivePlayer();
        const wildMon = this.activeSearchCards[monsterIndex];
        if (!wildMon) return;

        const targetMon = player.monsters.find(m => m.instanceId === targetMonsterInstanceId);
        if (!targetMon) return;

        const attackToTeach = wildMon.attacks[0];

        if (targetMon.attacks.some(a => a.name === attackToTeach.name)) {
            alert(`${targetMon.name} ya conoce el ataque ${attackToTeach.name}.`);
            return;
        }

        if (targetMon.attacks.length >= 3) {
            targetMon.attacks[1] = JSON.parse(JSON.stringify(attackToTeach));
        } else {
            targetMon.attacks.push(JSON.parse(JSON.stringify(attackToTeach)));
        }

        SoundFX.victory();
        if (window.UI) UI.logGame(`📖 ¡${targetMon.name} aprendió el ataque **${attackToTeach.name}** de ${wildMon.name}!`);

        this.hasActed = true;
        this.hasEncounterActed = true;
        this.activeSearchCards = null;

        if (window.UI) {
            if (typeof UI.hideTeachAttackModal === 'function') UI.hideTeachAttackModal();
            UI.hideSearchModal();
            UI.renderAll();
        }

        this.endTurn();
    }

    dismissSearchEncounter() {
        if (!this.activeSearchCards) return;
        const player = this.getActivePlayer();
        this.activeSearchCards = null;
        this.hasActed = true;
        this.hasEncounterActed = true;

        if (window.UI) {
            UI.hideSearchModal();
            UI.logGame(`${player.name} concluyó la búsqueda de criaturas y terminó su turno.`);
            UI.renderAll();
        }

        this.endTurn();
    }

    buyShopItem(itemIndex) {
        if (!this.canAccessShop()) {
            alert('Solo puedes comprar en la Tienda desde una Ciudad.');
            return;
        }

        const player = this.getActivePlayer();
        const item = this.shopRiver[itemIndex];
        if (!item) return;

        let cost = item.cost;
        if (this.mobileShopDiscountActive) cost = Math.max(1, cost - 1);
        if (player.characterId === 'char_blue' && item.category === 'utility') {
            cost = Math.max(1, cost - 1);
        }

        if (player.coins < cost) {
            alert(`No tienes suficientes monedas. Cuesta ${cost} monedas y tienes ${player.coins}.`);
            return;
        }

        player.coins -= cost;
        player.inventory.push(JSON.parse(JSON.stringify(item)));
        SoundFX.coin();

        if (window.UI) UI.logGame(`🛒 ${player.name} compró **${item.name}** por ${cost} monedas.`);

        this.shopRiver.splice(itemIndex, 1);
        this.replenishShopRiver();

        if (window.UI) {
            UI.renderShopModal();
            UI.renderAll();
        }
    }

    equipItemToMonster(itemIndexInInventory, monsterInstanceId) {
        const player = this.getActivePlayer();
        const item = player.inventory[itemIndexInInventory];
        const monster = player.monsters.find(m => m.instanceId === monsterInstanceId);

        if (!item || !monster) return;

        if (monster.equippedItem) {
            if (monster.equippedItem.id === 'item_cmb_9') {
                monster.maxHp = Math.max(1, monster.maxHp - 3);
                monster.hp = Math.min(monster.hp, monster.maxHp);
            }
            player.inventory.push(monster.equippedItem);
            monster.equippedItem = null;
        }

        monster.equippedItem = JSON.parse(JSON.stringify(item));
        if (item.id === 'item_cmb_9') {
            monster.maxHp += 3;
            monster.hp += 3;
        }
        player.inventory.splice(itemIndexInInventory, 1);
        SoundFX.step();

        if (window.UI) UI.logGame(`🛡️ ${player.name} equipó **${item.name}** en ${monster.name}.`);
        if (window.UI) UI.renderAll();
    }

    unequipItemFromMonster(monsterInstanceId) {
        const player = this.getActivePlayer();
        const monster = player.monsters.find(m => m.instanceId === monsterInstanceId);
        if (!monster || !monster.equippedItem) return;

        const item = monster.equippedItem;
        if (item.id === 'item_cmb_9') {
            monster.maxHp = Math.max(1, monster.maxHp - 3);
            monster.hp = Math.min(monster.hp, monster.maxHp);
        }
        monster.equippedItem = null;
        player.inventory.push(item);
        SoundFX.step();

        if (window.UI) UI.logGame(`🎒 ${player.name} desequipó **${item.name}** de ${monster.name}.`);
        if (window.UI) UI.renderAll();
    }

    moveMonsterOrder(fromIndex, toIndex) {
        const player = this.getActivePlayer();
        if (fromIndex < 0 || fromIndex >= player.monsters.length) return;
        if (toIndex < 0 || toIndex >= player.monsters.length) return;

        const temp = player.monsters[fromIndex];
        player.monsters[fromIndex] = player.monsters[toIndex];
        player.monsters[toIndex] = temp;
        SoundFX.step();

        if (window.UI) UI.logGame(`🔄 ${player.name} cambió el orden de su alineación.`);
        if (window.UI) UI.renderAll();
    }

    getAdaptiveGymForPlayer(gymOrCity, player) {
        if (!gymOrCity) throw new Error('gymOrCity is required for getAdaptiveGymForPlayer');
        if (!player) throw new Error('player is required for getAdaptiveGymForPlayer');
        const gym = gymOrCity.gym || gymOrCity;

        const defeatedCount = (player.defeatedGymIds ? player.defeatedGymIds.length : 0);
        let tier = 1;
        let monsterCount = 2;
        let rewardCoins = 3;
        let rewardLuck = 1;

        if (defeatedCount === 0) {
            tier = 1;
            monsterCount = 2;
            rewardCoins = 3;
            rewardLuck = 1;
        } else if (defeatedCount === 1) {
            tier = 2;
            monsterCount = 2;
            rewardCoins = 4;
            rewardLuck = 1;
        } else {
            tier = 3;
            monsterCount = 3;
            rewardCoins = 6;
            rewardLuck = 2;
        }

        let teamMonsterIds = [];
        if (gym.teamsByTier && gym.teamsByTier[tier]) {
            teamMonsterIds = [...gym.teamsByTier[tier]];
        } else {
            teamMonsterIds = this.getDefaultGymTeamForTier(gym, tier, monsterCount);
        }

        if (teamMonsterIds.length !== monsterCount) {
            throw new Error(`Adaptive gym tier ${tier} requires ${monsterCount} monsters, got ${teamMonsterIds.length}`);
        }

        return {
            id: gym.id,
            name: gym.name,
            cityName: gym.cityName || gym.name,
            tier: tier,
            badgeName: gym.badgeName,
            badgeIcon: gym.badgeIcon,
            leaderName: gym.leaderName,
            rewardCoins: rewardCoins,
            rewardLuck: rewardLuck,
            teamMonsterIds: teamMonsterIds,
            teamsByTier: gym.teamsByTier
        };
    }

    getDefaultGymTeamForTier(gym, tier, monsterCount) {
        const pool = (typeof MONSTERS_DATABASE !== 'undefined' ? MONSTERS_DATABASE : window.MONSTERS_DATABASE) || [];
        const matching = pool.filter(m => m.captureTier === tier && !m.isLegendary);
        if (matching.length < monsterCount) {
            throw new Error(`Not enough tier ${tier} monsters in database for gym team`);
        }
        return matching.slice(0, monsterCount).map(m => m.id);
    }

    // Challenge Gym in current City node
    challengeGym() {
        const player = this.getActivePlayer();
        if (this.hasEncounterActed) {
            alert('Ya has realizado tu combate en este turno.');
            return;
        }

        const node = this.cardMap.getNode(player.currentNodeId || `${player.x},${player.y}`);
        const gymCard = node && node.cards ? node.cards.find(c => c.gym) : null;
        if (!gymCard || !gymCard.gym) {
            alert('No hay ningún Gimnasio en esta localización.');
            return;
        }

        const gym = gymCard.gym;
        const alreadyDefeated = Boolean(player.defeatedGymIds && player.defeatedGymIds.includes(gym.id));
        if (alreadyDefeated) {
            alert(`Ya has derrotado este Gimnasio y posees la ${gym.badgeName}.`);
            return;
        }

        const adaptiveGym = this.getAdaptiveGymForPlayer(gym, player);

        this.hasActed = true;
        this.hasEncounterActed = true;
        this.combatEngine.startBattle({
            type: 'gym',
            player1: player,
            gym: adaptiveGym,
            onEnd: (won) => {
                if (window.UI) UI.renderAll();
                this.endTurn();
            }
        });
    }

    onGymDefeated(player, gymData) {
        this.totalGymsDefeated++;

        if (gymData) {
            if (!player.defeatedGymIds) player.defeatedGymIds = [];
            if (gymData.id && !player.defeatedGymIds.includes(gymData.id)) {
                player.defeatedGymIds.push(gymData.id);
            }
            if (gymData.tier && !player.badges.includes(gymData.tier)) {
                player.badges.push(gymData.tier);
                player.badges.sort((a, b) => a - b);
            }
        }

        if (!this.defeatedGymTiers) this.defeatedGymTiers = new Set();
        if (gymData && gymData.tier) {
            this.defeatedGymTiers.add(gymData.tier);
        }

        const isFirstGym = (this.defeatedGymTiers.has(1) || this.totalGymsDefeated === 1);
        const isSecondGym = (this.defeatedGymTiers.has(2) || this.totalGymsDefeated >= 2);

        if (isFirstGym && !this.expansionsUnlocked.tier2) {
            this.expansionsUnlocked.tier2 = true;
            const t2 = EXPANSION_DECKS.tier2;
            t2.monsters.forEach(m => {
                if (m && this.biomeDecks[m.biome]) {
                    this.biomeDecks[m.biome].push(m, m, m);
                    this.biomeDecks[m.biome].sort(() => Math.random() - 0.5);
                }
            });
            if (window.UI) {
                UI.logGame(`📦 ¡EXPANSIÓN DESBLOQUEADA: **${t2.name}**! Nuevas criaturas de Tier 2 añadidas.`);
                UI.showNotification(t2.name, t2.desc);
            }
        }

        if (isSecondGym && !this.expansionsUnlocked.tier3) {
            this.expansionsUnlocked.tier3 = true;
            const t3 = EXPANSION_DECKS.tier3;
            t3.monsters.forEach(m => {
                if (m && this.biomeDecks[m.biome]) {
                    this.biomeDecks[m.biome].push(m, m, m);
                    this.biomeDecks[m.biome].sort(() => Math.random() - 0.5);
                }
            });

            const t3Locations = LOCATION_CARDS_DATABASE.filter(c => (c.tier || 1) === 3);
            t3Locations.forEach(loc => {
                this.environmentDeck.push(JSON.parse(JSON.stringify(loc)), JSON.parse(JSON.stringify(loc)));
            });
            this.environmentDeck.sort(() => Math.random() - 0.5);

            if (window.UI) {
                UI.logGame(`📦 ¡EXPANSIÓN DESBLOQUEADA: **${t3.name}**! Nuevas criaturas de Tier 3 y el **Vórtice Legendario** han aparecido.`);
                UI.showNotification(t3.name, t3.desc);
            }
        }

        const isThirdGym = (this.defeatedGymTiers.has(3) || this.totalGymsDefeated >= 3);
        if (isThirdGym && !this.expansionsUnlocked.tier4) {
            this.expansionsUnlocked.tier4 = true;
            const t4 = EXPANSION_DECKS.tier4;
            if (t4) {
                t4.monsters.forEach(m => {
                    if (m && this.biomeDecks[m.biome]) {
                        this.biomeDecks[m.biome].push(m, m);
                        this.biomeDecks[m.biome].sort(() => Math.random() - 0.5);
                    }
                });
                if (window.UI) {
                    UI.logGame(`🌟 ¡EXPANSIÓN SUPREMA DESBLOQUEADA: **${t4.name}**! Las criaturas Legendarias de Tier 4 han despertado.`);
                    UI.showNotification(t4.name, t4.desc);
                }
            }
        }

        const badgeCount = player.defeatedGymIds && player.defeatedGymIds.length > player.badges.length
            ? player.defeatedGymIds.length
            : player.badges.length;

        if (badgeCount >= 3) {
            if (window.UI) {
                UI.logGame(`👑 **¡${player.name} HA OBTENIDO 3 MEDALLAS DE GIMNASIO!** ¡Se activa el Gran Torneo Final!`);
            }
            this.triggerTournament();
        }
    }

    useOverworldAbility(monsterInstanceId) {
        const player = this.getActivePlayer();
        if (this.hasActed) {
            alert('Ya has tomado tu acción en este turno.');
            return;
        }

        const monster = player.monsters.find(m => m.instanceId === monsterInstanceId);
        if (!monster || !monster.overworldAbility) return;

        const ability = monster.overworldAbility;

        if (ability.id === 'flying') {
            if (window.UI) UI.showCityTravelModal(true);
            return;
        } else if (ability.id === 'water') {
            this.movementPoints = 2;
            this.hasMoved = false;
            this.hasActed = true;
            if (window.UI) UI.logGame(`🌊 ${monster.name} activa **Nado Veloz**: Movimiento aumentado a 2.`);
            SoundFX.step();
        } else if (ability.id === 'grass') {
            player.temporaryModifiers.searchBonus = 1;
            this.hasActed = true;
            if (window.UI) UI.logGame(`🌿 ${monster.name} activa **Rastreo Silvestre**: Revelarás 1 carta adicional en búsqueda.`);
            SoundFX.step();
        } else if (ability.id === 'fire') {
            player.monsters.forEach(m => m.hp = Math.min(m.maxHp, m.hp + 3));
            player.coins += 1;
            this.hasActed = true;
            if (window.UI) UI.logGame(`🔥 ${monster.name} activa **Calor de Campamento**: Curó 3 HP a todos y generó 1 moneda.`);
            SoundFX.coin();
        } else if (ability.id === 'electric') {
            player.coins += 1;
            this.hasActed = true;
            if (window.UI) UI.logGame(`⚡ ${monster.name} activa **Sobrecarga**: Ganaste 1 moneda.`);
            SoundFX.coin();
        } else if (ability.id === 'rock') {
            player.coins += 1;
            this.hasActed = true;
            if (window.UI) UI.logGame(`🪨 ${monster.name} activa **Romperrocas**: Hallaste 1 moneda.`);
            SoundFX.coin();
        } else if (ability.id === 'ground') {
            this.movementPoints += 1;
            this.hasMoved = false;
            this.hasActed = true;
            if (window.UI) UI.logGame(`🦡 ${monster.name} activa **Excavación**: Ganaste +1 movimiento subterráneo en este turno.`);
            SoundFX.step();
        } else if (ability.id === 'bug') {
            player.temporaryModifiers.captureTierBonus = 1;
            this.hasActed = true;
            if (window.UI) UI.logGame(`🕸️ ${monster.name} activa **Red de Seda**: Tu próxima captura será de +1 Tier superior.`);
            SoundFX.step();
        }

        if (window.UI) UI.renderAll();
    }

    endTurn() {
        if (this.isGameOver) return;
        this.activePlayerIndex++;
        if (this.activePlayerIndex >= this.players.length) {
            this.activePlayerIndex = 0;
            this.currentRound++;

            if (this.currentRound > this.maxRounds) {
                this.triggerTournament();
                return;
            }
        }
        this.startTurn();
    }

    triggerTournament() {
        this.isGameOver = true;
        if (window.UI) UI.logGame(`🏆 **¡FINAL DE LA PARTIDA!** Comienza el Gran Torneo Final.`);
        SoundFX.victory();
        this.tournamentEngine.startTournament(this.players);
    }
}

window.MonsterJourneyGame = MonsterJourneyGame;
