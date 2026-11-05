class CardMap {
    constructor() {
        this.nodes = {}; // Key: 'x,y' -> { x, y, card, poi, visitedBy: [] }
        this.initStartingBoard();
    }

    key(x, y) {
        return `${x},${y}`;
    }

    initStartingBoard() {
        this.nodes = {};
        // Place Starting Town at (0, 0)
        const startingTown = {
            id: 'loc_start_town',
            name: 'Pueblo de Inicio',
            biome: 'city',
            icon: '🏡',
            isStart: true,
            hasShop: true,
            flavor: 'Acogedora villa natal donde los aspirantes a campeones inician su odisea.',
            locationAction: {
                name: 'Descanso en Casa',
                type: 'special',
                desc: 'Cura por completo a todo tu equipo y recupera +1 Suerte 🍀 gratis.'
            }
        };

        this.nodes[this.key(0, 0)] = {
            x: 0,
            y: 0,
            card: startingTown,
            poi: null,
            visitedBy: []
        };
    }

    getNode(x, y) {
        return this.nodes[this.key(x, y)] || null;
    }

    hasCard(x, y) {
        return !!this.nodes[this.key(x, y)];
    }

    placeCard(x, y, cardData) {
        const k = this.key(x, y);
        if (this.nodes[k]) {
            throw new Error(`El casillero (${x}, ${y}) ya contiene una carta: ${this.nodes[k].card.name}`);
        }

        // 50% chance of Point of Interest if not a city
        let poi = null;
        if (cardData.biome !== 'city' && Math.random() < 0.5) {
            poi = this.generatePoi(cardData.biome);
        }

        this.nodes[k] = {
            x,
            y,
            card: cardData,
            poi,
            visitedBy: []
        };

        return this.nodes[k];
    }

    generatePoi(biome) {
        const poiTypes = [
            { type: 'item_cache', name: 'Alijo Oculto', icon: '🎁', desc: 'Encuentras un cofre con 3 Monedas 🪙 y 1 Suerte 🍀.' },
            { type: 'fountain', name: 'Fuente Sanadora', icon: '⛲', desc: 'Restaura todos los PS de tus monstruos debilitados.' },
            { type: 'trainer', name: 'Entrenador Errante', icon: '🤠', desc: 'Un retador te desafía a una batalla 1v1 rápida.' },
            { type: 'shrine', name: 'Altar Místico', icon: '🔮', desc: 'Otorga +2 puntos de Suerte 🍀 permanentes.' }
        ];
        const choice = poiTypes[Math.floor(Math.random() * poiTypes.length)];
        return { ...choice, claimed: false };
    }

    getOrthogonalNeighbors(x, y) {
        return [
            { x: x, y: y - 1, dir: 'Norte' },
            { x: x + 1, y: y, dir: 'Este' },
            { x: x, y: y + 1, dir: 'Sur' },
            { x: x - 1, y: y, dir: 'Oeste' }
        ];
    }

    getAdjacentPlacedCards(x, y) {
        const neighbors = this.getOrthogonalNeighbors(x, y);
        const placed = [];
        for (const n of neighbors) {
            const node = this.getNode(n.x, n.y);
            if (node) {
                placed.push({ ...n, node });
            }
        }
        return placed;
    }

    getAdjacentEmptySlots(x, y) {
        const neighbors = this.getOrthogonalNeighbors(x, y);
        const empties = [];
        for (const n of neighbors) {
            if (!this.hasCard(n.x, n.y)) {
                empties.push(n);
            }
        }
        return empties;
    }

    getAllEmptyBorderSlots() {
        // Find all empty slots that are adjacent to at least one placed card
        const borderMap = {};
        for (const key in this.nodes) {
            const node = this.nodes[key];
            const neighbors = this.getOrthogonalNeighbors(node.x, node.y);
            for (const n of neighbors) {
                const nKey = this.key(n.x, n.y);
                if (!this.nodes[nKey]) {
                    borderMap[nKey] = { x: n.x, y: n.y };
                }
            }
        }
        return Object.values(borderMap);
    }

    getAllNodes() {
        return Object.values(this.nodes);
    }

    getBoundingBox() {
        const nodes = this.getAllNodes();
        if (nodes.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const n of nodes) {
            if (n.x < minX) minX = n.x;
            if (n.x > maxX) maxX = n.x;
            if (n.y < minY) minY = n.y;
            if (n.y > maxY) maxY = n.y;
        }
        return { minX, maxX, minY, maxY };
    }
}

window.CardMap = CardMap;
