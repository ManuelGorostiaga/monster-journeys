class MonsterJourneyGame {
    constructor() {
        this.cardMap = new CardMap();
        this.combatEngine = new CombatEngine(this);
        this.tournamentEngine = new TournamentEngine(this);

        this.players = [];
        this.activePlayerIndex = 0;
        this.currentRound = 1;
        this.maxRounds = 20;

        // Turn state
        this.hasMoved = false;
        this.hasActed = false;
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

    initGame(playerConfigs) {
        this.players = [];
        this.currentRound = 1;
        this.activePlayerIndex = 0;
        this.hasMoved = false;
        this.hasActed = false;
        this.movementPoints = 1;
        this.isGameOver = false;
        this.totalGymsDefeated = 0;
        this.defeatedGymTiers = new Set();
        this.expansionsUnlocked = { tier2: false, tier3: false };

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

        this.startTurn();
    }

    initEnvironmentDeck() {
        this.environmentDeck = [...LOCATION_CARDS_DATABASE].sort(() => Math.random() - 0.5);
        this.environmentDiscard = [];
    }

    initCitiesDeck() {
        // 4 Gym Cities in order or shuffled
        this.citiesDeck = [...CITIES_DATABASE];
    }

    drawEnvironmentCard() {
        if (this.environmentDeck.length === 0) {
            if (this.environmentDiscard.length === 0) {
                // Re-clone database if everything was placed/discarded
                this.environmentDeck = [...LOCATION_CARDS_DATABASE].sort(() => Math.random() - 0.5);
            } else {
                this.environmentDeck = [...this.environmentDiscard].sort(() => Math.random() - 0.5);
                this.environmentDiscard = [];
            }
        }
        return this.environmentDeck.pop();
    }

    refillLocationHand(player) {
        while (player.locationHand.length < 5) {
            const card = this.drawEnvironmentCard();
            if (!card) break;
            player.locationHand.push(card);
        }
    }

    // Requirement 3: Spend 1 luck to draft 3 cards instead of drawing 1
    draftLocationCard(player) {
        if (player.luck < 1) {
            alert('¡Necesitas al menos 1 Punto de Suerte 🍀 para draftear cartas de localización!');
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

        if (draftPicks.length === 0) return;

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

        player.currentNodeId = targetNode.id;
        player.x = targetNode.gridX;
        player.y = targetNode.gridY;
        this.movementPoints = Math.max(0, this.movementPoints - 1);
        if (this.movementPoints <= 0) {
            this.hasMoved = true;
        }
        SoundFX.step();

        if (player.inventory.some(i => i.id === 'item_utl_3')) {
            player.coins += 2;
            SoundFX.coin();
        }

        this.refillLocationHand(player);

        if (window.UI) {
            UI.logGame(`🗺️ ${player.name} descubrió **${card.name}** en ${targetNode.name} (${targetNode.cards.length}/${targetNode.maxCards} cartas) y avanzó hacia allí.`);
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

        player.currentNodeId = targetNode.id;
        player.x = targetNode.gridX;
        player.y = targetNode.gridY;
        this.movementPoints = Math.max(0, this.movementPoints - 1);
        if (this.movementPoints <= 0) {
            this.hasMoved = true;
        }
        SoundFX.victory();

        if (player.inventory.some(i => i.id === 'item_utl_3')) {
            player.coins += 2;
            SoundFX.coin();
        }

        const leader = (cityCard.gym && cityCard.gym.leaderName) || cityCard.leaderName || 'Líder de Gimnasio';
        if (window.UI) {
            UI.logGame(`🏛️ ¡${player.name} fundó la ciudad de **${cityCard.name}** en ${targetNode.name}! Alberga el Gimnasio de ${leader}.`);
            UI.renderAll();
        }
        return true;
    }

    // Rule 15: Fast Travel between Cities
    fastTravelToCity(targetCityNodeId) {
        const player = this.getActivePlayer();
        const currentNode = this.cardMap.getNode(player.currentNodeId || `${player.x},${player.y}`);
        if (!currentNode || !currentNode.cards.some(c => c.biome === 'city')) {
            alert('Debes estar en una Ciudad para viajar rápidamente a otra.');
            return;
        }

        const targetNode = this.cardMap.getNode(targetCityNodeId);
        if (!targetNode || !targetNode.cards.some(c => c.biome === 'city')) {
            alert('Solo puedes viajar a nodos que contengan una Ciudad.');
            return;
        }

        player.currentNodeId = targetNode.id;
        player.x = targetNode.gridX;
        player.y = targetNode.gridY;
        this.hasMoved = true;
        SoundFX.victory();

        if (window.UI) {
            UI.hideCityTravelModal();
            UI.logGame(`✈️ ${player.name} usó el viaje rápido hacia **${targetNode.name}**.`);
            UI.renderAll();
        }
        return true;
    }

    // Requirement 4: Execute Location Action (resource trade or special action)
    executeLocationAction() {
        const player = this.getActivePlayer();
        if (this.hasActed) {
            alert('Ya has tomado tu acción en este turno.');
            return;
        }

        const node = this.cardMap.getNode(player.currentNodeId || `${player.x},${player.y}`);
        const cardWithAction = node && node.cards ? node.cards.find(c => c.locationAction) : null;
        if (!cardWithAction) {
            alert('Esta localización no posee una acción especial disponible.');
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
            this.hasActed = true;
            SoundFX.coin();

            if (window.UI) {
                UI.logGame(`🔄 ${player.name} realizó la acción de **${cardWithAction.name}**: ${action.desc}`);
                UI.renderAll();
            }
            return;
        }

        if (action.type === 'special') {
            if (cardWithAction.id === 'loc_start_town' || cardWithAction.isStart) {
                player.monsters.forEach(m => m.hp = m.maxHp);
                player.luck += 1;
                this.hasActed = true;
                SoundFX.victory();
                if (window.UI) UI.logGame(`🏡 ${player.name} descansó en Casa: Curó a su equipo y obtuvo +1 Suerte 🍀.`);
            } else if (cardWithAction.id === 'loc_for_2') {
                if (player.luck < 1) {
                    alert('Requiere 1 Suerte 🍀.');
                    return;
                }
                player.luck -= 1;
                player.temporaryModifiers.captureTierBonus = 1;
                this.searchMonsters();
                return;
            } else if (cardWithAction.id === 'loc_mtn_2') {
                if (player.coins < 2) {
                    alert('Requiere 2 Monedas 🪙.');
                    return;
                }
                player.coins -= 2;
                const activeMon = player.monsters[0];
                if (activeMon) {
                    activeMon.maxHp += 1;
                    activeMon.hp += 1;
                    SoundFX.victory();
                    if (window.UI) UI.logGame(`🪨 ${player.name} entrenó a ${activeMon.name}: +1 PS Máximo permanente.`);
                }
                this.hasActed = true;
            } else if (cardWithAction.id === 'loc_pln_2') {
                this.mobileShopDiscountActive = true;
                if (window.UI) {
                    UI.showShopModal();
                    UI.logGame(`⛺ ${player.name} visitó la Tienda Ambulante con descuento de 1 moneda!`);
                }
                this.hasActed = true;
                return;
            } else if (cardWithAction.id === 'loc_pln_3') {
                if (player.coins < 1) {
                    alert('Requiere 1 Moneda 🪙.');
                    return;
                }
                player.coins -= 1;
                const pool = [...ITEMS_DATABASE].sort(() => Math.random() - 0.5);
                player.inventory.push(JSON.parse(JSON.stringify(pool[0])));
                player.inventory.push(JSON.parse(JSON.stringify(pool[1])));
                SoundFX.coin();
                this.hasActed = true;
                if (window.UI) UI.logGame(`🌿 ${player.name} realizó Alquimia Silvestre y obtuvo 2 cartas de Objeto.`);
            } else if (cardWithAction.id === 'loc_ocn_3') {
                if (player.luck < 2) {
                    alert('Requiere 2 Suerte 🍀.');
                    return;
                }
                player.luck -= 2;
                this.searchLegendaryMonsters();
                return;
            } else {
                this.hasActed = true;
                if (window.UI) UI.logGame(`⚡ ${player.name} activó la acción especial de **${cardWithAction.name}**.`);
            }

            if (window.UI) UI.renderAll();
        }
    }

    // Searching specifically for Tier 3 Legendaries
    searchLegendaryMonsters() {
        const player = this.getActivePlayer();
        const legendaries = MONSTERS_DATABASE.filter(m => m.captureTier >= 3);
        const drawnCards = [...legendaries].sort(() => Math.random() - 0.5).slice(0, 3).map(m => this.instantiateMonster(m));

        this.activeSearchCards = drawnCards;
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
        if (this.hasActed) {
            alert('Ya has tomado tu acción en este turno.');
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
        this.activeSearchCards = null;

        if (window.UI) {
            UI.hideSearchModal();
            UI.renderAll();
        }
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
        this.activeSearchCards = null;

        if (window.UI) {
            UI.hideSearchModal();
            UI.renderAll();
        }
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

    // Challenge Gym in current City node
    challengeGym() {
        const player = this.getActivePlayer();
        if (this.hasActed) {
            alert('Ya has tomado tu acción en este turno.');
            return;
        }

        const node = this.cardMap.getNode(player.currentNodeId || `${player.x},${player.y}`);
        const gymCard = node && node.cards ? node.cards.find(c => c.gym) : null;
        if (!gymCard || !gymCard.gym) {
            alert('No hay ningún Gimnasio en esta localización.');
            return;
        }

        const gym = gymCard.gym;
        const alreadyDefeated = (player.defeatedGymIds && player.defeatedGymIds.includes(gym.id)) ||
                                (player.badges.includes(gym.tier) && gym.tier < 3);
        if (alreadyDefeated) {
            alert(`Ya has derrotado este Gimnasio y posees la ${gym.badgeName}.`);
            return;
        }

        this.hasActed = true;
        this.combatEngine.startBattle({
            type: 'gym',
            player1: player,
            gym: gym,
            onEnd: (won) => {
                if (window.UI) UI.renderAll();
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
            if (window.UI) {
                UI.logGame(`📦 ¡EXPANSIÓN DESBLOQUEADA: **${t3.name}**! Nuevas criaturas de Tier 3 añadidas.`);
                UI.showNotification(t3.name, t3.desc);
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
            player.coins += 2;
            this.hasActed = true;
            if (window.UI) UI.logGame(`🔥 ${monster.name} activa **Calor de Campamento**: Curó 3 HP a todos y generó 2 monedas.`);
            SoundFX.coin();
        } else if (ability.id === 'electric') {
            player.coins += 3;
            this.hasActed = true;
            if (window.UI) UI.logGame(`⚡ ${monster.name} activa **Sobrecarga**: Ganaste 3 monedas.`);
            SoundFX.coin();
        } else if (ability.id === 'rock') {
            player.coins += 2;
            this.hasActed = true;
            if (window.UI) UI.logGame(`🪨 ${monster.name} activa **Romperrocas**: Hallaste 2 monedas.`);
            SoundFX.coin();
        } else if (ability.id === 'bug') {
            player.temporaryModifiers.captureTierBonus = 1;
            this.hasActed = true;
            if (window.UI) UI.logGame(`🕸️ ${monster.name} activa **Red de Seda**: Tu próxima captura será de +1 Tier superior.`);
            SoundFX.step();
        }

        if (window.UI) UI.renderAll();
    }

    endTurn() {
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
