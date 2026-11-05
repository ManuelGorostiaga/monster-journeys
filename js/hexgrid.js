const GRID_WIDTH = 18;
const GRID_HEIGHT = 12;
const HEX_RADIUS = 34; // Radius in pixels for rendering
const HEX_WIDTH = Math.sqrt(3) * HEX_RADIUS;
const HEX_HEIGHT = 2 * HEX_RADIUS;

function oddRToCube(col, row) {
    const q = col - Math.floor((row - (row & 1)) / 2);
    const r = row;
    const s = -q - r;
    return { q, r, s };
}

function hexDistance(x1, y1, x2, y2) {
    const a = oddRToCube(x1, y1);
    const b = oddRToCube(x2, y2);
    return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.s - b.s)) / 2;
}

function getHexNeighbors(col, row) {
    const isOdd = (row % 2 === 1);
    const deltas = isOdd ? [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: -1 },
        { dx: 0, dy: -1 },
        { dx: 1, dy: 1 },
        { dx: 0, dy: 1 }
    ] : [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: -1 },
        { dx: -1, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 1 }
    ];

    const neighbors = [];
    for (const d of deltas) {
        const nx = col + d.dx;
        const ny = row + d.dy;
        if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT) {
            neighbors.push({ x: nx, y: ny });
        }
    }
    return neighbors;
}

function getHexCenter(col, row) {
    const cx = col * HEX_WIDTH + (row % 2 === 1 ? HEX_WIDTH / 2 : 0) + HEX_WIDTH / 2 + 20;
    const cy = row * (HEX_HEIGHT * 0.75) + HEX_RADIUS + 20;
    return { x: cx, y: cy };
}

function getHexPolygonPoints(centerX, centerY, radius = HEX_RADIUS) {
    const points = [];
    for (let i = 0; i < 6; i++) {
        // Pointy topped hex: angles are 30, 90, 150, 210, 270, 330 deg
        const angleDeg = 60 * i + 30;
        const angleRad = (Math.PI / 180) * angleDeg;
        const px = centerX + radius * Math.cos(angleRad);
        const py = centerY + radius * Math.sin(angleRad);
        points.push(`${px.toFixed(1)},${py.toFixed(1)}`);
    }
    return points.join(' ');
}

class HexMap {
    constructor() {
        this.width = GRID_WIDTH;
        this.height = GRID_HEIGHT;
        this.nodes = [];
        this.generateMap();
    }

    generateMap() {
        this.nodes = [];
        for (let y = 0; y < this.height; y++) {
            this.nodes[y] = [];
            for (let x = 0; x < this.width; x++) {
                let biome = 'plains';

                // Outer border is surrounded by Saltwater
                if (x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1) {
                    biome = 'saltwater';
                } else if (x === 1 || x === this.width - 2 || y === 1 || y === this.height - 2) {
                    // Coastal transition: mostly saltwater or freshwater bays
                    if (Math.random() < 0.45) {
                        biome = 'saltwater';
                    } else if (Math.random() < 0.3) {
                        biome = 'freshwater';
                    } else if (x < 8 && y < 6) {
                        biome = 'forest';
                    } else if (x > 9 && y < 6) {
                        biome = 'mountain';
                    } else {
                        biome = 'plains';
                    }
                } else {
                    // Interior Island biomes
                    // Northwest quadrant: Forest heavy
                    if (x < 9 && y < 6) {
                        const r = Math.random();
                        if (r < 0.65) biome = 'forest';
                        else if (r < 0.85) biome = 'freshwater';
                        else biome = 'plains';
                    }
                    // Northeast quadrant: Mountain heavy
                    else if (x >= 9 && y < 6) {
                        const r = Math.random();
                        if (r < 0.65) biome = 'mountain';
                        else if (r < 0.85) biome = 'plains';
                        else biome = 'forest';
                    }
                    // Southwest quadrant: Freshwater river & delta, plains
                    else if (x < 9 && y >= 6) {
                        const r = Math.random();
                        if (r < 0.5) biome = 'freshwater';
                        else if (r < 0.8) biome = 'plains';
                        else biome = 'forest';
                    }
                    // Southeast quadrant: Plains & Volcanic foothills
                    else {
                        const r = Math.random();
                        if (r < 0.55) biome = 'plains';
                        else if (r < 0.8) biome = 'mountain';
                        else biome = 'freshwater';
                    }
                }

                this.nodes[y][x] = {
                    x,
                    y,
                    biome,
                    city: null,
                    gym: null,
                    poi: null
                };
            }
        }

        // Place the 4 Cities & Gyms at verified coordinates (all distance >= 7)
        GYMS_DATABASE.forEach(gym => {
            const node = this.nodes[gym.hexY][gym.hexX];
            node.city = gym.cityName;
            node.gym = gym;
            // Ensure city biome is accessible land
            if (gym.id === 'gym_1') node.biome = 'forest';
            if (gym.id === 'gym_2') node.biome = 'mountain';
            if (gym.id === 'gym_3') node.biome = 'freshwater';
            if (gym.id === 'gym_4') node.biome = 'plains';
        });

        // Rule 12: In 50% of the nodes there are Points of Interest (POIs) that can be visited.
        // Total nodes = 18 * 12 = 216. Target = 108 POIs.
        const allCandidates = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const node = this.nodes[y][x];
                if (!node.city) {
                    allCandidates.push(node);
                }
            }
        }

        // Shuffle candidates and pick exactly 50% of total map nodes (108 POIs)
        allCandidates.sort(() => Math.random() - 0.5);
        const targetPoiCount = Math.floor((this.width * this.height) * 0.50);

        for (let i = 0; i < targetPoiCount && i < allCandidates.length; i++) {
            const poiType = POI_TYPES[i % POI_TYPES.length];
            allCandidates[i].poi = {
                id: poiType.id,
                name: poiType.name,
                icon: poiType.icon,
                desc: poiType.desc,
                claimedBy: []
            };
        }
    }

    getNode(x, y) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.nodes[y][x];
        }
        return null;
    }

    getNeighbors(x, y) {
        return getHexNeighbors(x, y).map(pos => this.getNode(pos.x, pos.y));
    }
}

window.HexMap = HexMap;
window.getHexCenter = getHexCenter;
window.getHexPolygonPoints = getHexPolygonPoints;
window.hexDistance = hexDistance;
window.getHexNeighbors = getHexNeighbors;
window.HEX_RADIUS = HEX_RADIUS;
window.HEX_WIDTH = HEX_WIDTH;
window.HEX_HEIGHT = HEX_HEIGHT;
window.GRID_WIDTH = GRID_WIDTH;
window.GRID_HEIGHT = GRID_HEIGHT;
