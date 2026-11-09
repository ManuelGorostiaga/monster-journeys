class CardMap {
    constructor() {
        this.nodes = {};
        this.initRegionMap();
    }

    createStartingTownCard(name, townId) {
        return {
            id: townId,
            name: name,
            biome: 'city',
            icon: '🏡',
            isStart: true,
            hasShop: true,
            locationAction: {
                name: 'Descanso en Casa',
                type: 'special',
                desc: 'Cura equipo al 100%, +1 🍀'
            }
        };
    }

    getCityCard(index) {
        const pool = (typeof CITIES_DATABASE !== 'undefined' ? CITIES_DATABASE : (typeof window !== 'undefined' ? window.CITIES_DATABASE : null)) || [];
        if (pool[index]) {
            const copy = JSON.parse(JSON.stringify(pool[index]));
            copy.isStart = true;
            copy.hasShop = true;
            return copy;
        }
        return {
            id: `city_${index + 1}`,
            name: `Ciudad ${index + 1}`,
            biome: 'city',
            isStart: true,
            hasShop: true
        };
    }

    initRegionMap() {
        this.nodes = {
            // --- CORNER 1: SOUTHWEST (Player 1 Start) ---
            node_sw: {
                id: 'node_sw',
                name: 'Ciudad Hoja',
                x: 250,
                y: 730,
                gridX: 0,
                gridY: 0,
                corner: 'SW',
                isStart: true,
                maxCards: 1,
                connections: ['node_w_cross', 'node_s_valley', 'node_w_route', 'node_sw_secret'],
                cards: [this.getCityCard(0)]
            },
            node_sw_secret: {
                id: 'node_sw_secret',
                name: 'Cueva Origen',
                x: 80,
                y: 730,
                gridX: -1,
                gridY: 0,
                corner: 'SW',
                maxCards: 1,
                connections: ['node_sw'],
                cards: []
            },

            // --- CORNER 2: NORTHEAST (Player 2 Start) ---
            node_ne: {
                id: 'node_ne',
                name: 'Ciudad Puerto',
                x: 1170,
                y: 250,
                gridX: 6,
                gridY: 6,
                corner: 'NE',
                isStart: true,
                maxCards: 1,
                connections: ['node_n_route', 'node_ne_plateau'],
                cards: [this.getCityCard(2)]
            },

            // --- CORNER 3: NORTHWEST (Player 3 Start) ---
            node_nw: {
                id: 'node_nw',
                name: 'Ciudad Pico',
                x: 250,
                y: 250,
                gridX: 0,
                gridY: 6,
                corner: 'NW',
                isStart: true,
                maxCards: 1,
                connections: ['node_n_route', 'node_nw_bay'],
                cards: [this.getCityCard(1)]
            },

            // --- CORNER 4: SOUTHEAST (Player 4 Start) ---
            node_se: {
                id: 'node_se',
                name: 'Ciudad Flama',
                x: 1170,
                y: 730,
                gridX: 6,
                gridY: 0,
                corner: 'SE',
                isStart: true,
                maxCards: 1,
                connections: ['node_se_cross', 'node_e_coast'],
                cards: [this.getCityCard(3)]
            },

            // --- 2-CARD HUBS / CROSSROADS ---
            node_w_cross: {
                id: 'node_w_cross',
                name: 'Encrucijada Poniente',
                x: 470,
                y: 570,
                gridX: 1,
                gridY: 0,
                maxCards: 2,
                connections: ['node_sw', 'node_nw_bay', 'node_s_valley', 'node_center_hub'],
                cards: []
            },
            node_center_hub: {
                id: 'node_center_hub',
                name: 'Gran Plaza Central',
                x: 720,
                y: 570,
                gridX: 3,
                gridY: 3,
                maxCards: 2,
                connections: ['node_w_cross', 'node_n_route', 'node_se_cross', 'node_ne_plateau'],
                cards: []
            },
            node_se_cross: {
                id: 'node_se_cross',
                name: 'Cruce del Alba',
                x: 970,
                y: 730,
                gridX: 4,
                gridY: 1,
                maxCards: 2,
                connections: ['node_s_valley', 'node_center_hub', 'node_se', 'node_e_coast'],
                cards: []
            },

            // --- STANDARD & DEAD-END ROUTES ---
            node_s_valley: {
                id: 'node_s_valley',
                name: 'Valle Rocoso',
                x: 470,
                y: 730,
                gridX: 1,
                gridY: 1,
                maxCards: 1,
                connections: ['node_sw', 'node_w_cross', 'node_s_abyss', 'node_se_cross'],
                cards: []
            },
            node_s_abyss: {
                id: 'node_s_abyss',
                name: 'Fosa Abisal',
                x: 470,
                y: 890,
                gridX: 2,
                gridY: -1,
                maxCards: 1,
                connections: ['node_s_valley'],
                cards: []
            },
            node_w_route: {
                id: 'node_w_route',
                name: 'Ruta Poniente',
                x: 250,
                y: 570,
                gridX: 0,
                gridY: 1,
                maxCards: 1,
                connections: ['node_sw', 'node_nw_bay'],
                cards: []
            },
            node_nw_bay: {
                id: 'node_nw_bay',
                name: 'Bahía Bruma',
                x: 250,
                y: 410,
                gridX: 1,
                gridY: 4,
                maxCards: 1,
                connections: ['node_nw', 'node_w_route', 'node_w_cross'],
                cards: []
            },
            node_n_route: {
                id: 'node_n_route',
                name: 'Ruta Septentrional',
                x: 720,
                y: 250,
                gridX: 3,
                gridY: 6,
                maxCards: 1,
                connections: ['node_nw', 'node_ne', 'node_n_peak', 'node_center_hub'],
                cards: []
            },
            node_n_peak: {
                id: 'node_n_peak',
                name: 'Pico Nevado',
                x: 720,
                y: 90,
                gridX: 4,
                gridY: 7,
                maxCards: 1,
                connections: ['node_n_route'],
                cards: []
            },
            node_ne_plateau: {
                id: 'node_ne_plateau',
                name: 'Meseta Oriental',
                x: 1170,
                y: 410,
                gridX: 5,
                gridY: 4,
                maxCards: 1,
                connections: ['node_center_hub', 'node_ne', 'node_e_coast'],
                cards: []
            },
            node_e_coast: {
                id: 'node_e_coast',
                name: 'Ruta Marina Este',
                x: 1170,
                y: 570,
                gridX: 6,
                gridY: 3,
                maxCards: 1,
                connections: ['node_se', 'node_se_cross', 'node_ne_plateau', 'node_e_reef'],
                cards: []
            },
            node_e_reef: {
                id: 'node_e_reef',
                name: 'Arrecife del Sol',
                x: 1320,
                y: 570,
                gridX: 7,
                gridY: 3,
                maxCards: 1,
                connections: ['node_e_coast'],
                cards: []
            }
        };

        // Attach dynamic card getter and keep mapX/mapY
        Object.values(this.nodes).forEach(node => {
            node.mapX = node.x;
            node.mapY = node.y;
            node.x = node.gridX;
            node.y = node.gridY;
            Object.defineProperty(node, 'card', {
                get() {
                    return this.cards[0] || null;
                },
                configurable: true
            });
            Object.defineProperty(node, 'poi', {
                get() {
                    return null;
                },
                configurable: true
            });
        });
    }

    initStartingBoard() {
        this.initRegionMap();
    }

    key(x, y) {
        return `${x},${y}`;
    }

    getNode(arg1, arg2) {
        if (typeof arg1 === 'string' && this.nodes[arg1]) {
            return this.nodes[arg1];
        }
        if (arg2 !== undefined) {
            return Object.values(this.nodes).find(n => n.gridX === arg1 && n.gridY === arg2) || null;
        }
        if (typeof arg1 === 'string' && arg1.includes(',')) {
            const [gx, gy] = arg1.split(',').map(Number);
            return Object.values(this.nodes).find(n => n.gridX === gx && n.gridY === gy) || null;
        }
        return Object.values(this.nodes).find(n => n.id === arg1) || null;
    }

    hasCard(x, y) {
        const node = this.getNode(x, y);
        return Boolean(node && node.cards.length > 0);
    }

    placeCard(x, y, cardData) {
        const node = this.getNode(x, y);
        if (!node) {
            throw new Error(`Casillero (${x}, ${y}) no existe en el mapa.`);
        }
        if (node.cards.length >= node.maxCards) {
            const cardName = node.card ? node.card.name : 'carta';
            throw new Error(`El casillero (${x}, ${y}) ya contiene el máximo de cartas (${node.maxCards}): ${cardName}`);
        }
        if (!cardData.usedByPlayerIds) cardData.usedByPlayerIds = [];
        node.cards.push(cardData);
        return node;
    }

    placeCardOnNode(nodeId, cardData) {
        const node = this.getNode(nodeId);
        if (!node) {
            throw new Error(`Nodo ${nodeId} no encontrado en el mapa.`);
        }
        if (node.cards.length >= node.maxCards) {
            throw new Error(`El nodo ${node.name} ya alcanzó su capacidad máxima de ${node.maxCards} cartas.`);
        }
        if (!cardData.usedByPlayerIds) cardData.usedByPlayerIds = [];
        node.cards.push(cardData);
        return node;
    }

    getConnectedNodes(nodeIdOrNode) {
        const node = typeof nodeIdOrNode === 'string' ? this.getNode(nodeIdOrNode) : nodeIdOrNode;
        if (!node) return [];
        return node.connections.map(id => this.getNode(id)).filter(Boolean);
    }

    getReachableNodes(startNodeId, maxSteps = 1) {
        const startNode = this.getNode(startNodeId);
        const reachableDiscovered = new Map();
        const reachableUndiscovered = new Map();

        if (!startNode || maxSteps <= 0) {
            return { reachableDiscovered, reachableUndiscovered };
        }

        const visitedMinSteps = new Map();
        visitedMinSteps.set(startNode.id, 0);

        const queue = [{ nodeId: startNode.id, steps: 0, path: [startNode.id] }];

        while (queue.length > 0) {
            const { nodeId, steps, path } = queue.shift();
            const curr = this.getNode(nodeId);
            if (!curr) continue;

            if (steps >= maxSteps) continue;

            for (const connId of curr.connections) {
                const nextNode = this.getNode(connId);
                if (!nextNode) continue;

                const nextSteps = steps + 1;
                const prevBest = visitedMinSteps.get(connId);

                if (nextNode.cards.length === 0) {
                    if (prevBest === undefined || nextSteps < prevBest) {
                        visitedMinSteps.set(connId, nextSteps);
                        reachableUndiscovered.set(connId, { node: nextNode, distance: nextSteps, path: [...path, connId] });
                    }
                } else {
                    if (prevBest === undefined || nextSteps < prevBest) {
                        visitedMinSteps.set(connId, nextSteps);
                        reachableDiscovered.set(connId, { node: nextNode, distance: nextSteps, path: [...path, connId] });
                        queue.push({ nodeId: connId, steps: nextSteps, path: [...path, connId] });
                    }
                }
            }
        }

        return { reachableDiscovered, reachableUndiscovered };
    }

    getAdjacentEmptySlots(x, y) {
        const node = this.getNode(x, y);
        if (!node) return [];
        const connected = this.getConnectedNodes(node);
        return connected
            .filter(n => n.cards.length < n.maxCards)
            .map(n => ({ x: n.gridX, y: n.gridY, nodeId: n.id, node: n }));
    }

    getAllEmptyBorderSlots() {
        const placed = Object.values(this.nodes).filter(n => n.cards.length > 0);
        const candidates = new Map();
        placed.forEach(pNode => {
            const connected = this.getConnectedNodes(pNode);
            connected.forEach(cNode => {
                if (cNode.cards.length < cNode.maxCards) {
                    candidates.set(cNode.id, {
                        x: cNode.gridX,
                        y: cNode.gridY,
                        nodeId: cNode.id,
                        node: cNode
                    });
                }
            });
        });
        return Array.from(candidates.values());
    }

    getAllNodes() {
        return Object.values(this.nodes);
    }

    getBoundingBox() {
        return { minX: 0, maxX: 7, minY: -1, maxY: 7 };
    }
}

window.CardMap = CardMap;
