const UI = {
    game: null,
    selectedPlayerTab: 0,
    activeSearchData: null,
    pendingPlacementCoords: null,

    // Codex state
    codexActiveTab: 'monsters',
    codexFilter: 'all',
    codexSearchQuery: '',

    init(game) {
        this.game = game;
        this.bindEvents();
        setTimeout(() => this.centerMapOnPlayer(false), 200);
    },

    centerMapOnPlayer(smooth = true) {
        const viewport = document.getElementById('card-board-viewport');
        if (!viewport || !this.game) return;
        const activePlayer = this.game.getActivePlayer();
        if (!activePlayer) return;
        const playerNode = this.game.cardMap?.getNode(activePlayer.currentNodeId || `${activePlayer.x},${activePlayer.y}`);
        if (playerNode && typeof playerNode.mapX === 'number' && typeof playerNode.mapY === 'number') {
            const targetX = Math.max(0, playerNode.mapX - (viewport.clientWidth / 2));
            const targetY = Math.max(0, playerNode.mapY - (viewport.clientHeight / 2));
            viewport.scrollTo({
                left: targetX,
                top: targetY,
                behavior: smooth ? 'smooth' : 'auto'
            });
        }
    },

    switchMobileView(view) {
        document.querySelectorAll('.mobile-nav-btn').forEach(btn => btn.classList.remove('active'));
        if (view === 'map') {
            document.getElementById('mob-nav-map')?.classList.add('active');
            const el = document.getElementById('map-view-card');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setTimeout(() => this.centerMapOnPlayer(true), 350);
        } else if (view === 'team') {
            document.getElementById('mob-nav-team')?.classList.add('active');
            const el = document.getElementById('player-dashboard-card');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (view === 'log') {
            document.getElementById('mob-nav-log')?.classList.add('active');
            const el = document.getElementById('game-log-panel');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    },

    bindEvents() {
        document.getElementById('btn-rules')?.addEventListener('click', () => {
            this.showRulesModal();
        });

        document.getElementById('btn-sound-toggle')?.addEventListener('click', () => {
            const enabled = SoundFX.toggle();
            const btn = document.getElementById('btn-sound-toggle');
            const icon = btn?.querySelector('.btn-icon');
            const text = btn?.querySelector('.btn-text');
            if (icon) icon.textContent = enabled ? '🔊' : '🔇';
            if (text) text.textContent = enabled ? ' Sonido' : ' Silencio';
            if (!icon && btn) btn.textContent = enabled ? '🔊 Sonido' : '🔇 Silencio';
        });

        document.getElementById('btn-header-codex')?.addEventListener('click', () => {
            this.showCodexModal();
        });

        document.getElementById('btn-header-reset')?.addEventListener('click', () => {
            this.promptResetGame();
        });

        // Debug testing buttons
        document.getElementById('btn-dbg-coins')?.addEventListener('click', () => {
            const p = this.game.getActivePlayer();
            p.coins += 10;
            SoundFX.coin();
            this.renderAll();
            this.logGame(`🛠️ [DEBUG] +10 monedas para ${p.name}.`);
        });

        document.getElementById('btn-dbg-luck')?.addEventListener('click', () => {
            const p = this.game.getActivePlayer();
            p.luck = (p.luck || 0) + 5;
            SoundFX.coin();
            this.renderAll();
            this.logGame(`🛠️ [DEBUG] +5 Suerte 🍀 para ${p.name}.`);
        });

        document.getElementById('btn-dbg-badges')?.addEventListener('click', () => {
            const p = this.game.getActivePlayer();
            p.badges = [1, 2, 3];
            this.renderAll();
            this.logGame(`🛠️ [DEBUG] 3 Medallas desbloqueadas para ${p.name} (Clasificado a Gran Torneo!).`);
        });

        document.getElementById('btn-dbg-heal')?.addEventListener('click', () => {
            const p = this.game.getActivePlayer();
            p.monsters.forEach(m => m.hp = m.maxHp);
            this.renderAll();
            this.logGame(`🛠️ [DEBUG] Monstruos de ${p.name} curados al 100%.`);
        });

        document.getElementById('btn-dbg-expansion')?.addEventListener('click', () => {
            this.game.totalGymsDefeated++;
            this.game.onGymDefeated(this.game.getActivePlayer(), { tier: this.game.totalGymsDefeated, badgeName: 'Debug Badge', rewardCoins: 10, rewardLuck: 1 });
            this.renderAll();
        });

        document.getElementById('btn-dbg-tournament')?.addEventListener('click', () => {
            if (confirm('¿Comenzar de inmediato el Gran Torneo Final?')) {
                this.game.triggerTournament();
            }
        });

        // Action bar buttons
        document.getElementById('btn-act-search')?.addEventListener('click', () => {
            this.game.searchMonsters();
        });

        document.getElementById('btn-act-gym')?.addEventListener('click', () => {
            this.game.challengeGym();
        });

        document.getElementById('btn-act-shop')?.addEventListener('click', () => {
            this.game.openShop();
        });

        document.getElementById('btn-act-loc-action')?.addEventListener('click', () => {
            this.showLocationActionModal();
        });

        document.getElementById('btn-act-travel')?.addEventListener('click', () => {
            this.showCityTravelModal(false);
        });

        document.getElementById('btn-act-endturn')?.addEventListener('click', () => {
            this.game.endTurn();
            setTimeout(() => this.centerMapOnPlayer(true), 250);
        });
    },

    promptResetGame() {
        if (confirm('¿Deseas reiniciar la partida? Podrás seleccionar el número de jugadores y configurar nuevamente la aventura.')) {
            document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('open'));
            const setupModal = document.getElementById('modal-setup');
            if (setupModal) {
                setupModal.classList.add('open');
            } else {
                location.reload();
            }
        }
    },

    renderAll() {
        if (!this.game) return;
        this.renderHeader();
        this.renderCardMap();
        this.renderActionBar();
        this.renderPlayerBoard();
    },

    renderHeader() {
        const roundEl = document.getElementById('display-round');
        if (roundEl) roundEl.textContent = `${this.game.currentRound} / ${this.game.maxRounds}`;

        const activePlayer = this.game.getActivePlayer();
        const activeNameEl = document.getElementById('display-active-player');
        if (activeNameEl) {
            activeNameEl.textContent = activePlayer.name;
            activeNameEl.style.color = activePlayer.color;
        }

        const moveStatusEl = document.getElementById('status-movement');
        if (moveStatusEl) {
            if (this.game.hasMoved || this.game.movementPoints <= 0) {
                moveStatusEl.textContent = 'Movimiento: Agotado';
                moveStatusEl.className = 'status-pill tag-disabled';
            } else {
                const pts = this.game.movementPoints;
                moveStatusEl.textContent = `Movimiento: ${pts} paso${pts > 1 ? 's' : ''} disponible${pts > 1 ? 's' : ''}`;
                moveStatusEl.className = 'status-pill tag-success';
            }
        }

        const actStatusEl = document.getElementById('status-action');
        if (actStatusEl) {
            if (this.game.hasEncounterActed) {
                actStatusEl.textContent = 'Acción: Agotada';
                actStatusEl.className = 'status-pill tag-disabled';
            } else if (this.game.hasLocationActed) {
                actStatusEl.textContent = 'Búsqueda / Combate: Disponible';
                actStatusEl.className = 'status-pill tag-primary';
            } else {
                actStatusEl.textContent = 'Acciones: Disponibles';
                actStatusEl.className = 'status-pill tag-primary';
            }
        }
    },

    getOrthogonalRoutePath(n1, n2) {
        const x1 = n1.mapX;
        const y1 = n1.mapY;
        const x2 = n2.mapX;
        const y2 = n2.mapY;

        if (x1 === x2 || y1 === y2) {
            return `M ${x1} ${y1} L ${x2} ${y2}`;
        }

        const pair = [n1.id, n2.id].sort().join('--');

        if (pair === 'node_nw_bay--node_w_cross') {
            const bay = n1.id === 'node_nw_bay' ? n1 : n2;
            const cross = n1.id === 'node_w_cross' ? n1 : n2;
            return `M ${bay.mapX} ${bay.mapY} L ${cross.mapX} ${bay.mapY} L ${cross.mapX} ${cross.mapY}`;
        }

        if (pair === 'node_sw--node_w_cross') {
            const sw = n1.id === 'node_sw' ? n1 : n2;
            const cross = n1.id === 'node_w_cross' ? n1 : n2;
            const midX = Math.round((sw.mapX + cross.mapX) / 2);
            return `M ${sw.mapX} ${sw.mapY} L ${midX} ${sw.mapY} L ${midX} ${cross.mapY} L ${cross.mapX} ${cross.mapY}`;
        }

        if (pair === 'node_center_hub--node_ne_plateau') {
            const hub = n1.id === 'node_center_hub' ? n1 : n2;
            const plat = n1.id === 'node_ne_plateau' ? n1 : n2;
            return `M ${hub.mapX} ${hub.mapY} L ${hub.mapX} ${plat.mapY} L ${plat.mapX} ${plat.mapY}`;
        }

        if (pair === 'node_center_hub--node_se_cross') {
            const hub = n1.id === 'node_center_hub' ? n1 : n2;
            const cross = n1.id === 'node_se_cross' ? n1 : n2;
            return `M ${hub.mapX} ${hub.mapY} L ${cross.mapX} ${hub.mapY} L ${cross.mapX} ${cross.mapY}`;
        }

        if (pair === 'node_e_coast--node_se_cross') {
            const coast = n1.id === 'node_e_coast' ? n1 : n2;
            const cross = n1.id === 'node_se_cross' ? n1 : n2;
            const midX = Math.round((cross.mapX + coast.mapX) / 2);
            return `M ${cross.mapX} ${cross.mapY} L ${midX} ${cross.mapY} L ${midX} ${coast.mapY} L ${coast.mapX} ${coast.mapY}`;
        }

        const midX = Math.round((x1 + x2) / 2);
        return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
    },

    // Requirement 1 & 6: Pokemon-Style Region Route Map Renderer
    renderCardMap() {
        const grid = document.getElementById('card-board-grid');
        if (!grid) return;

        const activePlayer = this.game.getActivePlayer();
        const playerNode = this.game.cardMap.getNode(activePlayer.currentNodeId || `${activePlayer.x},${activePlayer.y}`);
        const allNodes = this.game.cardMap.getAllNodes();

        const remainingSteps = (this.game.hasMoved || this.game.movementPoints <= 0) ? 0 : this.game.movementPoints;
        const { reachableDiscovered, reachableUndiscovered } = playerNode
            ? this.game.cardMap.getReachableNodes(playerNode.id, remainingSteps)
            : { reachableDiscovered: new Map(), reachableUndiscovered: new Map() };

        grid.style.width = '1380px';
        grid.style.height = '960px';
        grid.style.position = 'relative';

        // 1. Draw connecting route lines (SVG layer)
        const renderedEdges = new Set();
        let svgLines = '';

        allNodes.forEach(node => {
            const connectedNodes = this.game.cardMap.getConnectedNodes(node);
            connectedNodes.forEach(conn => {
                const edgeKey = [node.id, conn.id].sort().join('--');
                if (renderedEdges.has(edgeKey)) return;
                renderedEdges.add(edgeKey);

                const isDiscovered = (node.cards.length > 0 && conn.cards.length > 0);
                const isPlayerRoute = playerNode && (
                    (playerNode.id === node.id && (conn.cards.length > 0 || reachableUndiscovered.has(conn.id))) ||
                    (playerNode.id === conn.id && (node.cards.length > 0 || reachableUndiscovered.has(node.id))) ||
                    (reachableDiscovered.has(node.id) && reachableDiscovered.has(conn.id))
                );

                const pathD = this.getOrthogonalRoutePath(node, conn);

                svgLines += `
                    <path d="${pathD}" class="route-casing" />
                    <path d="${pathD}" class="route-inner ${isDiscovered ? 'route-discovered' : 'route-undiscovered'} ${isPlayerRoute ? 'route-adjacent-player' : ''}" />
                `;
            });
        });

        const svgHtml = `
            <svg class="pokemon-map-routes" width="1380" height="960" viewBox="0 0 1380 960">
                ${svgLines}
            </svg>
        `;

        // 2. Render Pokemon Map Nodes
        let nodesHtml = '';
        allNodes.forEach(node => {
            const isPlayerHere = playerNode && (playerNode.id === node.id);
            const isDirectConnected = playerNode ? playerNode.connections.includes(node.id) : false;
            const isDiscoveredReachable = reachableDiscovered.has(node.id) && !this.game.hasMoved;
            const isDiscoverableReachable = (reachableUndiscovered.has(node.id) || isDirectConnected) && !this.game.hasMoved && remainingSteps > 0;
            const isAdjacentReachable = isDiscoveredReachable || isDiscoverableReachable;

            const playersOnNode = this.game.players.filter(p => {
                const pNode = this.game.cardMap.getNode(p.currentNodeId || `${p.x},${p.y}`);
                return pNode && pNode.id === node.id;
            });

            const hasCards = node.cards.length > 0;

            let nodeClass = 'pokemon-map-node';
            if (isPlayerHere) nodeClass += ' current-player-node';
            if (isAdjacentReachable) nodeClass += ' adjacent-target-node';
            if (node.maxCards === 2) nodeClass += ' hub-node';

            if (hasCards) {
                nodesHtml += `
                    <div class="${nodeClass}" style="left: ${node.mapX}px; top: ${node.mapY}px;"
                         onclick="UI.onBoardNodeClicked('${node.id}')">
                        
                        <div class="node-badge-header">
                            <span class="node-name-text">${node.name}</span>
                            ${node.maxCards === 2 ? `<span class="node-hub-pill">${node.cards.length}/2 🗂️</span>` : ''}
                            ${node.corner ? `<span class="node-corner-pill">🏡 ${node.corner}</span>` : ''}
                        </div>

                        <div class="node-cards-row">
                            ${node.cards.map((card) => {
                                const biome = BIOMES[card.biome] || BIOMES.city;
                                const usedDots = (card.usedByPlayerIds && card.usedByPlayerIds.length > 0) ? `
                                    <div class="card-used-dots">
                                        ${card.usedByPlayerIds.map(pid => {
                                            const pl = this.game.players.find(p => p.id === pid);
                                            const color = pl ? pl.color : '#e53935';
                                            const name = pl ? pl.name : pid;
                                            return `<span class="location-used-dot" style="background-color: ${color};" title="Utilizada por ${name}"></span>`;
                                        }).join('')}
                                    </div>
                                ` : '';
                                return `
                                    <div class="node-mini-card" style="border-top: 3px solid ${biome.color};"
                                         onclick="event.stopPropagation(); UI.onMiniCardClicked('${node.id}', '${card.id}')">
                                        <div class="mini-card-icon">${card.icon || biome.icon}</div>
                                        <div class="mini-card-title">${card.name}</div>
                                        ${card.gym ? `<div class="mini-card-gym" title="Gimnasio Adaptativo">🏛️ ${this.game.getAdaptiveGymForPlayer ? `T${this.game.getAdaptiveGymForPlayer(card.gym, activePlayer).tier}` : `T${card.gym.tier}`}</div>` : ''}
                                        ${card.locationAction ? `<div class="mini-card-action">🔄</div>` : ''}
                                        ${usedDots}
                                    </div>
                                `;
                            }).join('')}
                            ${(node.cards.length < node.maxCards && (isAdjacentReachable || isPlayerHere)) ? `
                                <div class="node-mini-card node-mini-card-add" title="Colocar 2ª carta en este Hub"
                                     onclick="event.stopPropagation(); UI.showPlaceCardModal('${node.id}')">
                                    <span class="empty-slot-plus">➕</span>
                                    <span class="empty-slot-text">2ª Carta</span>
                                </div>
                            ` : ''}
                        </div>

                        ${playersOnNode.length > 0 ? `
                            <div class="board-players-container">
                                ${playersOnNode.map(p => `
                                    <div class="player-meeple" style="background: ${p.color};" title="${p.name}">
                                        P${p.num}
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                `;
            } else {
                if (isAdjacentReachable) {
                    nodesHtml += `
                        <div class="${nodeClass} board-empty-slot discoverable-slot" 
                             style="left: ${node.mapX}px; top: ${node.mapY}px;"
                             onclick="UI.showPlaceCardModal('${node.id}')">
                            <div class="node-badge-header">
                                <span class="node-name-text">${node.name}</span>
                                ${node.maxCards === 2 ? `<span class="node-hub-pill">Hub 2🗂️</span>` : ''}
                            </div>
                            <div class="empty-slot-body">
                                <span class="empty-slot-plus">➕</span>
                                <span class="empty-slot-text">Descubrir</span>
                            </div>
                        </div>
                    `;
                } else {
                    nodesHtml += `
                        <div class="${nodeClass} board-empty-slot undiscovered-slot" 
                             style="left: ${node.mapX}px; top: ${node.mapY}px;"
                             onclick="UI.onBoardNodeClicked('${node.id}')"
                             title="Ruta a ${node.name}">
                            <div class="node-badge-header">
                                <span class="node-name-text">${node.name}</span>
                                ${node.maxCards === 2 ? `<span class="node-hub-pill">Hub 2🗂️</span>` : ''}
                            </div>
                            <div class="empty-slot-body">
                                <span class="empty-slot-plus">？</span>
                                <span class="empty-slot-text">No explorado</span>
                            </div>
                        </div>
                    `;
                }
            }
        });

        grid.innerHTML = svgHtml + nodesHtml;
    },

    onMiniCardClicked(nodeId, cardId) {
        const activePlayer = this.game.getActivePlayer();
        const playerNode = this.game.cardMap.getNode(activePlayer.currentNodeId || `${activePlayer.x},${activePlayer.y}`);

        if (playerNode && playerNode.id === nodeId) {
            const node = this.game.cardMap.getNode(nodeId);
            const card = node ? node.cards.find(c => c.id === cardId) : null;
            if (!card) return;

            if (card.locationAction && card.gym) {
                this.showLocationActionModal();
            } else if (card.locationAction) {
                this.confirmExecuteLocationAction(card.id);
            } else if (card.gym) {
                this.game.challengeGym();
            } else {
                this.onBoardNodeClicked(nodeId);
            }
        } else {
            this.onBoardNodeClicked(nodeId);
        }
    },

    onBoardNodeClicked(nodeIdOrX, maybeY) {
        const targetNode = this.game.cardMap.getNode(nodeIdOrX, maybeY);
        if (!targetNode) return;

        const activePlayer = this.game.getActivePlayer();
        const playerNode = this.game.cardMap.getNode(activePlayer.currentNodeId || `${activePlayer.x},${activePlayer.y}`);

        const remainingSteps = (this.game.hasMoved || this.game.movementPoints <= 0) ? 0 : this.game.movementPoints;
        const { reachableDiscovered, reachableUndiscovered } = playerNode
            ? this.game.cardMap.getReachableNodes(playerNode.id, remainingSteps)
            : { reachableDiscovered: new Map(), reachableUndiscovered: new Map() };

        if (!this.game.hasMoved && remainingSteps > 0) {
            const isDirectConnected = playerNode ? playerNode.connections.includes(targetNode.id) : false;

            if (targetNode.cards.length > 0 && (reachableDiscovered.has(targetNode.id) || isDirectConnected)) {
                this.game.movePlayerToNode(targetNode.id);
                setTimeout(() => this.centerMapOnPlayer(true), 250);
                return;
            }

            if (targetNode.cards.length === 0) {
                if (isDirectConnected) {
                    this.showPlaceCardModal(targetNode.id);
                    return;
                } else if (reachableUndiscovered.has(targetNode.id)) {
                    const reachInfo = reachableUndiscovered.get(targetNode.id);
                    if (reachInfo && reachInfo.path.length >= 2) {
                        const intermediateNodeId = reachInfo.path[1];
                        this.game.movePlayerToNode(intermediateNodeId);
                        setTimeout(() => this.centerMapOnPlayer(true), 250);
                        setTimeout(() => {
                            this.showPlaceCardModal(targetNode.id);
                        }, 250);
                        return;
                    }
                }
            }
        }

        if (targetNode.cards.length === 0) {
            this.showNotification(targetNode.name, `Zona aún no descubierta.<br>Conexiones: ${targetNode.connections.map(c => this.game.cardMap.getNode(c)?.name || c).join(', ')}`);
            return;
        }

        const isPlayerCurrentlyHere = playerNode && playerNode.id === targetNode.id;
        const hasActions = targetNode.cards.some(c => Boolean(c.locationAction));
        if (isPlayerCurrentlyHere && hasActions) {
            this.showLocationActionModal();
            return;
        }

        let msg = `📍 **${targetNode.name}** (${targetNode.cards.length}/${targetNode.maxCards} cartas)\n\n`;
        targetNode.cards.forEach((card, idx) => {
            const biome = BIOMES[card.biome] || BIOMES.city;
            msg += `**[Carta ${idx + 1}] ${card.name}** (${biome.name})\n`;
            if (card.flavor) msg += `*${card.flavor}*\n`;
            if (card.locationAction) msg += `🔄 **Acción:** ${card.locationAction.name} - ${card.locationAction.desc}\n`;
            if (card.gym) {
                const adaptiveGym = this.game.getAdaptiveGymForPlayer ? this.game.getAdaptiveGymForPlayer(card.gym, activePlayer) : card.gym;
                const isDefeated = Boolean(activePlayer.defeatedGymIds && activePlayer.defeatedGymIds.includes(card.gym.id));
                msg += `🏛️ **Gimnasio:** Líder ${card.gym.leaderName} (Tier Adaptativo: ${adaptiveGym.tier} - ${adaptiveGym.teamMonsterIds.length} criaturas${isDefeated ? ' | Superado ✅' : ''})\n`;
            }
            msg += `\n`;
        });

        this.showNotification(targetNode.name, msg.replace(/\n/g, '<br>'));
    },

    showPlaceCardModal(nodeIdOrX, maybeY) {
        const targetNode = this.game.cardMap.getNode(nodeIdOrX, maybeY);
        if (!targetNode) return;

        this.pendingPlacementNodeId = targetNode.id;
        this.pendingPlacementCoords = { x: targetNode.gridX, y: targetNode.gridY };
        const modal = document.getElementById('modal-place-card');
        if (!modal) return;

        const player = this.game.getActivePlayer();
        const connCount = targetNode.connections ? targetNode.connections.length : 0;
        const luckReward = this.game.getPlacementLuckReward ? this.game.getPlacementLuckReward(targetNode) : (connCount === 1 ? 3 : (connCount <= 3 ? 2 : 1));

        const modalDesc = modal.querySelector('.modal-body p');
        if (modalDesc) {
            modalDesc.innerHTML = `Descubrirás el nodo <strong>${targetNode.name}</strong> (${connCount} conexi${connCount === 1 ? 'ón' : 'ones'}). ¡Recibirás una bonificación inmediata de <strong>+${luckReward} Suerte 🍀</strong> al colocar una carta!`;
        }

        const container = document.getElementById('place-card-options');
        if (container) {
            let html = '';

            // Option 1: Top of Cities Deck (Always available to plant)
            if (this.game.citiesDeck.length > 0) {
                const nextCity = this.game.citiesDeck[0];
                html += `
                    <div class="location-hand-card cities-deck-card" style="cursor: pointer;" onclick="UI.confirmPlaceCity('${targetNode.id}')">
                        <div class="location-card-banner" style="background: #1e293b; color: #fbbf24; border-bottom: 1px solid #fbbf24;">
                            <span>🏛️ Mazo de Ciudades</span>
                            <span>Adaptativo</span>
                        </div>
                        <div class="location-card-art">🏛️</div>
                        <div class="location-card-title">${nextCity.name}</div>
                        <div class="location-card-action-box">
                            <strong>Gimnasio de ${nextCity.gym.leaderName}</strong>
                            Fundar esta metrópoli en ${targetNode.name} otorga acceso exclusivo a la Tienda y al Gimnasio (+${luckReward} 🍀).
                        </div>
                        <div class="location-card-bottom">
                            <button class="btn-place-loc" style="background: linear-gradient(180deg, #f59e0b, #d97706); border-color: #fbbf24;">
                                🏛️ Fundar (+${luckReward} 🍀)
                            </button>
                        </div>
                    </div>
                `;
            }

            // Option 2: Cards from Location Hand
            player.locationHand.forEach((card, idx) => {
                const biome = BIOMES[card.biome] || BIOMES.forest;
                const usedDots = (card.usedByPlayerIds && card.usedByPlayerIds.length > 0) ? `
                    <div class="card-used-dots" style="position: static; justify-content: center; margin: 4px 0; transform: none;">
                        ${card.usedByPlayerIds.map(pid => {
                            const pl = this.game.players.find(p => p.id === pid);
                            const color = pl ? pl.color : '#e53935';
                            const name = pl ? pl.name : pid;
                            return `<span class="location-used-dot" style="background-color: ${color};" title="Utilizada por ${name}"></span>`;
                        }).join('')}
                    </div>
                ` : '';
                html += `
                    <div class="location-hand-card" style="border-color: ${biome.color}; cursor: pointer;" onclick="UI.confirmPlaceLocationHand(${idx}, '${targetNode.id}')">
                        <div class="location-card-banner" style="background: ${biome.color};">
                            <span>${biome.icon} ${biome.name}</span>
                            ${card.tier && card.tier > 1 ? `<span style="background: #9333ea; color: #fff; padding: 1px 6px; border-radius: 4px; font-weight: bold; font-size: 0.65rem;">Tier ${card.tier}</span>` : `<span>#${idx + 1}</span>`}
                        </div>
                        <div class="location-card-art">${card.icon || biome.icon}</div>
                        <div class="location-card-title">${card.name}</div>
                        <div class="location-card-action-box">
                            <strong>${card.locationAction ? card.locationAction.name : 'Exploración'}</strong>
                            ${card.locationAction ? card.locationAction.desc : card.flavor}
                            ${usedDots}
                        </div>
                        <div class="location-card-bottom">
                            <button class="btn-place-loc">🗺️ Colocar (+${luckReward} 🍀)</button>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;
        }

        modal.classList.add('open');
    },

    confirmPlaceLocationHand(cardIndex, targetNodeId) {
        document.getElementById('modal-place-card')?.classList.remove('open');
        this.game.placeLocationCardAndMove(cardIndex, targetNodeId);
        setTimeout(() => this.centerMapOnPlayer(true), 250);
    },

    confirmPlaceCity(targetNodeId) {
        document.getElementById('modal-place-card')?.classList.remove('open');
        this.game.placeCityCardAndMove(targetNodeId);
        setTimeout(() => this.centerMapOnPlayer(true), 250);
    },

    showLocationActionModal() {
        const activePlayer = this.game.getActivePlayer();
        const node = this.game.cardMap.getNode(activePlayer.currentNodeId || `${activePlayer.x},${activePlayer.y}`);
        if (!node) return;

        const cardsWithAction = node.cards.filter(c => Boolean(c.locationAction));
        if (cardsWithAction.length === 0) {
            alert('Esta localización no posee una acción disponible.');
            return;
        }

        const modal = document.getElementById('modal-location-action');
        if (!modal) return;

        const titleEl = document.getElementById('loc-action-title');
        if (titleEl) {
            titleEl.textContent = `Acciones en ${node.name} (${cardsWithAction.length} carta${cardsWithAction.length > 1 ? 's' : ''})`;
        }

        const bodyEl = document.getElementById('loc-action-body');
        if (bodyEl) {
            bodyEl.innerHTML = cardsWithAction.map((card) => {
                const biome = BIOMES[card.biome] || BIOMES.city;
                let costGainHtml = '';
                if (card.locationAction.type === 'trade') {
                    const costs = [];
                    const gains = [];
                    if (card.locationAction.costCoins) costs.push(`${card.locationAction.costCoins} 🪙`);
                    if (card.locationAction.costLuck) costs.push(`${card.locationAction.costLuck} 🍀`);
                    if (card.locationAction.gainCoins) gains.push(`+${card.locationAction.gainCoins} 🪙`);
                    if (card.locationAction.gainLuck) gains.push(`+${card.locationAction.gainLuck} 🍀`);
                    costGainHtml = `<div style="margin: 6px 0; font-size: 0.85rem; font-weight: bold; color: #fbbf24;">
                        ${costs.length > 0 ? `Paga: ${costs.join(', ')} → ` : ''}Recibe: ${gains.join(', ')}
                    </div>`;
                }
                const usedByMe = Boolean(card.usedByPlayerIds && card.usedByPlayerIds.includes(activePlayer.id));
                const usedDots = (card.usedByPlayerIds && card.usedByPlayerIds.length > 0) ? `
                    <div class="card-used-dots" style="position: static; justify-content: center; margin: 6px 0; transform: none;">
                        ${card.usedByPlayerIds.map(pid => {
                            const pl = this.game.players.find(p => p.id === pid);
                            const color = pl ? pl.color : '#e53935';
                            const name = pl ? pl.name : pid;
                            return `<span class="location-used-dot" style="background-color: ${color};" title="Utilizada por ${name}"></span>`;
                        }).join('')}
                    </div>
                ` : '';

                return `
                    <div style="background: rgba(0,0,0,0.35); padding: 14px; border-radius: 8px; border: 1.5px solid ${biome.color}; text-align: center; margin-bottom: 12px; position: relative;">
                        <div style="font-size: 2rem; margin-bottom: 4px;">${card.icon || biome.icon}</div>
                        <h4 style="color: #fff; font-size: 1.05rem; margin-bottom: 2px;">${card.name}</h4>
                        <div style="color: var(--accent-gold); font-weight: bold; font-size: 0.95rem; margin-bottom: 4px;">🔄 ${card.locationAction.name}</div>
                        <p style="color: #cbd5e1; font-size: 0.88rem; margin-bottom: 8px;">${card.locationAction.desc}</p>
                        ${costGainHtml}
                        ${usedDots}
                        ${usedByMe ? `
                            <button class="btn-action" style="width: 100%; justify-content: center; background: #374151; color: #94a3b8; cursor: not-allowed;" disabled>
                                ✅ Ya utilizada por ti
                            </button>
                        ` : `
                            <button class="btn-action btn-action-primary" style="width: 100%; justify-content: center;" onclick="UI.confirmExecuteLocationAction('${card.id}')">
                                ⚡ Activar ${card.locationAction.name}
                            </button>
                        `}
                    </div>
                `;
            }).join('');
        }

        const btnConfirm = document.getElementById('btn-confirm-loc-action');
        if (btnConfirm) {
            btnConfirm.style.display = 'none';
        }

        modal.classList.add('open');
    },

    confirmExecuteLocationAction(cardIdOrIndex) {
        document.getElementById('modal-location-action')?.classList.remove('open');
        this.game.executeLocationAction(cardIdOrIndex);
    },

    promptAncestralTeaching() {
        const modal = document.getElementById('modal-ancestral-teaching');
        if (!modal) {
            const player = this.game.getActivePlayer();
            const choice = prompt('Elige ataque (0 a 5):', '0');
            const atkIdx = parseInt(choice || '0', 10);
            this.game.executeAncestralTeaching(atkIdx, player.monsters[0]?.instanceId);
            return;
        }
        this.selectedAncestralAttackIdx = 0;
        this.renderAncestralTeachingModal();
        modal.classList.add('open');
    },

    renderAncestralTeachingModal() {
        const attacksContainer = document.getElementById('ancestral-attacks-list');
        const targetContainer = document.getElementById('ancestral-monster-target');
        const choicesContainer = document.getElementById('ancestral-monster-choices');
        const attacksPool = (typeof ANCESTRAL_ATTACKS !== 'undefined' ? ANCESTRAL_ATTACKS : window.ANCESTRAL_ATTACKS) || [];
        const player = this.game.getActivePlayer();

        if (attacksContainer) {
            attacksContainer.innerHTML = attacksPool.map((atk, idx) => {
                const typeColor = TYPE_COLORS[atk.type] || '#3b82f6';
                const isSelected = idx === this.selectedAncestralAttackIdx;
                return `
                    <div class="ancestral-atk-card" style="background: ${isSelected ? 'rgba(56, 189, 248, 0.2)' : '#1e242d'}; border: 2px solid ${isSelected ? '#38bdf8' : '#374151'}; padding: 10px; border-radius: 8px; cursor: pointer;"
                         onclick="UI.selectAncestralAttack(${idx})">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <strong style="color: #fff; font-size: 0.9rem;">${atk.name}</strong>
                            <span class="type-pill" style="background: ${typeColor}; font-size: 0.65rem;">${atk.type}</span>
                        </div>
                        <div style="font-size: 0.78rem; color: #fbbf24; font-weight: bold;">💥 ${atk.baseDmg} Daño base</div>
                        <div style="font-size: 0.72rem; color: #cbd5e1; margin-top: 3px;">${atk.desc}</div>
                    </div>
                `;
            }).join('');
        }

        if (targetContainer && choicesContainer) {
            targetContainer.style.display = 'block';
            choicesContainer.innerHTML = player.monsters.map((m) => `
                <div class="ancestral-mon-choice" style="background: #18202a; border: 1.5px solid #475569; padding: 8px; border-radius: 8px; text-align: center; cursor: pointer;"
                     onclick="UI.confirmAncestralTeaching('${m.instanceId}')">
                    <div style="font-size: 1.8rem;">${m.icon}</div>
                    <strong style="font-size: 0.85rem; color: #fff; display: block;">${m.name}</strong>
                    <div style="font-size: 0.7rem; color: #94a3b8;">${m.attacks.length}/3 ataques</div>
                    <button class="btn-action-small" style="margin-top: 6px; width: 100%;">Enseñar a ${m.name}</button>
                </div>
            `).join('');
        }
    },

    selectAncestralAttack(idx) {
        this.selectedAncestralAttackIdx = idx;
        this.renderAncestralTeachingModal();
    },

    confirmAncestralTeaching(monsterInstanceId) {
        document.getElementById('modal-ancestral-teaching')?.classList.remove('open');
        this.game.executeAncestralTeaching(this.selectedAncestralAttackIdx || 0, monsterInstanceId);
    },

    promptDruidBlessing() {
        const modal = document.getElementById('modal-druid-blessing');
        if (!modal) {
            const player = this.game.getActivePlayer();
            const choice = prompt('Elige criatura para la Bendición del Druida (1 a ' + player.monsters.length + '):', '1');
            const idx = Math.max(0, parseInt(choice || '1', 10) - 1);
            this.game.executeDruidBlessing(player.monsters[idx]?.instanceId);
            return;
        }

        const choicesContainer = document.getElementById('druid-blessing-choices');
        const player = this.game.getActivePlayer();
        if (choicesContainer) {
            choicesContainer.innerHTML = player.monsters.map((m) => `
                <div style="background: #18202a; border: 1.5px solid #10b981; padding: 12px; border-radius: 8px; text-align: center; cursor: pointer;"
                     onclick="UI.confirmDruidBlessing('${m.instanceId}')">
                    <div style="font-size: 2.2rem; margin-bottom: 4px;">${m.icon}</div>
                    <strong style="font-size: 0.95rem; color: #fff; display: block;">${m.name}</strong>
                    <div style="font-size: 0.78rem; color: #34d399; margin: 4px 0;">❤️ ${m.hp}/${m.maxHp} HP</div>
                    <button class="btn-action btn-action-primary" style="margin-top: 6px; width: 100%; justify-content: center; background: linear-gradient(180deg, #10b981, #059669); border-color: #34d399;">
                        ✨ Bendecir (+1 Max HP)
                    </button>
                </div>
            `).join('');
        }

        modal.classList.add('open');
    },

    confirmDruidBlessing(monsterInstanceId) {
        document.getElementById('modal-druid-blessing')?.classList.remove('open');
        this.game.executeDruidBlessing(monsterInstanceId);
    },

    showMapTravelModal() {
        const modal = document.getElementById('modal-map-travel');
        if (!modal) return;

        const container = document.getElementById('map-travel-nodes-list');
        const player = this.game.getActivePlayer();
        const currentNode = this.game.cardMap.getNode(player.currentNodeId || `${player.x},${player.y}`);

        const discoveredNodes = Object.values(this.game.cardMap.nodes).filter(n => n.cards.length > 0 && n.id !== (currentNode ? currentNode.id : ''));

        if (container) {
            container.innerHTML = discoveredNodes.map(node => {
                const topCard = node.card || node.cards[0];
                const biome = topCard ? (BIOMES[topCard.biome] || BIOMES.city) : BIOMES.city;
                return `
                    <div class="travel-city-card" style="border-left: 4px solid ${biome.color}; cursor: pointer;"
                         onclick="UI.game.executeMapTravel('${node.id}')">
                        <div class="travel-city-icon" style="font-size: 1.8rem;">${topCard.icon || biome.icon}</div>
                        <div style="flex: 1;">
                            <strong style="color: #fff; font-size: 0.95rem;">${node.name}</strong>
                            <div style="font-size: 0.75rem; color: #94a3b8;">
                                ${node.cards.map(c => c.name).join(' + ')} (${node.cards.length}/${node.maxCards} cartas)
                            </div>
                        </div>
                        <button class="btn-action-small" style="width: auto; background: #0284c7; border-color: #38bdf8;">
                            ⛵ Desembarcar
                        </button>
                    </div>
                `;
            }).join('');
        }

        modal.classList.add('open');
    },

    hideMapTravelModal() {
        document.getElementById('modal-map-travel')?.classList.remove('open');
    },

    showDraftLocationModal({ player, cards, onSelect }) {
        const modal = document.getElementById('modal-draft-location');
        if (!modal) return;

        const container = document.getElementById('draft-cards-grid');
        if (container) {
            container.innerHTML = cards.map((card, idx) => {
                const biome = BIOMES[card.biome] || BIOMES.forest;
                return `
                    <div class="location-hand-card" style="border-color: ${biome.color}; cursor: pointer;" onclick="UI.selectDraftPick(${idx})">
                        <div class="location-card-banner" style="background: ${biome.color};">
                            <span>${biome.icon} ${biome.name}</span>
                        </div>
                        <div class="location-card-art">${card.icon || biome.icon}</div>
                        <div class="location-card-title">${card.name}</div>
                        <div class="location-card-action-box">
                            <strong>${card.locationAction ? card.locationAction.name : 'Acción'}</strong>
                            ${card.locationAction ? card.locationAction.desc : card.flavor}
                        </div>
                        <div class="location-card-bottom">
                            <button class="btn-place-loc" style="background: linear-gradient(180deg, #3b82f6, #2563eb);">
                                🍀 Elegir Esta Carta
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        this.activeDraftCallback = (selectedIdx) => {
            modal.classList.remove('open');
            const chosen = cards[selectedIdx];
            const others = cards.filter((_, i) => i !== selectedIdx);
            if (onSelect) onSelect(chosen, others);
        };

        modal.classList.add('open');
    },

    selectDraftPick(idx) {
        if (this.activeDraftCallback) {
            this.activeDraftCallback(idx);
        }
    },

    renderActionBar() {
        const activePlayer = this.game.getActivePlayer();
        const currentNode = this.game.cardMap.getNode(activePlayer.currentNodeId || `${activePlayer.x},${activePlayer.y}`);

        const btnSearch = document.getElementById('btn-act-search');
        const btnGym = document.getElementById('btn-act-gym');
        const btnShop = document.getElementById('btn-act-shop');
        const btnLocAction = document.getElementById('btn-act-loc-action');
        const btnPoi = document.getElementById('btn-act-poi');

        const currentCard = currentNode ? currentNode.card : null;
        const isCity = currentCard ? (currentCard.biome === 'city' || currentNode.cards.some(c => c.biome === 'city')) : false;
        const gymCard = currentNode ? currentNode.cards.find(c => c.gym) : null;
        const hasGym = Boolean(gymCard && gymCard.gym);
        const hasUnclaimedPoi = currentNode && currentNode.poi && !currentNode.poi.claimed;
        const actionCards = currentNode ? currentNode.cards.filter(c => Boolean(c.locationAction)) : [];
        const hasLocAction = actionCards.length > 0;

        if (btnSearch) {
            btnSearch.disabled = this.game.hasEncounterActed || isCity || !currentCard;
            btnSearch.title = isCity ? 'No hay monstruos salvajes en Ciudades' : 'Buscar monstruos salvajes (concluye el turno)';
        }

        if (btnGym) {
            btnGym.style.display = hasGym ? 'flex' : 'none';
            const isDefeated = hasGym && Boolean(activePlayer.defeatedGymIds && activePlayer.defeatedGymIds.includes(gymCard.gym.id));
            btnGym.disabled = this.game.hasEncounterActed || isDefeated;
            if (hasGym) {
                const adaptiveGym = this.game.getAdaptiveGymForPlayer(gymCard.gym, activePlayer);
                if (isDefeated) {
                    btnGym.innerHTML = `✅ ${gymCard.gym.name} (Superado)`;
                    btnGym.title = 'Ya has derrotado este gimnasio y obtenido su medalla';
                } else {
                    btnGym.innerHTML = `🏛️ Desafiar ${gymCard.gym.name} (T${adaptiveGym.tier}: ${adaptiveGym.teamMonsterIds.length} 👾)`;
                    btnGym.title = `Combate adaptativo Tier ${adaptiveGym.tier} (${adaptiveGym.teamMonsterIds.length} criaturas) contra ${gymCard.gym.leaderName}`;
                }
            }
        }

        if (btnShop) {
            const canShop = this.game.canAccessShop();
            btnShop.disabled = !canShop;
            btnShop.title = canShop ? 'Acceder a la Tienda River de 8 cartas' : 'Solo disponible en Ciudades';
        }

        if (btnLocAction) {
            btnLocAction.disabled = this.game.hasLocationActed || !hasLocAction;
            if (hasLocAction) {
                if (actionCards.length === 1) {
                    btnLocAction.innerHTML = `🔄 ${actionCards[0].locationAction.name}`;
                } else {
                    btnLocAction.innerHTML = `🔄 Acciones de Zona (${actionCards.length})`;
                }
                btnLocAction.title = this.game.hasLocationActed ? 'Acción de lugar ya realizada en este turno' : actionCards.map(c => `${c.name}: ${c.locationAction.name}`).join(' | ');
            } else {
                btnLocAction.innerHTML = `🔄 Acción de Lugar`;
                btnLocAction.title = 'No hay acciones disponibles en esta localización';
            }
        }

        if (btnPoi) {
            btnPoi.disabled = this.game.hasActed || !hasUnclaimedPoi;
        }
    },

    renderPlayerBoard() {
        // Player tab switcher
        const tabContainer = document.getElementById('player-tabs-bar');
        if (tabContainer) {
            tabContainer.innerHTML = this.game.players.map((p, idx) => `
                <button class="player-tab-btn ${idx === this.selectedPlayerTab ? 'active' : ''}" 
                        style="border-bottom-color: ${p.color};"
                        onclick="UI.selectPlayerTab(${idx})">
                    <span class="tab-indicator" style="background: ${p.color};"></span>
                    ${p.name} ${idx === this.game.activePlayerIndex ? '⭐ (Activo)' : ''}
                </button>
            `).join('');
        }

        const player = this.game.players[this.selectedPlayerTab] || this.game.getActivePlayer();
        const char = player.character;

        // Player Info banner
        const nameEl = document.getElementById('board-player-name');
        if (nameEl) nameEl.textContent = player.name;

        const charIconEl = document.getElementById('board-char-icon');
        if (charIconEl) charIconEl.textContent = char.icon;

        const charNameEl = document.getElementById('board-char-title');
        if (charNameEl) charNameEl.textContent = `${char.name} (${char.title})`;

        const abilityEl = document.getElementById('board-char-ability');
        if (abilityEl) abilityEl.innerHTML = `<strong>Habilidad:</strong> ${char.abilityName} (${char.abilityDesc})`;

        const coinsEl = document.getElementById('board-coins-val');
        if (coinsEl) coinsEl.textContent = `${player.coins} 🪙`;

        const luckEl = document.getElementById('board-luck-val');
        if (luckEl) luckEl.textContent = `${player.luck || 0} 🍀`;

        const draftToggleBtn = document.getElementById('btn-toggle-draft-draw');
        if (draftToggleBtn) {
            draftToggleBtn.className = `draft-toggle-btn ${player.draftOnDraw ? 'active' : ''}`;
            draftToggleBtn.innerHTML = `🍀 Drafteo al robar: <strong>${player.draftOnDraw ? 'ON' : 'OFF'}</strong> (1 🍀)`;
        }

        const drawLocBtn = document.getElementById('btn-draw-location');
        if (drawLocBtn) {
            drawLocBtn.disabled = (player.locationHand.length >= 5);
            drawLocBtn.innerHTML = `🃏 Robar Carta (${player.locationHand.length}/5)`;
        }

        // Badges: 3 of 4 needed to qualify!
        const badgesContainer = document.getElementById('board-badges-list');
        if (badgesContainer) {
            badgesContainer.innerHTML = CITIES_DATABASE.map(city => {
                const earned = Boolean(player.defeatedGymIds && player.defeatedGymIds.includes(city.gym.id));
                return `
                    <div class="badge-token ${earned ? 'earned' : 'locked'}" title="${city.gym.badgeName} - ${city.name} (${earned ? 'Conseguida ✅' : 'Pendiente'})">
                        <span>${city.gym.badgeIcon}</span>
                        <small>${earned ? '✅' : city.gym.badgeName}</small>
                    </div>
                `;
            }).join('');
        }

        const ballotsContainer = document.getElementById('board-ballots-list');
        if (ballotsContainer) {
            const ballots = player.ballots || (this.game.createPlayerBallots ? this.game.createPlayerBallots(player) : []);
            ballotsContainer.innerHTML = ballots.map(b => `
                <div class="player-ballot-chip" style="border-color: ${b.color};" title="Papeleta de apuesta: ${b.targetPlayerName}">
                    <span class="ballot-dot" style="background: ${b.color};"></span>
                    <span>${b.type === 'npc' ? '🏛️ ' : '👤 '}${b.targetPlayerName}</span>
                </div>
            `).join('');
        }

        // Location Hand Row (Requirement 1 & 6)
        const locationHandContainer = document.getElementById('location-hand-cards-list');
        if (locationHandContainer) {
            let locHtml = '';

            // Top of Cities Deck Widget (Always Plantable)
            if (this.game.citiesDeck.length > 0) {
                const nextCity = this.game.citiesDeck[0];
                locHtml += `
                    <div class="cities-deck-card" title="Mazo de Ciudades (${this.game.citiesDeck.length} restantes)">
                        <div class="location-card-banner" style="background: #1e293b; color: #fbbf24; border-bottom: 1px solid #fbbf24;">
                            <span>🏛️ Mazo Ciudades</span>
                            <span>Adaptativo</span>
                        </div>
                        <div class="location-card-art">🏛️</div>
                        <div class="location-card-title">${nextCity.name}</div>
                        <div class="location-card-action-box">
                            <strong>Gimnasio de ${nextCity.gym.leaderName}</strong>
                            Siempre disponible para plantar en cualquier casillero adyacente.
                        </div>
                        <div class="location-card-bottom">
                            <span style="font-size: 0.68rem; color: #fbbf24; display: block; text-align: center; font-weight: bold;">
                                ${this.game.citiesDeck.length} disponibles
                            </span>
                        </div>
                    </div>
                `;
            }

            // Cards in Hand
            if (player.locationHand.length === 0) {
                locHtml += `<div class="empty-stash">Mano vacía. Robarás cartas automáticamente al inicio de tu turno.</div>`;
            } else {
                player.locationHand.forEach((card, idx) => {
                    const biome = BIOMES[card.biome] || BIOMES.forest;
                    locHtml += `
                        <div class="location-hand-card" style="border-color: ${biome.color};">
                            <div class="location-card-banner" style="background: ${biome.color};">
                                <span>${biome.icon} ${biome.name}</span>
                                ${card.tier && card.tier > 1 ? `<span style="background: #9333ea; color: #fff; padding: 1px 6px; border-radius: 4px; font-weight: bold; font-size: 0.65rem;">Tier ${card.tier}</span>` : `<span>#${idx + 1}</span>`}
                            </div>
                            <div class="location-card-art">${card.icon || biome.icon}</div>
                            <div class="location-card-title">${card.name}</div>
                            <div class="location-card-action-box">
                                <strong>${card.locationAction ? card.locationAction.name : 'Exploración'}</strong>
                                ${card.locationAction ? card.locationAction.desc : card.flavor}
                            </div>
                            ${(card.usedByPlayerIds && card.usedByPlayerIds.length > 0) ? `
                                <div class="card-used-dots" style="position: static; justify-content: center; margin-top: 4px; transform: none;">
                                    ${card.usedByPlayerIds.map(pid => {
                                        const pl = this.game.players.find(p => p.id === pid);
                                        const color = pl ? pl.color : '#e53935';
                                        const name = pl ? pl.name : pid;
                                        return `<span class="location-used-dot" style="background-color: ${color};" title="Utilizada por ${name}"></span>`;
                                    }).join('')}
                                </div>
                            ` : ''}
                            <div class="location-card-bottom">
                                <span style="font-size: 0.65rem; color: #94a3b8; text-align: center; display: block;">
                                    Haz clic en casillero adyacente del mapa
                                </span>
                            </div>
                        </div>
                    `;
                });
            }
            locationHandContainer.innerHTML = locHtml;
        }

        // 4 Creature Slots on personal board (Rule 24 & Rule 3)
        const slotsContainer = document.getElementById('creature-slots-container');
        if (slotsContainer) {
            let slotsHtml = '';
            for (let i = 0; i < 4; i++) {
                const monster = player.monsters[i];
                const isBattleParty = (i < 3);

                if (monster) {
                    const biome = BIOMES[monster.biome] || BIOMES.forest;
                    const typeColor = TYPE_COLORS[monster.type] || '#4caf50';

                    slotsHtml += `
                        <div class="creature-card-slot ${isBattleParty ? 'battle-party' : 'bench-reserve'}">
                            <div class="slot-badge">${isBattleParty ? `⚔️ Puesto ${i + 1} (Combate)` : '📦 Puesto 4 (Reserva)'}</div>
                            
                            <div class="monster-card-inner">
                                <div class="monster-header">
                                    <div class="monster-avatar" style="border-color: ${typeColor};">${monster.icon}</div>
                                    <div class="monster-titles">
                                        <div class="monster-name">${monster.name}</div>
                                        <div class="type-pill" style="background: ${typeColor};">${monster.type}</div>
                                    </div>
                                    <div class="tier-pill" title="Tier de Captura">Tier ${monster.captureTier}</div>
                                </div>

                                <!-- HP Tracker on player board (Rule 22) -->
                                <div class="hp-tracker-row">
                                    <span class="stat-lbl">Salud (HP):</span>
                                    <div class="hp-adjuster">
                                        <button class="btn-micro" onclick="UI.adjustHp('${monster.instanceId}', -1)">-</button>
                                        <strong class="hp-val ${monster.hp <= 3 ? 'low-hp' : ''}">${monster.hp} / ${monster.maxHp}</strong>
                                        <button class="btn-micro" onclick="UI.adjustHp('${monster.instanceId}', 1)">+</button>
                                    </div>
                                </div>
                                <div class="hp-bar-outer">
                                    <div class="hp-bar-fill" style="width: ${(monster.hp / monster.maxHp) * 100}%;"></div>
                                </div>

                                <!-- Speed & Weakness Tag (Rule 18: Weak +2) -->
                                <div class="stats-row">
                                    <div class="stat-box">Vel: <strong>${monster.speed + (monster.equippedItem && monster.equippedItem.id === 'item_cmb_3' ? 2 : 0)} ⚡</strong>${monster.equippedItem && monster.equippedItem.id === 'item_cmb_3' ? ' <small style="color:#fbbf24;">(+2 Garra)</small>' : ''}</div>
                                    <div class="stat-box weakness-tag" title="Sufre +2 daño de este tipo">Weak +2: <strong>${monster.weakness}</strong></div>
                                </div>

                                <!-- Attacks list (with varied effects display) -->
                                <div class="attacks-section">
                                    <div class="section-title">Ataques:</div>
                                    ${monster.attacks.map(atk => {
                                        const dmgDisplay = atk.effect === 'speed_damage' ? 'Vel' : atk.effect === 'fixed_damage' ? `${atk.fixedDmg} Fijo` : `${atk.baseDmg} daño`;
                                        return `
                                            <div class="attack-item" style="display: flex; flex-direction: column; gap: 1px; margin-bottom: 3px;">
                                                <div style="display: flex; justify-content: space-between;">
                                                    <span class="atk-name">${atk.name} (${atk.type}):</span>
                                                    <span class="atk-math">${dmgDisplay}</span>
                                                </div>
                                                ${atk.desc ? `<small style="font-size: 0.64rem; color: #fde047; line-height: 1.2;">${atk.desc}</small>` : ''}
                                            </div>
                                        `;
                                    }).join('')}
                                </div>

                                <!-- Equipped Item (Rule 10: max 1 item) -->
                                <div class="item-slot-row">
                                    <span class="stat-lbl">Objeto:</span>
                                    ${monster.equippedItem ? `
                                        <div class="equipped-item-chip" title="${monster.equippedItem.desc}">
                                            <span>${monster.equippedItem.icon} ${monster.equippedItem.name}</span>
                                            <button class="btn-micro-remove" onclick="UI.game.unequipItemFromMonster('${monster.instanceId}')">✕</button>
                                        </div>
                                    ` : `
                                        <span class="empty-item-text">Sin objeto (máx. 1)</span>
                                    `}
                                </div>

                                <!-- Overworld Ability Button (Rule 17) -->
                                ${monster.overworldAbility ? `
                                    <div class="overworld-row">
                                        <button class="btn-overworld" onclick="UI.game.useOverworldAbility('${monster.instanceId}')" title="${monster.overworldAbility.desc}">
                                            ✨ ${monster.overworldAbility.name}
                                        </button>
                                    </div>
                                ` : ''}

                                <!-- Reordering controls (Rule 27) -->
                                <div class="reorder-row">
                                    <button class="btn-reorder" onclick="UI.game.moveMonsterOrder(${i}, ${i - 1})" ${i === 0 ? 'disabled' : ''}>⬆️ Subir</button>
                                    <button class="btn-reorder" onclick="UI.game.moveMonsterOrder(${i}, ${i + 1})" ${i === player.monsters.length - 1 ? 'disabled' : ''}>⬇️ Bajar</button>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    slotsHtml += `
                        <div class="creature-card-slot empty-slot ${isBattleParty ? 'battle-party' : 'bench-reserve'}">
                            <div class="slot-badge">${isBattleParty ? `Puesto ${i + 1} (Combate)` : 'Puesto 4 (Reserva)'}</div>
                            <div class="empty-placeholder">
                                <span>➕ Vacío</span>
                                <small>Captura monstruos para llenar este puesto</small>
                            </div>
                        </div>
                    `;
                }
            }
            slotsContainer.innerHTML = slotsHtml;
        }

        // Hand of Items (Rule 24)
        const inventoryContainer = document.getElementById('board-inventory-items');
        if (inventoryContainer) {
            if (player.inventory.length === 0) {
                inventoryContainer.innerHTML = `<div class="empty-stash">Mano vacía. Visita la tienda en una Ciudad para comprar objetos.</div>`;
            } else {
                inventoryContainer.innerHTML = player.inventory.map((item, idx) => `
                    <div class="inventory-card">
                        <div class="inv-top">
                            <span class="inv-icon">${item.icon}</span>
                            <span class="inv-cat tag-${item.category}">${item.category === 'combat' ? 'Combate' : 'Utilidad'}</span>
                        </div>
                        <div class="inv-name">${item.name}</div>
                        <div class="inv-desc">${item.desc}</div>
                        ${item.category === 'combat' ? `
                            <div class="inv-actions">
                                <button class="btn-action-small" onclick="UI.promptEquipItem(${idx})">Equipar a Criatura</button>
                            </div>
                        ` : ''}
                    </div>
                `).join('');
            }
        }
    },

    selectPlayerTab(index) {
        this.selectedPlayerTab = index;
        this.renderPlayerBoard();
    },

    adjustHp(monsterInstanceId, delta) {
        const player = this.game.players[this.selectedPlayerTab];
        const mon = player.monsters.find(m => m.instanceId === monsterInstanceId);
        if (mon) {
            mon.hp = Math.min(mon.maxHp, Math.max(0, mon.hp + delta));
            this.renderPlayerBoard();
        }
    },

    promptEquipItem(itemIndex) {
        const player = this.game.players[this.selectedPlayerTab];
        const item = player.inventory[itemIndex];
        if (!item) return;

        let promptText = `¿A qué criatura deseas equipar "${item.name}"?\n(Recuerda: Máximo 1 objeto por criatura)\n`;
        player.monsters.forEach((m, idx) => {
            promptText += `${idx + 1}. ${m.name} ${m.equippedItem ? `(Reemplaza: ${m.equippedItem.name})` : '(Libre)'}\n`;
        });

        const choice = prompt(promptText, '1');
        if (choice) {
            const idx = parseInt(choice, 10) - 1;
            if (idx >= 0 && idx < player.monsters.length) {
                this.game.equipItemToMonster(itemIndex, player.monsters[idx].instanceId);
            }
        }
    },

    // Search Encounter Modal (Rule 7, 6, 30 + Requirement 3: Redraw with Luck)
    showSearchModal({ biome, cards, player }) {
        this.activeSearchData = { biome, cards, player };
        const modal = document.getElementById('modal-search');
        if (!modal) return;

        const container = document.getElementById('search-cards-grid');
        if (container) {
            container.innerHTML = cards.map((monster, idx) => {
                return `
                    <div class="wild-card-container">
                        <div class="wild-card-front" style="border-top: 5px solid ${biome.color || '#3b82f6'};">
                            <div class="wild-header">
                                <span class="wild-icon">${monster.icon}</span>
                                <div>
                                    <div class="wild-name">${monster.name}</div>
                                    <span class="type-pill" style="background: ${TYPE_COLORS[monster.type] || '#4caf50'};">${monster.type}</span>
                                </div>
                                <span class="tier-pill">Tier ${monster.captureTier}</span>
                            </div>

                            <div class="wild-stats">
                                <div>❤️ HP: ${monster.hp}</div>
                                <div>⚡ Vel: ${monster.speed}</div>
                                <div class="weakness-tag">Weak +2: ${monster.weakness}</div>
                            </div>

                            <div class="wild-attack">
                                ${monster.attacks.map(atk => `
                                    <div style="margin-bottom: 3px;">
                                        <strong>Ataque:</strong> ${atk.name} (${atk.type}) — ${atk.effect === 'speed_damage' ? 'Velocidad' : atk.effect === 'fixed_damage' ? `${atk.fixedDmg} Daño Fijo` : `${atk.baseDmg} daño`}
                                        ${atk.desc ? `<div style="font-size: 0.68rem; color: #fde047; margin-top: 1px;">${atk.desc}</div>` : ''}
                                    </div>
                                `).join('')}
                            </div>

                            <div class="wild-actions">
                                <button class="btn-wild-capture btn-can-capture" 
                                        onclick="UI.game.captureMonster(${idx})">
                                    🐾 Capturar a ${monster.name}
                                </button>
                                
                                <button class="btn-wild-teach btn-can-teach" 
                                        onclick="UI.promptTeachAttack(${idx})">
                                    📖 Enseñar Ataque (+${monster.attacks[0].name})
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Add Redraw with Luck Button
        const redrawBtn = document.getElementById('btn-search-redraw');
        if (redrawBtn) {
            redrawBtn.disabled = (player.luck < 1);
            redrawBtn.innerHTML = `🍀 Redibujar Monstruos (Cuesta 1 Suerte - Tienes: ${player.luck || 0} 🍀)`;
            redrawBtn.onclick = () => {
                this.game.redrawActiveSearch();
            };
        }

        modal.classList.add('open');
    },

    hideSearchModal() {
        const modal = document.getElementById('modal-search');
        if (modal) modal.classList.remove('open');
    },

    closeSearchModal() {
        if (this.game && this.game.activeSearchCards) {
            this.game.dismissSearchEncounter();
        } else {
            this.hideSearchModal();
        }
    },

    promptTeachAttack(monsterIndex) {
        const player = this.game.getActivePlayer();
        const wildMon = (this.activeSearchData && this.activeSearchData.cards && this.activeSearchData.cards[monsterIndex]) || (this.game.activeSearchCards && this.game.activeSearchCards[monsterIndex]);
        if (!wildMon) return;

        this.showTeachAttackModal({
            source: 'wild',
            attack: wildMon.attacks[0],
            wildMonsterIndex: monsterIndex,
            sourceName: `${wildMon.name} (Salvaje Tier ${wildMon.captureTier})`
        });
    },

    showTeachAttackModal({ source, attack, wildMonsterIndex = null, sourceName = '', recipientPlayer = null }) {
        this.activeTeachAttackContext = { source, attack, wildMonsterIndex, sourceName, recipientPlayer };
        const modal = document.getElementById('modal-teach-attack');
        if (!modal) {
            const player = recipientPlayer || this.game.getActivePlayer();
            if (player && player.monsters.length > 0) {
                if (source === 'wild' && wildMonsterIndex !== null) {
                    this.game.teachAttackFromWild(wildMonsterIndex, player.monsters[0].instanceId);
                } else if (source === 'combat') {
                    this.confirmTeachAttack(player.monsters[0].instanceId);
                }
            }
            return;
        }

        const typeColor = TYPE_COLORS[attack.type] || '#3b82f6';
        const dmgDisplay = attack.effect === 'speed_damage' ? 'Velocidad' : attack.effect === 'fixed_damage' ? `${attack.fixedDmg} Fijo` : attack.effect === 'multi_hit' ? `${attack.hits || 3}x (${attack.baseDmg || 1} daño)` : `${attack.baseDmg || 1} daño`;

        const bannerEl = document.getElementById('teach-attack-move-info');
        if (bannerEl) {
            bannerEl.innerHTML = `
                <div class="teach-attack-banner">
                    <div class="teach-attack-banner-top">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <strong style="color: #fff; font-size: 1.1rem;">${attack.name}</strong>
                            <span class="type-pill" style="background: ${typeColor};">${attack.type}</span>
                        </div>
                        <div style="font-weight: 800; color: #fbbf24; font-size: 0.95rem;">💥 ${dmgDisplay}</div>
                    </div>
                    ${attack.desc ? `<div style="font-size: 0.8rem; color: #fde047;">${attack.desc}</div>` : ''}
                    <div style="font-size: 0.75rem; color: #94a3b8;">${sourceName ? `Origen: <strong>${sourceName}</strong>` : ''}</div>
                </div>
            `;
        }

        const partyGrid = document.getElementById('teach-attack-party-grid');
        const activePlayer = recipientPlayer || (this.game.combatEngine && this.game.combatEngine.player1) || this.game.getActivePlayer();
        if (partyGrid) {
            partyGrid.innerHTML = activePlayer.monsters.map((monster, i) => {
                const monTypeColor = TYPE_COLORS[monster.type] || '#4caf50';
                const alreadyKnows = monster.attacks.some(a => a.name === attack.name);
                const isFull = monster.attacks.length >= 3;
                const isBattleParty = (i < 3);

                return `
                    <div class="teach-party-card ${alreadyKnows ? 'cannot-teach' : ''}">
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; color: #94a3b8;">
                            <span>${isBattleParty ? `⚔️ Puesto ${i + 1} (Combate)` : '📦 Puesto 4 (Reserva)'}</span>
                            <span class="tier-pill" style="font-size: 0.65rem;">Tier ${monster.captureTier}</span>
                        </div>

                        <div class="teach-party-header">
                            <div class="teach-party-avatar" style="border-color: ${monTypeColor};">${monster.icon}</div>
                            <div class="teach-party-info">
                                <div class="teach-party-name">${monster.name}</div>
                                <div class="teach-party-meta">
                                    <span class="type-pill" style="background: ${monTypeColor}; font-size: 0.65rem;">${monster.type}</span>
                                    <span style="font-size: 0.75rem; color: #34d399;">❤️ ${monster.hp}/${monster.maxHp} HP</span>
                                </div>
                            </div>
                        </div>

                        <div class="teach-party-attacks">
                            <div style="font-weight: bold; color: #94a3b8; font-size: 0.68rem; text-transform: uppercase;">
                                Ataques actuales (${monster.attacks.length}/3):
                            </div>
                            ${monster.attacks.map((a, aIdx) => `
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="color: #f1f5f9; ${isFull && aIdx === 1 ? 'color: #fca5a5; font-style: italic;' : ''}">
                                        ${aIdx + 1}. ${a.name} ${isFull && aIdx === 1 ? '(se reemplazará)' : ''}
                                    </span>
                                    <span style="color: #38bdf8; font-size: 0.7rem;">${a.effect === 'speed_damage' ? 'Vel' : a.effect === 'fixed_damage' ? `${a.fixedDmg} Fijo` : `${a.baseDmg} dmg`}</span>
                                </div>
                            `).join('')}
                        </div>

                        <div style="margin-top: 4px;">
                            ${alreadyKnows ? `
                                <button class="btn-action" style="width: 100%; justify-content: center; background: #334155; border-color: #475569; opacity: 0.6; cursor: not-allowed;" disabled>
                                    ❌ Ya conoce este ataque
                                </button>
                            ` : isFull ? `
                                <button class="btn-action" style="width: 100%; justify-content: center; background: linear-gradient(180deg, #f59e0b, #d97706); border-color: #fbbf24; font-weight: bold;"
                                        onclick="UI.confirmTeachAttack('${monster.instanceId}')">
                                    🔄 Enseñar y Reemplazar
                                </button>
                            ` : `
                                <button class="btn-action btn-action-primary" style="width: 100%; justify-content: center; font-weight: bold;"
                                        onclick="UI.confirmTeachAttack('${monster.instanceId}')">
                                    📖 Enseñar a ${monster.name}
                                </button>
                            `}
                        </div>
                    </div>
                `;
            }).join('');
        }

        modal.classList.add('open');
    },

    hideTeachAttackModal() {
        const modal = document.getElementById('modal-teach-attack');
        if (modal) modal.classList.remove('open');
        this.activeTeachAttackContext = null;
    },

    confirmTeachAttack(monsterInstanceId) {
        const ctx = this.activeTeachAttackContext;
        if (!ctx) return;

        this.hideTeachAttackModal();

        if (ctx.source === 'wild' && ctx.wildMonsterIndex !== null) {
            this.game.teachAttackFromWild(ctx.wildMonsterIndex, monsterInstanceId);
            return;
        }

        if (ctx.source === 'combat') {
            const combat = this.game.combatEngine;
            const player = combat.player1 || this.game.players.find(p => p.monsters.some(m => m.instanceId === monsterInstanceId)) || this.game.getActivePlayer();
            const targetMon = player ? player.monsters.find(m => m.instanceId === monsterInstanceId) : null;
            if (!targetMon) return;

            if (targetMon.attacks.some(a => a.name === ctx.attack.name)) {
                alert(`${targetMon.name} ya conoce ese movimiento.`);
                return;
            }

            if (targetMon.attacks.length >= 3) {
                targetMon.attacks[1] = JSON.parse(JSON.stringify(ctx.attack));
            } else {
                targetMon.attacks.push(JSON.parse(JSON.stringify(ctx.attack)));
            }

            SoundFX.victory();
            this.logGame(`📖 ¡${targetMon.name} aprendió el ataque **${ctx.attack.name}**!`);
            combat.pendingMoveTeaching = null;
            const resultMoveSec = typeof document.querySelector === 'function' ? document.querySelector('.result-move-teaching') : null;
            if (resultMoveSec) resultMoveSec.style.display = 'none';
            this.renderAll();
        }
    },

    // River Shop Modal (Rule 16: exactly 8 cards, no duplicates)
    showShopModal() {
        const modal = document.getElementById('modal-shop');
        if (!modal) return;
        this.renderShopModal();
        modal.classList.add('open');
    },

    hideShopModal() {
        const modal = document.getElementById('modal-shop');
        if (modal) modal.classList.remove('open');
    },

    renderShopModal() {
        const player = this.game.getActivePlayer();
        const riverContainer = document.getElementById('shop-river-grid');
        const shopCoinsEl = document.getElementById('shop-player-coins');
        if (shopCoinsEl) shopCoinsEl.textContent = `${player.coins} 🪙`;

        if (riverContainer) {
            riverContainer.innerHTML = this.game.shopRiver.map((item, idx) => {
                let cost = item.cost;
                if (this.game.mobileShopDiscountActive) cost = Math.max(1, cost - 1);
                if (player.characterId === 'char_blue' && item.category === 'utility') cost = Math.max(1, cost - 1);

                const canAfford = player.coins >= cost;
                return `
                    <div class="shop-card-item">
                        <div class="shop-card-badge tag-${item.category}">
                            ${item.category === 'combat' ? 'Combate' : 'Utilidad'}
                        </div>
                        <div class="shop-card-icon">${item.icon}</div>
                        <div class="shop-card-name">${item.name}</div>
                        <div class="shop-card-desc">${item.desc}</div>
                        <div class="shop-card-bottom">
                            <span class="shop-card-cost">${cost} 🪙</span>
                            <button class="btn-buy ${canAfford ? 'can-buy' : 'cannot-buy'}" 
                                    ${!canAfford ? 'disabled' : ''} 
                                    onclick="UI.game.buyShopItem(${idx})">
                                Comprar
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    },

    showPortTravelModal(portNodes) {
        const modal = document.getElementById('modal-port-travel');
        if (!modal) return;

        const container = document.getElementById('port-travel-nodes-list');
        if (container) {
            container.innerHTML = portNodes.map(node => {
                const portCard = node.cards.find(c => c.isPort) || node.card;
                const biome = portCard ? (BIOMES[portCard.biome] || BIOMES.city) : BIOMES.city;
                return `
                    <div class="travel-city-card" style="border-left: 4px solid ${biome.color}; cursor: pointer;"
                         onclick="UI.game.executePortTravel('${node.id}')">
                        <div class="travel-city-icon" style="font-size: 1.8rem;">${portCard.icon || '⚓'}</div>
                        <div style="flex: 1;">
                            <strong style="color: #fff; font-size: 0.95rem;">${node.name}</strong>
                            <div style="font-size: 0.75rem; color: #38bdf8;">
                                ⚓ ${portCard.name} (${biome.name})
                            </div>
                        </div>
                        <button class="btn-action-small" style="width: auto; background: #0284c7; border-color: #38bdf8;">
                            ⛵ Zarpar Aquí
                        </button>
                    </div>
                `;
            }).join('');
        }

        modal.classList.add('open');
    },

    hidePortTravelModal() {
        const modal = document.getElementById('modal-port-travel');
        if (modal) modal.classList.remove('open');
    },

    showRecoverMonsterModal(monsters) {
        const modal = document.getElementById('modal-recover-monster');
        if (!modal) return;

        const container = document.getElementById('recover-monsters-grid');
        if (container) {
            container.innerHTML = monsters.map((m, idx) => {
                const typeColor = TYPE_COLORS[m.type] || '#4caf50';
                return `
                    <div class="codex-mon-card" style="border-top: 4px solid ${typeColor}; background: #1a222d; padding: 10px; border-radius: 8px;">
                        <div class="monster-header">
                            <div class="monster-avatar" style="border-color: ${typeColor};">${m.icon}</div>
                            <div class="monster-titles">
                                <div class="monster-name" style="font-size: 0.95rem;">${m.name}</div>
                                <span class="type-pill" style="background: ${typeColor}; font-size: 0.7rem;">${m.type}</span>
                            </div>
                            <span class="tier-pill">Tier ${m.captureTier}</span>
                        </div>
                        <div class="stats-row" style="margin: 6px 0; font-size: 0.8rem;">
                            <div>❤️ HP: <strong>${m.maxHp}</strong></div>
                            <div>⚡ Vel: <strong>${m.speed}</strong></div>
                            <div class="weakness-tag">Weak +2: ${m.weakness}</div>
                        </div>
                        <button class="btn-action btn-action-primary" style="width: 100%; justify-content: center; font-size: 0.82rem; margin-top: 6px;"
                                onclick="UI.game.recoverMonsterFromDiscard(${idx})">
                            🕊️ Rescatar al Equipo
                        </button>
                    </div>
                `;
            }).join('');
        }

        modal.classList.add('open');
    },

    hideRecoverMonsterModal() {
        const modal = document.getElementById('modal-recover-monster');
        if (modal) modal.classList.remove('open');
    },

    showCityTravelModal(isFlyingAbility = false) {
        const modal = document.getElementById('modal-travel');
        if (!modal) return;

        const container = document.getElementById('travel-cities-list');
        const placedCityNodes = Object.values(this.game.cardMap.nodes).filter(n => n.cards.some(c => c.biome === 'city'));

        if (container) {
            container.innerHTML = placedCityNodes.map(node => {
                const cityCard = node.cards.find(c => c.biome === 'city') || node.card;
                return `
                    <div class="travel-city-card" onclick="UI.game.fastTravelToCity('${node.id}', ${isFlyingAbility})">
                        <div class="travel-city-icon">✈️</div>
                        <div>
                            <strong>${cityCard ? cityCard.name : node.name}</strong>
                            <div>${cityCard && cityCard.gym ? `Gimnasio de ${cityCard.gym.leaderName}` : 'Pueblo de Inicio'}</div>
                        </div>
                        <button class="btn-action-small">Volar Aquí</button>
                    </div>
                `;
            }).join('');
        }

        modal.classList.add('open');
    },

    hideCityTravelModal() {
        const modal = document.getElementById('modal-travel');
        if (modal) modal.classList.remove('open');
    },

    startCharacterDraft(rawPlayerConfigs) {
        this.draftConfigs = rawPlayerConfigs;
        this.draftIndex = 0;
        this.claimedCharacterIds = new Set();
        this.finalPlayerConfigs = [];
        this.renderCharacterDraftModal();
    },

    renderCharacterDraftModal() {
        const modal = document.getElementById('modal-character-draft');
        if (!modal) return;

        const currentP = this.draftConfigs[this.draftIndex];
        const nameEl = document.getElementById('draft-active-player-name');
        if (nameEl) {
            nameEl.textContent = currentP.name;
            nameEl.style.color = ['#ef4444', '#3b82f6', '#10b981', '#8b5cf6'][this.draftIndex % 4];
        }

        const grid = document.getElementById('character-draft-grid');
        if (grid) {
            grid.innerHTML = CHARACTERS_DATABASE.map(char => {
                const isClaimed = this.claimedCharacterIds.has(char.id);
                const claimedByPlayer = isClaimed ? this.finalPlayerConfigs.find(c => c.characterId === char.id) : null;
                const starterMon = MONSTERS_DATABASE.find(m => m.id === char.starterMonsterId);
                const startingItems = char.startingItemIds.map(id => ITEMS_DATABASE.find(i => i.id === id)?.name || id).join(', ');

                return `
                    <div class="character-draft-card ${isClaimed ? 'claimed' : ''}" 
                         style="border-top: 5px solid ${char.avatarColor};">
                        <div style="font-size: 2.2rem; text-align: center; margin-bottom: 2px;">${char.icon}</div>
                        <div style="font-weight: 800; font-size: 1.05rem; text-align: center; color: #fff;">${char.name}</div>
                        <div style="font-size: 0.75rem; color: #94a3b8; text-align: center; margin-bottom: 8px;">${char.title}</div>

                        <div class="draft-ability-box">
                            <div style="color: #fbbf24; font-weight: bold; font-size: 0.8rem;">✨ ${char.abilityName}</div>
                            <div style="font-size: 0.74rem; color: #e2e8f0; line-height: 1.35; margin-top: 2px;">${char.abilityDesc}</div>
                        </div>

                        <div style="font-size: 0.75rem; margin: 8px 0; color: #cbd5e1; display: flex; flex-direction: column; gap: 3px;">
                            <div>🪙 <strong>${char.startingCoins} Monedas</strong> | 🍀 <strong>${char.startingLuck} Suerte</strong></div>
                            <div>👾 <strong>Inicial:</strong> ${starterMon ? starterMon.name : 'Inicial'} (${starterMon ? starterMon.type : ''})</div>
                            <div style="color: #94a3b8; font-size: 0.7rem;">🎒 <strong>Objetos:</strong> ${startingItems}</div>
                        </div>

                        ${isClaimed ? `
                            <button class="btn-action" style="width: 100%; justify-content: center; background: #334155; border-color: #475569; opacity: 0.6; cursor: not-allowed;" disabled>
                                🔒 Elegido por ${claimedByPlayer ? claimedByPlayer.name : 'otro jugador'}
                            </button>
                        ` : `
                            <button class="btn-action btn-action-primary" style="width: 100%; justify-content: center; font-weight: bold;"
                                    onclick="UI.selectDraftCharacter('${char.id}')">
                                👑 Elegir este Personaje
                            </button>
                        `}
                    </div>
                `;
            }).join('');
        }

        modal.classList.add('open');
    },

    selectDraftCharacter(characterId) {
        if (this.claimedCharacterIds.has(characterId)) return;

        const currentP = this.draftConfigs[this.draftIndex];
        const charData = CHARACTERS_DATABASE.find(c => c.id === characterId);
        this.claimedCharacterIds.add(characterId);

        this.finalPlayerConfigs.push({
            name: currentP.name,
            characterId: characterId,
            starterMonsterId: charData.starterMonsterId
        });

        this.draftIndex++;
        if (this.draftIndex < this.draftConfigs.length) {
            this.renderCharacterDraftModal();
        } else {
            document.getElementById('modal-character-draft')?.classList.remove('open');
            this.finishCharacterDraft();
        }
    },

    finishCharacterDraft() {
        const game = this.game || window.gameInstance;
        game.initGame(this.finalPlayerConfigs);
        this.showCharacterWelcomeModal(game.players);
    },

    showCharacterWelcomeModal(players) {
        const modal = document.getElementById('modal-character-welcome');
        if (!modal) return;

        const container = document.getElementById('character-welcome-cards');
        if (container) {
            container.innerHTML = players.map(p => {
                const char = p.character;
                return `
                    <div class="character-draft-card" style="border-top: 5px solid ${char.avatarColor}; text-align: left;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <span style="font-size: 1.8rem;">${char.icon}</span>
                            <div>
                                <strong style="color: ${p.color}; font-size: 0.95rem;">${p.name}</strong>
                                <div style="font-size: 0.75rem; color: #94a3b8;">${char.name}</div>
                            </div>
                        </div>
                        <div class="draft-ability-box" style="margin-bottom: 6px;">
                            <div style="color: #fbbf24; font-weight: bold; font-size: 0.8rem;">✨ ${char.abilityName}</div>
                            <div style="font-size: 0.74rem; color: #e2e8f0; line-height: 1.35; margin-top: 2px;">${char.abilityDesc}</div>
                        </div>
                        <div style="font-size: 0.75rem; color: #94a3b8;">
                            🪙 ${p.coins} monedas | 🍀 ${p.luck} suerte
                        </div>
                    </div>
                `;
            }).join('');
        }

        modal.classList.add('open');
    },

    closeCharacterWelcomeModal() {
        document.getElementById('modal-character-welcome')?.classList.remove('open');
        this.renderAll();
    },

    showCombatBettingModal({ nonParticipants, contenders, onComplete }) {
        const modal = document.getElementById('modal-combat-betting');
        if (!modal) {
            if (onComplete) onComplete();
            return;
        }

        const headerEl = document.getElementById('betting-matchup-header');
        if (headerEl) {
            const c1 = contenders[0];
            const c2 = contenders[1];
            headerEl.innerHTML = `
                <div class="betting-contender-card" style="border-color: ${c1.color};">
                    <div style="font-size: 2.2rem; margin-bottom: 2px;">${c1.activeMonster ? c1.activeMonster.icon : '👾'}</div>
                    <div style="font-weight: 800; color: ${c1.color}; font-size: 1.05rem;">${c1.name}</div>
                    <div style="font-size: 0.78rem; color: #94a3b8;">${c1.activeMonster ? `${c1.activeMonster.name} (${c1.activeMonster.hp}/${c1.activeMonster.maxHp} HP)` : ''}</div>
                </div>
                <div class="betting-vs">VS</div>
                <div class="betting-contender-card" style="border-color: ${c2.color};">
                    <div style="font-size: 2.2rem; margin-bottom: 2px;">${c2.activeMonster ? c2.activeMonster.icon : '👾'}</div>
                    <div style="font-weight: 800; color: ${c2.color}; font-size: 1.05rem;">${c2.name}</div>
                    <div style="font-size: 0.78rem; color: #94a3b8;">${c2.activeMonster ? `${c2.activeMonster.name} (${c2.activeMonster.hp}/${c2.activeMonster.maxHp} HP)` : ''}</div>
                </div>
            `;
        }

        const container = document.getElementById('betting-players-container');
        const selections = {};

        const updateConfirmButtonState = () => {
            const btnConfirm = document.getElementById('btn-confirm-bets');
            if (!btnConfirm) return;
            const allSelected = nonParticipants.every(p => selections[p.id]);
            btnConfirm.disabled = !allSelected;
            if (allSelected) {
                btnConfirm.innerHTML = `⚔️ ¡Confirmar Predicciones y Luchar!`;
            } else {
                btnConfirm.innerHTML = `🗳️ Esperando votos (${Object.keys(selections).length}/${nonParticipants.length})`;
            }
        };

        if (container) {
            container.innerHTML = nonParticipants.map(bettor => {
                return `
                    <div class="betting-player-row" id="betting-row-${bettor.id}">
                        <div class="bettor-info">
                            <span class="bettor-name" style="color: ${bettor.color};">👤 ${bettor.name}</span>
                            <span class="bettor-luck">🍀 ${bettor.luck || 0} Suerte</span>
                        </div>
                        <div class="ballots-selection-row">
                            ${contenders.map(c => `
                                <button type="button" class="btn-ballot" id="ballot-${bettor.id}-${c.id}"
                                        style="--ballot-color: ${c.color};"
                                        onclick="UI.selectBetBallot('${bettor.id}', '${c.id}')">
                                    <span class="ballot-chip-icon" style="background: ${c.color};"></span>
                                    <span class="ballot-label">Papeleta: <strong>${c.name}</strong></span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                `;
            }).join('');
        }

        this.selectBetBallot = (bettorId, contenderId) => {
            selections[bettorId] = contenderId;
            contenders.forEach(c => {
                const btn = document.getElementById(`ballot-${bettorId}-${c.id}`);
                if (btn) {
                    btn.classList.toggle('selected', c.id === contenderId);
                }
            });
            updateConfirmButtonState();
        };

        const btnConfirm = document.getElementById('btn-confirm-bets');
        if (btnConfirm) {
            btnConfirm.onclick = () => {
                nonParticipants.forEach(bettor => {
                    const chosenId = selections[bettor.id];
                    if (chosenId) {
                        this.game.combatEngine.placeBet(bettor.id, chosenId);
                    }
                });
                modal.classList.remove('open');
                if (onComplete) onComplete();
            };
        }

        updateConfirmButtonState();
        modal.classList.add('open');
    },

    hideCombatBettingModal() {
        const modal = document.getElementById('modal-combat-betting');
        if (modal) modal.classList.remove('open');
    },

    showCombatModal() {
        const modal = document.getElementById('modal-combat');
        if (modal) modal.classList.add('open');
    },

    hideCombatModal() {
        const modal = document.getElementById('modal-combat');
        if (modal) modal.classList.remove('open');
    },

    renderCombatArena() {
        const combat = this.game.combatEngine;
        if (!combat.inCombat) return;

        const p1Mon = combat.getP1Active();
        const p2Mon = combat.getP2Active();
        if (!p1Mon || !p2Mon) return;

        // Player 1 Fighter
        const p1NameEl = document.getElementById('combat-p1-mon-name');
        if (p1NameEl) p1NameEl.textContent = `${p1Mon.name} (${p1Mon.type})`;

        const p1IconEl = document.getElementById('combat-p1-mon-icon');
        if (p1IconEl) p1IconEl.textContent = p1Mon.icon;

        const p1HpTextEl = document.getElementById('combat-p1-hp-text');
        if (p1HpTextEl) p1HpTextEl.textContent = `${p1Mon.hp} / ${p1Mon.maxHp} HP`;

        const p1HpBar = document.getElementById('combat-p1-hp-bar');
        if (p1HpBar) p1HpBar.style.width = `${(p1Mon.hp / p1Mon.maxHp) * 100}%`;

        const p1EffSpeed = (p1Mon.status === 'paralysis') ? 0 : p1Mon.speed;
        const p1SpeedEl = document.getElementById('combat-p1-speed');
        if (p1SpeedEl) p1SpeedEl.textContent = `Velocidad: ${p1EffSpeed} ⚡ ${p1Mon.status === 'paralysis' ? '(Parálisis 0)' : ''}`;

        const p1WeakEl = document.getElementById('combat-p1-weak');
        if (p1WeakEl) {
            let statusHtml = '';
            if (p1Mon.status === 'paralysis') statusHtml += '<span class="combat-status-badge status-paralysis">⚡ Parálisis</span> ';
            if (p1Mon.status === 'poison') statusHtml += '<span class="combat-status-badge status-poison">☠️ Veneno (-1 HP)</span> ';
            if (p1Mon.status === 'drowsy') statusHtml += '<span class="combat-status-badge status-drowsy">💤 Somnoliento (+1 Dmg)</span> ';
            if (p1Mon.shieldNextTurn > 0) statusHtml += `<span class="combat-status-badge status-shield">🛡️ Escudo (-${p1Mon.shieldNextTurn})</span> `;
            if (p1Mon.chargeNextTurn > 0) statusHtml += `<span class="combat-status-badge status-charge">⚡ Carga (+${p1Mon.chargeNextTurn})</span> `;
            if (p1Mon.isBlocking) statusHtml += `<span class="combat-status-badge status-shield" style="background: #10b981; color: #fff;">🛡️ Bloqueo Activo (+1 Prio)</span> `;

            p1WeakEl.innerHTML = `Weak +2: ${p1Mon.weakness} ${statusHtml ? `<div style="margin-top: 4px;">${statusHtml}</div>` : ''}`;
        }

        // Opponent Fighter
        const p2NameEl = document.getElementById('combat-p2-mon-name');
        if (p2NameEl) p2NameEl.textContent = `${p2Mon.name} (${p2Mon.type})`;

        const p2IconEl = document.getElementById('combat-p2-mon-icon');
        if (p2IconEl) p2IconEl.textContent = p2Mon.icon;

        const p2HpTextEl = document.getElementById('combat-p2-hp-text');
        if (p2HpTextEl) p2HpTextEl.textContent = `${p2Mon.hp} / ${p2Mon.maxHp} HP`;

        const p2HpBar = document.getElementById('combat-p2-hp-bar');
        if (p2HpBar) p2HpBar.style.width = `${(p2Mon.hp / p2Mon.maxHp) * 100}%`;

        const p2EffSpeed = (p2Mon.status === 'paralysis') ? 0 : p2Mon.speed;
        const p2SpeedEl = document.getElementById('combat-p2-speed');
        if (p2SpeedEl) p2SpeedEl.textContent = `Velocidad: ${p2EffSpeed} ⚡ ${p2Mon.status === 'paralysis' ? '(Parálisis 0)' : ''}`;

        const p2WeakEl = document.getElementById('combat-p2-weak');
        if (p2WeakEl) {
            let statusHtml = '';
            if (p2Mon.status === 'paralysis') statusHtml += '<span class="combat-status-badge status-paralysis">⚡ Parálisis</span> ';
            if (p2Mon.status === 'poison') statusHtml += '<span class="combat-status-badge status-poison">☠️ Veneno (-1 HP)</span> ';
            if (p2Mon.status === 'drowsy') statusHtml += '<span class="combat-status-badge status-drowsy">💤 Somnoliento (+1 Dmg)</span> ';
            if (p2Mon.shieldNextTurn > 0) statusHtml += `<span class="combat-status-badge status-shield">🛡️ Escudo (-${p2Mon.shieldNextTurn})</span> `;
            if (p2Mon.chargeNextTurn > 0) statusHtml += `<span class="combat-status-badge status-charge">⚡ Carga (+${p2Mon.chargeNextTurn})</span> `;
            if (p2Mon.isBlocking) statusHtml += `<span class="combat-status-badge status-shield" style="background: #10b981; color: #fff;">🛡️ Bloqueo Activo (+1 Prio)</span> `;

            p2WeakEl.innerHTML = `Weak +2: ${p2Mon.weakness} ${statusHtml ? `<div style="margin-top: 4px;">${statusHtml}</div>` : ''}`;
        }

        const fighterCards = document.querySelectorAll('.combat-fighter-card');
        if (fighterCards && fighterCards.length >= 2) {
            fighterCards[0].classList.toggle('active-attacker', combat.activeTurnActor === 1);
            fighterCards[1].classList.toggle('active-attacker', combat.activeTurnActor === 2);
        }

        const betsContainer = document.getElementById('combat-bets-bar');
        if (betsContainer) {
            if (combat.bets && combat.bets.length > 0) {
                betsContainer.style.display = 'flex';
                betsContainer.innerHTML = `
                    <span style="font-weight: 800; color: #fbbf24; font-size: 0.8rem;">🗳️ Predicciones:</span>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
                        ${combat.bets.map(b => `
                            <span class="combat-bet-badge" style="border-left: 3px solid ${b.ballotColor};">
                                <strong style="color: ${b.bettorColor};">${b.bettorName}</strong> ➡️ ${b.predictedWinnerName}
                            </span>
                        `).join('')}
                    </div>
                `;
            } else {
                betsContainer.style.display = 'none';
            }
        }

        const actionsContainer = document.getElementById('combat-actions-bar');
        if (actionsContainer) {
            const luckActive = combat.useLuckNextAttack;
            const isP1Turn = (combat.activeTurnActor === 1);
            const isP2Turn = (combat.activeTurnActor === 2);

            if (isP2Turn && !combat.player2) {
                actionsContainer.innerHTML = `
                    <div style="color: #fbbf24; font-weight: bold; padding: 10px 16px; background: rgba(0,0,0,0.4); border: 1px solid #d97706; border-radius: 8px; text-align: center; width: 100%;">
                        ⏳ Turno de ${combat.getOpponentDisplayName()}... eligiendo acción táctica.
                    </div>
                `;
                return;
            }

            const currentActorNum = isP1Turn ? 1 : 2;
            const currentActorPlayer = isP1Turn ? combat.player1 : combat.player2;
            const currentActorMon = isP1Turn ? p1Mon : p2Mon;
            const hand = (currentActorNum === 1) ? combat.p1CombatHand : combat.p2CombatHand;
            const discard = (currentActorNum === 1) ? combat.p1CombatDiscard : combat.p2CombatDiscard;

            const isReactionPhase = Boolean(combat.firstCommitment && !combat.secondCommitment);
            const leadLabel = isReactionPhase ? combat.getCardDisplayName(combat.firstCommitment.card, combat.firstCommitment.playerNum, combat.firstCommitment.attackIndex) : '';

            const hasAtk1 = hand.includes('attack_1');
            const hasAtk2 = hand.includes('attack_2');
            const hasSwitch = hand.includes('switch');
            const hasBlock = hand.includes('block');
            const canSwitch = combat.canPlayCard('switch', currentActorNum);

            const atk1 = currentActorMon.attacks[0];
            const atk2 = currentActorMon.attacks[1] || atk1;
            const hasThirdAtk = (currentActorMon.attacks.length >= 3);
            const atk3 = hasThirdAtk ? currentActorMon.attacks[2] : null;

            const atk1Dmg = atk1.effect === 'speed_damage' ? 'Vel' : (atk1.effect === 'fixed_damage' ? `${atk1.fixedDmg} Fijo` : `${atk1.baseDmg} dmg`);
            const atk2Dmg = atk2.effect === 'speed_damage' ? 'Vel' : (atk2.effect === 'fixed_damage' ? `${atk2.fixedDmg} Fijo` : `${atk2.baseDmg} dmg`);
            const atk3Dmg = atk3 ? (atk3.effect === 'speed_damage' ? 'Vel' : (atk3.effect === 'fixed_damage' ? `${atk3.fixedDmg} Fijo` : `${atk3.baseDmg} dmg`)) : '';

            let actionsHtml = `
                <div class="combat-hand-container">
                    <div class="combat-hand-status-banner">
                        ${isReactionPhase ? `
                            🛡️ ¡El rival jugó <strong style="color: #fbbf24;">${leadLabel}</strong>! 👉 <strong>${currentActorPlayer.name}</strong>, elige tu reacción:
                        ` : `
                            ⚡ <strong>${currentActorPlayer.name}</strong> tiene la iniciativa más veloz. Juega tu carta de acción:
                        `}
                    </div>

                    <div style="display: flex; gap: 12px; align-items: center; justify-content: space-between; width: 100%; flex-wrap: wrap;">
                        <button class="btn-combat-attack" style="background: ${luckActive ? '#10b981' : '#374151'}; border-color: #34d399; font-size: 0.78rem; padding: 6px 12px;"
                                onclick="UI.game.combatEngine.toggleLuckBoost()" ${combat.isProcessing ? 'disabled' : ''}>
                            🍀 Relanzar con Suerte: ${luckActive ? 'ACTIVADO' : 'INACTIVO'} (${currentActorPlayer.luck || 0} 🍀)
                        </button>

                        <div style="font-size: 0.75rem; color: #94a3b8;">
                            🃏 <strong>Mano:</strong> ${hand.length}/4 cartas <span style="color: #cbd5e1;">(se recicla al quedar 1)</span>
                            ${discard.length > 0 ? `| 🗑️ Descarte: ${discard.length}` : ''}
                        </div>
                    </div>

                    <div class="combat-hand-cards-grid">
                        <div class="combat-action-card card-attack-1 ${!hasAtk1 ? 'discarded' : ''}"
                             onclick="${hasAtk1 && !combat.isProcessing ? `UI.playCombatCard('attack_1', 0, ${currentActorNum})` : ''}">
                            <div class="combat-card-badge" style="background: #ef4444; color: #fff;">⚔️ Ataque 1</div>
                            <div class="combat-card-title">${atk1.name}</div>
                            <div style="color: #38bdf8; font-weight: bold; font-size: 0.75rem;">💥 ${atk1Dmg} (${atk1.type})</div>
                            ${atk1.desc ? `<div class="combat-card-detail">${atk1.desc}</div>` : ''}
                            ${!hasAtk1 ? `<div style="color: #94a3b8; font-size: 0.7rem; margin-top: auto; font-weight: bold;">🗑️ Descartada</div>` : ''}
                        </div>

                        <div class="combat-action-card card-attack-2 ${!hasAtk2 ? 'discarded' : ''}"
                             onclick="${hasAtk2 && !hasThirdAtk && !combat.isProcessing ? `UI.playCombatCard('attack_2', 1, ${currentActorNum})` : ''}">
                            <div class="combat-card-badge" style="background: #dc2626; color: #fff;">💥 Ataque 2</div>
                            <div class="combat-card-title">${atk2.name}</div>
                            <div style="color: #38bdf8; font-weight: bold; font-size: 0.75rem;">💥 ${atk2Dmg} (${atk2.type})</div>
                            ${atk2.desc ? `<div class="combat-card-detail">${atk2.desc}</div>` : ''}
                            ${hasThirdAtk && hasAtk2 ? `
                                <div style="display: flex; gap: 4px; margin-top: auto; width: 100%;">
                                    <button class="btn-action" style="flex: 1; padding: 3px; font-size: 0.65rem;" onclick="event.stopPropagation(); UI.playCombatCard('attack_2', 1, ${currentActorNum})">Mov 2</button>
                                    <button class="btn-action" style="flex: 1; padding: 3px; font-size: 0.65rem;" onclick="event.stopPropagation(); UI.playCombatCard('attack_2', 2, ${currentActorNum})">Mov 3: ${atk3.name}</button>
                                </div>
                            ` : ''}
                            ${!hasAtk2 ? `<div style="color: #94a3b8; font-size: 0.7rem; margin-top: auto; font-weight: bold;">🗑️ Descartada</div>` : ''}
                        </div>

                        <div class="combat-action-card card-switch ${!hasSwitch ? 'discarded' : (!canSwitch ? 'disabled' : '')}"
                             onclick="${hasSwitch && canSwitch && !combat.isProcessing ? `UI.promptCombatCardSwitch(${currentActorNum})` : ''}">
                            <div class="combat-card-badge" style="background: #3b82f6; color: #fff;">🔄 Prioridad +1</div>
                            <div class="combat-card-title">Cambio</div>
                            <div class="combat-card-detail">Retira a tu criatura y envía a un compañero antes de los ataques.</div>
                            ${!hasSwitch ? `<div style="color: #94a3b8; font-size: 0.7rem; margin-top: auto; font-weight: bold;">🗑️ Descartada</div>` : (!canSwitch ? `<div style="color: #ef4444; font-size: 0.68rem; margin-top: auto;">Sin banca viva</div>` : '')}
                        </div>

                        <div class="combat-action-card card-block ${!hasBlock ? 'discarded' : ''}"
                             onclick="${hasBlock && !combat.isProcessing ? `UI.playCombatCard('block', 0, ${currentActorNum})` : ''}">
                            <div class="combat-card-badge" style="background: #10b981; color: #fff;">🛡️ Prioridad +1</div>
                            <div class="combat-card-title">Bloqueo y Contra</div>
                            <div class="combat-card-detail">Absorbe 3 de daño del ataque rival y contraataca infligiendo 3 de daño.</div>
                            ${!hasBlock ? `<div style="color: #94a3b8; font-size: 0.7rem; margin-top: auto; font-weight: bold;">🗑️ Descartada</div>` : ''}
                        </div>
                    </div>
                </div>
            `;

            actionsContainer.innerHTML = actionsHtml;
        }
    },

    playCombatCard(card, attackIndex = 0, playerNum = 1) {
        if (!this.game || !this.game.combatEngine) return;
        this.game.combatEngine.commitCombatCard(card, { playerNum, attackIndex });
    },

    promptCombatCardSwitch(playerNum = 1) {
        const combat = this.game.combatEngine;
        const team = (playerNum === 1) ? combat.p1Team : combat.p2Team;
        const activeIdx = (playerNum === 1) ? combat.p1ActiveIndex : combat.p2ActiveIndex;
        let msg = `Selecciona a qué criatura deseas cambiar:\n(🔄 El cambio ocurre con prioridad antes de los ataques)\n`;
        team.forEach((m, idx) => {
            msg += `${idx + 1}. ${m.name} - ${m.hp}/${m.maxHp} HP ${idx === activeIdx ? '(Activo)' : ''} ${m.hp <= 0 ? '(Debilitado)' : ''}\n`;
        });

        const choice = prompt(msg, '2');
        if (choice) {
            const idx = parseInt(choice, 10) - 1;
            if (idx >= 0 && idx < team.length && idx !== activeIdx && team[idx].hp > 0) {
                combat.commitCombatCard('switch', { playerNum, targetSwitchIndex: idx });
            }
        }
    },

    promptCombatSwitch(playerNum = 1) {
        return this.promptCombatCardSwitch(playerNum);
    },

    promptPivotSwitch() {
        const combat = this.game.combatEngine;
        let msg = `🔄 ¡Cambio Táctico Disponible!\nSelecciona el monstruo al que deseas cambiar sin recibir penalización:\n`;
        combat.p1Team.forEach((m, idx) => {
            msg += `${idx + 1}. ${m.name} - ${m.hp}/${m.maxHp} HP ${idx === combat.p1ActiveIndex ? '(Activo)' : ''} ${m.hp <= 0 ? '(Debilitado)' : ''}\n`;
        });

        const choice = prompt(msg, '2');
        if (choice) {
            const idx = parseInt(choice, 10) - 1;
            if (idx >= 0 && idx < combat.p1Team.length) {
                combat.playerPivotSwitch(idx);
            }
        }
    },

    updateCombatLog(msg) {
        const logBox = document.getElementById('combat-log-stream');
        if (logBox) {
            const p = document.createElement('div');
            p.className = 'combat-log-entry';
            p.innerHTML = msg;
            logBox.appendChild(p);
            logBox.scrollTop = logBox.scrollHeight;
        }
    },

    showCombatResultModal({ won, coins, badge, moveTeaching, bets, onContinue }) {
        const resultModal = document.getElementById('modal-combat-result');
        if (!resultModal) return;

        const titleEl = document.getElementById('result-title');
        if (titleEl) titleEl.textContent = won ? '🎉 ¡VICTORIA EN COMBATE!' : '💥 DERROTA EN COMBATE';

        const bodyEl = document.getElementById('result-body');
        if (bodyEl) {
            let html = `
                <p><strong>Recompensa en dinero:</strong> +${coins} monedas de oro ${!won ? '(¡Regla 14: otorgadas aun perdiendo!)' : ''}</p>
                <p>🌿 Todos tus monstruos han descansado y recuperado el 100% de su salud.</p>
            `;

            if (bets && bets.length > 0) {
                html += `
                    <div class="result-bets-box" style="background: rgba(0,0,0,0.3); border: 1.5px solid #374151; border-radius: 8px; padding: 12px; margin-top: 10px; text-align: left;">
                        <div style="font-weight: 800; color: #fbbf24; margin-bottom: 6px; font-size: 0.9rem;">
                            🗳️ Resultado de las Apuestas de Espectadores:
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 6px;">
                            ${bets.map(b => {
                                const bColor = b.bettorColor || '#38bdf8';
                                const ballotColor = b.ballotColor || '#fbbf24';
                                return `
                                    <div style="display: flex; justify-content: space-between; align-items: center; background: ${b.won ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.1)'}; border: 1px solid ${b.won ? '#10b981' : '#475569'}; padding: 6px 10px; border-radius: 6px; font-size: 0.82rem;">
                                        <div>
                                            <strong style="color: ${bColor};">${b.bettorName}</strong> predijo: <span style="color: ${ballotColor}; font-weight: bold;">${b.predictedWinnerName}</span>
                                        </div>
                                        <div>
                                            ${b.won ? '<span style="color: #34d399; font-weight: 800;">✅ ¡Acertó! (+1 🍀)</span>' : '<span style="color: #94a3b8;">❌ No acertó (0 🍀)</span>'}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }

            if (badge && badge.badgeName) {
                html += `
                    <div class="result-badge-highlight" style="background: rgba(251, 191, 36, 0.15); border: 1px solid #fbbf24; padding: 12px; border-radius: 8px; margin-top: 10px;">
                        <h3 style="color: #fbbf24; margin-bottom: 4px; font-size: 1.05rem;">🏅 ¡Nueva Medalla Obtenida: ${badge.badgeName}!</h3>
                        <p>${badge.badgeIcon || '🏅'} Has superado el ${badge.name || 'Gimnasio'} (Tier ${badge.tier || 1}).</p>
                        <p>🍀 Recompensa adicional: +${badge.rewardLuck || 1} Suerte.</p>
                    </div>
                `;
            }

            if (moveTeaching && moveTeaching.attack && moveTeaching.attack.name) {
                html += `
                    <div class="result-move-teaching" style="margin-top: 10px;">
                        <h4 style="color: #38bdf8; font-size: 1rem; margin-bottom: 4px;">📖 ¡Enseñanza de Ataque Desbloqueada!</h4>
                        <p>Has derrotado a <strong>${moveTeaching.monsterName}</strong>. Puedes enseñarle su técnica <strong>${moveTeaching.attack.name}</strong> a una de tus criaturas:</p>
                        <button class="btn-action btn-action-primary" style="margin: 8px auto 0 auto; width: 100%; justify-content: center;" onclick="UI.promptTeachDefeatedMove()">📖 Enseñar Ataque Ahora</button>
                    </div>
                `;
            }

            bodyEl.innerHTML = html;
        }

        const btnContinue = document.getElementById('btn-result-continue');
        if (btnContinue) {
            btnContinue.onclick = () => {
                resultModal.classList.remove('open');
                this.hideTeachAttackModal();
                if (onContinue) onContinue();
            };
        }

        resultModal.classList.add('open');
    },

    promptTeachDefeatedMove() {
        const combat = this.game.combatEngine;
        if (!combat.pendingMoveTeaching) return;
        const move = combat.pendingMoveTeaching.attack;
        const opponentName = combat.pendingMoveTeaching.monsterName || 'Rival derrotado';
        const recipientPlayer = combat.pendingMoveTeaching.recipientPlayer || combat.player1;

        this.showTeachAttackModal({
            source: 'combat',
            attack: move,
            sourceName: `${opponentName} (Derrotado en Combate)`,
            recipientPlayer
        });
    },

    // Tournament Modal (Rule 28)
    showTournamentModal() {
        const modal = document.getElementById('modal-tournament');
        if (modal) modal.classList.add('open');
    },

    hideTournamentModal() {
        const modal = document.getElementById('modal-tournament');
        if (modal) modal.classList.remove('open');
    },

    renderTournamentBracket() {
        const tourney = this.game.tournamentEngine;
        const container = document.getElementById('tournament-bracket-view');
        if (!container) return;

        let html = `
            <div class="tournament-header">
                <h2>🏆 Gran Torneo de Campeones</h2>
                <p>Formato activo: <strong>${tourney.format.toUpperCase()}</strong></p>
            </div>
            <div class="tournament-matches-list" style="display: flex; flex-direction: column; gap: 10px; margin-top: 14px;">
        `;

        tourney.matches.forEach((m, idx) => {
            const isCurrent = (idx === tourney.currentMatchIndex && !m.winner);
            const p1Label = m.p1 ? m.p1.name : 'Por definir';
            const p2Label = m.isNpc ? m.npcName : (m.p2 ? m.p2.name : 'Por definir');

            html += `
                <div class="tournament-match-card ${isCurrent ? 'current-active-match' : ''} ${m.winner ? 'finished' : ''}" 
                     style="background: #1e242d; border: 1.5px solid ${isCurrent ? '#fbbf24' : '#374151'}; padding: 12px; border-radius: 8px;">
                    <div class="match-name" style="font-weight: bold; color: #94a3b8; font-size: 0.8rem;">${m.name}</div>
                    <div class="match-combatants" style="display: flex; justify-content: space-between; align-items: center; margin: 8px 0;">
                        <span class="combatant ${m.winner === p1Label ? 'winner-combatant' : ''}" style="font-weight: bold;">${p1Label}</span>
                        <span class="vs-badge" style="color: #ef4444; font-weight: 800;">VS</span>
                        <span class="combatant ${m.winner === p2Label ? 'winner-combatant' : ''}" style="font-weight: bold;">${p2Label}</span>
                    </div>
                    ${m.winner ? `
                        <div class="match-winner-tag" style="color: #10b981; font-weight: bold;">Ganador: <strong>${m.winner}</strong> 🏆</div>
                    ` : isCurrent ? `
                        <button class="btn-play-match" style="background: linear-gradient(180deg, #dc2626, #b91c1c); color: #fff; border: 1px solid #f87171; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-weight: bold;"
                                onclick="UI.game.tournamentEngine.playCurrentMatch()">⚔️ Pelear este Combate</button>
                    ` : `
                        <div class="match-pending" style="color: #64748b; font-size: 0.8rem;">Pendiente</div>
                    `}
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    },

    showVictoryModal(winner) {
        const modal = document.getElementById('modal-victory');
        if (!modal) return;

        const nameEl = document.getElementById('victory-champion-name');
        if (nameEl) nameEl.textContent = winner ? winner.name : 'El Campeón';

        modal.classList.add('open');
    },

    showRulesModal() {
        const modal = document.getElementById('modal-rules');
        if (modal) modal.classList.add('open');
    },

    hideRulesModal() {
        const modal = document.getElementById('modal-rules');
        if (modal) modal.classList.remove('open');
    },

    // ========================================================
    // CODEX / COMPENDIO WINDOW (Requirement 3)
    // ========================================================
    showCodexModal() {
        const modal = document.getElementById('modal-codex');
        if (!modal) return;
        this.renderCodex();
        modal.classList.add('open');
    },

    hideCodexModal() {
        const modal = document.getElementById('modal-codex');
        if (modal) modal.classList.remove('open');
    },

    setCodexTab(tabName) {
        this.codexActiveTab = tabName;
        this.codexFilter = 'all';
        this.renderCodex();
    },

    setCodexFilter(filter) {
        this.codexFilter = filter;
        this.renderCodex();
    },

    onCodexSearch(query) {
        this.codexSearchQuery = (query || '').trim().toLowerCase();
        this.renderCodex();
    },

    renderCodex() {
        // Highlight active tab
        document.querySelectorAll('.codex-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === this.codexActiveTab);
        });

        const filterContainer = document.getElementById('codex-filter-chips');
        const contentContainer = document.getElementById('codex-content-grid');
        if (!contentContainer) return;

        const q = this.codexSearchQuery;

        if (this.codexActiveTab === 'monsters') {
            if (filterContainer) {
                filterContainer.innerHTML = `
                    <button class="codex-chip ${this.codexFilter === 'all' ? 'active' : ''}" onclick="UI.setCodexFilter('all')">Todos (50)</button>
                    <button class="codex-chip ${this.codexFilter === 'forest' ? 'active' : ''}" onclick="UI.setCodexFilter('forest')">🌲 Bosque</button>
                    <button class="codex-chip ${this.codexFilter === 'mountain' ? 'active' : ''}" onclick="UI.setCodexFilter('mountain')">⛰️ Montaña</button>
                    <button class="codex-chip ${this.codexFilter === 'plains' ? 'active' : ''}" onclick="UI.setCodexFilter('plains')">🌾 Pradera</button>
                    <button class="codex-chip ${this.codexFilter === 'freshwater' ? 'active' : ''}" onclick="UI.setCodexFilter('freshwater')">💧 Dulce</button>
                    <button class="codex-chip ${this.codexFilter === 'saltwater' ? 'active' : ''}" onclick="UI.setCodexFilter('saltwater')">🌊 Salada</button>
                    <button class="codex-chip ${this.codexFilter === 't3' ? 'active' : ''}" onclick="UI.setCodexFilter('t3')">Tier 3 (20)</button>
                    <button class="codex-chip ${this.codexFilter === 't4' ? 'active' : ''}" onclick="UI.setCodexFilter('t4')">👑 Legendarios T4 (10)</button>
                `;
            }

            let filtered = MONSTERS_DATABASE;
            if (this.codexFilter === 't3') {
                filtered = filtered.filter(m => m.captureTier === 3);
            } else if (this.codexFilter === 't4') {
                filtered = filtered.filter(m => m.captureTier === 4);
            } else if (this.codexFilter !== 'all') {
                filtered = filtered.filter(m => m.biome === this.codexFilter);
            }

            if (q) {
                filtered = filtered.filter(m => 
                    m.name.toLowerCase().includes(q) || 
                    m.type.toLowerCase().includes(q) || 
                    m.weakness.toLowerCase().includes(q) ||
                    m.attacks.some(a => a.name.toLowerCase().includes(q))
                );
            }

            contentContainer.innerHTML = filtered.map(m => {
                const typeColor = TYPE_COLORS[m.type] || '#4caf50';
                const biome = BIOMES[m.biome] || BIOMES.forest;
                return `
                    <div class="codex-mon-card" style="border-top: 4px solid ${typeColor};">
                        <div class="monster-header">
                            <div class="monster-avatar" style="border-color: ${typeColor};">${m.icon}</div>
                            <div class="monster-titles">
                                <div class="monster-name">${m.name}</div>
                                <span class="type-pill" style="background: ${typeColor};">${m.type}</span>
                                <span style="font-size: 0.7rem; color: #94a3b8; margin-left: 4px;">${biome.icon} ${biome.name}</span>
                            </div>
                            <span class="tier-pill">Tier ${m.captureTier}</span>
                        </div>
                        <div class="stats-row" style="margin: 4px 0;">
                            <div>❤️ HP: <strong>${m.hp}</strong></div>
                            <div>⚡ Vel: <strong>${m.speed}</strong></div>
                            <div class="weakness-tag">Weak +2: ${m.weakness}</div>
                        </div>
                        <div class="attacks-section">
                            <div class="section-title">Ataques:</div>
                            ${m.attacks.map(atk => `
                                <div class="attack-item">
                                    <span class="atk-name">${atk.name} (${atk.type}):</span>
                                    <span class="atk-math">${atk.baseDmg} daño</span>
                                </div>
                            `).join('')}
                        </div>
                        ${m.overworldAbility ? `
                            <div style="font-size: 0.72rem; background: rgba(124, 58, 237, 0.15); border: 1px solid rgba(168, 85, 247, 0.4); padding: 4px 6px; border-radius: 4px; color: #d8b4fe;">
                                ✨ <strong>${m.overworldAbility.name}:</strong> ${m.overworldAbility.desc}
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');

        } else if (this.codexActiveTab === 'attacks') {
            if (filterContainer) {
                filterContainer.innerHTML = `
                    <button class="codex-chip ${this.codexFilter === 'all' ? 'active' : ''}" onclick="UI.setCodexFilter('all')">Todos</button>
                    <button class="codex-chip ${this.codexFilter === 'Planta' ? 'active' : ''}" onclick="UI.setCodexFilter('Planta')">Planta</button>
                    <button class="codex-chip ${this.codexFilter === 'Fuego' ? 'active' : ''}" onclick="UI.setCodexFilter('Fuego')">Fuego</button>
                    <button class="codex-chip ${this.codexFilter === 'Agua' ? 'active' : ''}" onclick="UI.setCodexFilter('Agua')">Agua</button>
                    <button class="codex-chip ${this.codexFilter === 'Eléctrico' ? 'active' : ''}" onclick="UI.setCodexFilter('Eléctrico')">Eléctrico</button>
                    <button class="codex-chip ${this.codexFilter === 'Tierra' ? 'active' : ''}" onclick="UI.setCodexFilter('Tierra')">Tierra</button>
                    <button class="codex-chip ${this.codexFilter === 'Volador' ? 'active' : ''}" onclick="UI.setCodexFilter('Volador')">Volador</button>
                    <button class="codex-chip ${this.codexFilter === 'Roca' ? 'active' : ''}" onclick="UI.setCodexFilter('Roca')">Roca</button>
                    <button class="codex-chip ${this.codexFilter === 'Bicho' ? 'active' : ''}" onclick="UI.setCodexFilter('Bicho')">Bicho</button>
                    <button class="codex-chip ${this.codexFilter === 'Dragón' ? 'active' : ''}" onclick="UI.setCodexFilter('Dragón')">Dragón</button>
                    <button class="codex-chip ${this.codexFilter === 'Hielo' ? 'active' : ''}" onclick="UI.setCodexFilter('Hielo')">Hielo</button>
                `;
            }

            // Extract all unique attacks
            const attacksMap = {};
            MONSTERS_DATABASE.forEach(m => {
                m.attacks.forEach(atk => {
                    if (!attacksMap[atk.name]) {
                        attacksMap[atk.name] = { ...atk, learners: [] };
                    }
                    if (!attacksMap[atk.name].learners.includes(m.name)) {
                        attacksMap[atk.name].learners.push(m.name);
                    }
                });
            });

            const ancestralPool = (typeof ANCESTRAL_ATTACKS !== 'undefined' ? ANCESTRAL_ATTACKS : window.ANCESTRAL_ATTACKS) || [];
            ancestralPool.forEach(atk => {
                if (!attacksMap[atk.name]) {
                    attacksMap[atk.name] = { ...atk, learners: ['Enseñanza Ancestral'] };
                }
            });

            let attacksList = Object.values(attacksMap);
            if (this.codexFilter !== 'all') {
                attacksList = attacksList.filter(a => a.type === this.codexFilter);
            }
            if (q) {
                attacksList = attacksList.filter(a => 
                    a.name.toLowerCase().includes(q) || 
                    a.type.toLowerCase().includes(q) ||
                    a.learners.some(l => l.toLowerCase().includes(q))
                );
            }

            contentContainer.innerHTML = attacksList.map(a => {
                const typeColor = TYPE_COLORS[a.type] || '#3b82f6';
                return `
                    <div class="codex-attack-card" style="border-left: 4px solid ${typeColor};">
                        <div class="codex-attack-header">
                            <span class="codex-attack-name">${a.name}</span>
                            <span class="type-pill" style="background: ${typeColor};">${a.type}</span>
                        </div>
                        <div class="codex-attack-meta">
                            💥 Daño: <strong>${a.effect === 'speed_damage' ? 'Igual a Velocidad' : a.effect === 'fixed_damage' ? `${a.fixedDmg} Fijo` : `${a.baseDmg} Base`}</strong> ${a.diceCount ? `(+${a.diceCount} dado${a.diceCount > 1 ? 's' : ''})` : ''}
                            ${a.desc ? `<div style="color: #fde047; font-size: 0.8rem; margin-top: 3px;">${a.desc}</div>` : ''}
                        </div>
                        <div class="codex-attack-learners">
                            <strong>Monstruos de origen:</strong> ${a.learners.join(', ')}
                        </div>
                    </div>
                `;
            }).join('');

        } else if (this.codexActiveTab === 'items') {
            if (filterContainer) {
                filterContainer.innerHTML = `
                    <button class="codex-chip ${this.codexFilter === 'all' ? 'active' : ''}" onclick="UI.setCodexFilter('all')">Todos (20)</button>
                    <button class="codex-chip ${this.codexFilter === 'combat' ? 'active' : ''}" onclick="UI.setCodexFilter('combat')">⚔️ Combate (11)</button>
                    <button class="codex-chip ${this.codexFilter === 'utility' ? 'active' : ''}" onclick="UI.setCodexFilter('utility')">🎒 Utilidad (9)</button>
                `;
            }

            let filteredItems = ITEMS_DATABASE;
            if (this.codexFilter !== 'all') {
                filteredItems = filteredItems.filter(i => i.category === this.codexFilter);
            }
            if (q) {
                filteredItems = filteredItems.filter(i => i.name.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q));
            }

            contentContainer.innerHTML = filteredItems.map(item => `
                <div class="inventory-card" style="background: #18202a;">
                    <div class="inv-top">
                        <span class="inv-icon">${item.icon}</span>
                        <span class="inv-cat tag-${item.category}">
                            ${item.category === 'combat' ? 'Combate' : 'Utilidad'}
                        </span>
                    </div>
                    <div class="inv-name">${item.name}</div>
                    <div class="inv-desc">${item.desc}</div>
                    <div style="margin-top: auto; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 800; color: #fbbf24; font-size: 0.85rem;">${item.cost} 🪙</span>
                    </div>
                </div>
            `).join('');

        } else if (this.codexActiveTab === 'areas') {
            if (filterContainer) {
                filterContainer.innerHTML = `
                    <button class="codex-chip ${this.codexFilter === 'all' ? 'active' : ''}" onclick="UI.setCodexFilter('all')">Todos (22)</button>
                    <button class="codex-chip ${this.codexFilter === 'city' ? 'active' : ''}" onclick="UI.setCodexFilter('city')">🏛️ Ciudades (4)</button>
                    <button class="codex-chip ${this.codexFilter === 'forest' ? 'active' : ''}" onclick="UI.setCodexFilter('forest')">🌲 Bosque</button>
                    <button class="codex-chip ${this.codexFilter === 'mountain' ? 'active' : ''}" onclick="UI.setCodexFilter('mountain')">⛰️ Montaña</button>
                    <button class="codex-chip ${this.codexFilter === 'plains' ? 'active' : ''}" onclick="UI.setCodexFilter('plains')">🌾 Pradera</button>
                    <button class="codex-chip ${this.codexFilter === 'freshwater' ? 'active' : ''}" onclick="UI.setCodexFilter('freshwater')">💧 Dulce</button>
                    <button class="codex-chip ${this.codexFilter === 'saltwater' ? 'active' : ''}" onclick="UI.setCodexFilter('saltwater')">🌊 Salada</button>
                `;
            }

            const allAreas = [
                ...CITIES_DATABASE,
                ...LOCATION_CARDS_DATABASE
            ];

            let filteredAreas = allAreas;
            if (this.codexFilter !== 'all') {
                filteredAreas = filteredAreas.filter(a => a.biome === this.codexFilter);
            }
            if (q) {
                filteredAreas = filteredAreas.filter(a => 
                    a.name.toLowerCase().includes(q) || 
                    (a.flavor && a.flavor.toLowerCase().includes(q)) ||
                    (a.locationAction && a.locationAction.name.toLowerCase().includes(q)) ||
                    (a.locationAction && a.locationAction.desc.toLowerCase().includes(q))
                );
            }

            contentContainer.innerHTML = filteredAreas.map(area => {
                const biome = BIOMES[area.biome] || BIOMES.city;
                return `
                    <div class="codex-area-card" style="border-color: ${biome.color};">
                        <div class="codex-area-banner" style="background: ${biome.color};">
                            <span>${biome.icon} ${biome.name}</span>
                            ${area.gym ? `<span style="background: #000; padding: 1px 6px; border-radius: 4px; color: #fbbf24;">Gimnasio T${area.gym.tier}</span>` : area.tier && area.tier > 1 ? `<span style="background: #9333ea; color: #fff; padding: 1px 6px; border-radius: 4px; font-weight: bold;">Área Tier ${area.tier}</span>` : ''}
                        </div>
                        <div class="codex-area-body">
                            <div style="font-size: 1.8rem; text-align: center;">${area.icon || biome.icon}</div>
                            <div style="font-weight: 800; font-size: 0.95rem; color: #fff; text-align: center;">${area.name}</div>
                            ${area.flavor ? `<div style="font-size: 0.72rem; color: #94a3b8; font-style: italic; text-align: center;">${area.flavor}</div>` : ''}
                            ${area.locationAction ? `
                                <div class="location-card-action-box" style="margin: 6px 0 0 0;">
                                    <strong>🔄 ${area.locationAction.name}</strong>
                                    ${area.locationAction.desc}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }
    },

    showNotification(title, message) {
        const toast = document.getElementById('toast-notification');
        if (!toast) return;

        toast.innerHTML = `<strong>${title}</strong><div>${message}</div>`;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    },

    logGame(msg) {
        const logBox = document.getElementById('game-event-log');
        if (logBox) {
            const div = document.createElement('div');
            div.className = 'game-log-line';
            div.innerHTML = `<span class="log-time">[R${this.game.currentRound}]</span> ${msg}`;
            logBox.appendChild(div);
            logBox.scrollTop = logBox.scrollHeight;
        }
    }
};

window.UI = UI;
