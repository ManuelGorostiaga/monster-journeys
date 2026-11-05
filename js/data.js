const DICE_FACES = [0, 1, 1, 1, 1, 2];

function rollAttackDie() {
    const idx = Math.floor(Math.random() * DICE_FACES.length);
    return DICE_FACES[idx];
}

function rollDice(count) {
    const rolls = [];
    let total = 0;
    for (let i = 0; i < count; i++) {
        const val = rollAttackDie();
        rolls.push(val);
        total += val;
    }
    return { rolls, total };
}

const BIOMES = {
    city: {
        id: 'city',
        name: 'Ciudad',
        color: '#475569',
        lightColor: '#94a3b8',
        accentColor: '#334155',
        bgGradient: 'linear-gradient(135deg, #1e293b, #475569)',
        icon: '🏛️',
        cardback: 'cardback-city',
        description: 'Centro urbano fortificado. Permite acceso exclusivo a la Tienda River y alberga Gimnasios.'
    },
    forest: {
        id: 'forest',
        name: 'Bosque',
        color: '#2e7d32',
        lightColor: '#81c784',
        accentColor: '#1b5e20',
        bgGradient: 'linear-gradient(135deg, #1b5e20, #388e3c)',
        icon: '🌲',
        cardback: 'cardback-forest',
        description: 'Frondosos árboles y vegetación densa. Hogar de monstruos Planta y Bicho.'
    },
    mountain: {
        id: 'mountain',
        name: 'Montaña',
        color: '#6d4c41',
        lightColor: '#a1887f',
        accentColor: '#4e342e',
        bgGradient: 'linear-gradient(135deg, #4e342e, #795548)',
        icon: '⛰️',
        cardback: 'cardback-mountain',
        description: 'Picos escarpados y riscos rocosos. Hogar de monstruos Roca, Tierra y Volador.'
    },
    plains: {
        id: 'plains',
        name: 'Pradera',
        color: '#f9a825',
        lightColor: '#fff176',
        accentColor: '#e65100',
        bgGradient: 'linear-gradient(135deg, #f57f17, #fbc02d)',
        icon: '🌾',
        cardback: 'cardback-plains',
        description: 'Vastas llanuras doradas y campos abiertos. Hogar de monstruos Fuego y Eléctrico.'
    },
    freshwater: {
        id: 'freshwater',
        name: 'Agua Dulce',
        color: '#00838f',
        lightColor: '#4dd0e1',
        accentColor: '#006064',
        bgGradient: 'linear-gradient(135deg, #006064, #0097a7)',
        icon: '🏞️',
        cardback: 'cardback-freshwater',
        description: 'Ríos serenos, lagos cristalinos y cascadas. Hogar de criaturas acuáticas fluviales.'
    },
    saltwater: {
        id: 'saltwater',
        name: 'Agua Salada',
        color: '#1565c0',
        lightColor: '#64b5f6',
        accentColor: '#0d47a1',
        bgGradient: 'linear-gradient(135deg, #0d47a1, #1976d2)',
        icon: '🌊',
        cardback: 'cardback-saltwater',
        description: 'El inmenso océano. Criaturas marinas de gran poder.'
    }
};

const TYPE_WEAKNESS = {
    'Planta': 'Fuego',
    'Fuego': 'Agua',
    'Agua': 'Eléctrico',
    'Eléctrico': 'Tierra',
    'Tierra': 'Planta',
    'Volador': 'Eléctrico',
    'Roca': 'Agua',
    'Bicho': 'Fuego',
    'Dragón': 'Hielo',
    'Hielo': 'Fuego'
};

const TYPE_COLORS = {
    'Planta': '#2e7d32',
    'Fuego': '#e64a19',
    'Agua': '#0288d1',
    'Eléctrico': '#fbc02d',
    'Tierra': '#8d6e63',
    'Volador': '#7e57c2',
    'Roca': '#5d4037',
    'Bicho': '#689f38',
    'Dragón': '#4527a0',
    'Hielo': '#00acc1'
};

const OVERWORLD_ABILITIES = {
    flying: {
        id: 'flying',
        name: 'Vuelo Rápido',
        desc: 'Teletransporte directo a cualquier ciudad del mapa.',
        requiresCityTarget: true
    },
    water: {
        id: 'water',
        name: 'Nado Veloz',
        desc: 'Moverse hasta 2 casillas si ambas son de Agua Dulce o Salada.',
        waterMovement: true
    },
    grass: {
        id: 'grass',
        name: 'Rastreo Silvestre',
        desc: 'Al Buscar Monstruos en este turno, revela 4 cartas en vez de 3.',
        searchBonus: 1
    },
    fire: {
        id: 'fire',
        name: 'Calor de Campamento',
        desc: 'Cura 3 HP a todos los monstruos de tu equipo o gana +2 monedas.',
        fireHeal: true
    },
    electric: {
        id: 'electric',
        name: 'Sobrecarga',
        desc: 'Genera +3 monedas de energía para tus compras en la tienda.',
        coinsBonus: 3
    },
    rock: {
        id: 'rock',
        name: 'Romperrocas',
        desc: 'Permite atravesar terrenos montañosos y ganar +2 monedas al visitar POIs de montaña.',
        mountainPass: true
    },
    ground: {
        id: 'ground',
        name: 'Excavación',
        desc: 'Teletranspórtate a la casilla con Punto de Interés no visitado más cercana.',
        burrow: true
    },
    bug: {
        id: 'bug',
        name: 'Red de Seda',
        desc: 'En tu próxima acción de captura, captura como si tu herramienta fuera 1 tier superior.',
        captureTierBonus: 1
    }
};

const MONSTERS_DATABASE = [
    // ---------------- BOSQUE (Forest) ----------------
    {
        id: 'mon_for_1',
        name: 'Hojarín',
        biome: 'forest',
        type: 'Planta',
        weakness: 'Fuego',
        hp: 10,
        maxHp: 10,
        speed: 4,
        captureTier: 1,
        overworldAbility: OVERWORLD_ABILITIES.grass,
        icon: '🌱',
        attacks: [
            { name: 'Látigo Cepa', type: 'Planta', baseDmg: 2, diceCount: 1, desc: '2 base + 1 dado' }
        ]
    },
    {
        id: 'mon_for_2',
        name: 'Orugán',
        biome: 'forest',
        type: 'Bicho',
        weakness: 'Fuego',
        hp: 9,
        maxHp: 9,
        speed: 3,
        captureTier: 1,
        overworldAbility: OVERWORLD_ABILITIES.bug,
        icon: '🐛',
        attacks: [
            { name: 'Picadura', type: 'Bicho', baseDmg: 2, diceCount: 1, desc: '2 base + 1 dado' }
        ]
    },
    {
        id: 'mon_for_3',
        name: 'Espinardo',
        biome: 'forest',
        type: 'Planta',
        weakness: 'Fuego',
        hp: 13,
        maxHp: 13,
        speed: 5,
        captureTier: 2,
        overworldAbility: OVERWORLD_ABILITIES.grass,
        icon: '🌵',
        attacks: [
            { name: 'Espina Aguda', type: 'Planta', baseDmg: 3, diceCount: 1, desc: '3 base + 1 dado' }
        ]
    },
    {
        id: 'mon_for_4',
        name: 'Mantisombra',
        biome: 'forest',
        type: 'Bicho',
        weakness: 'Fuego',
        hp: 12,
        maxHp: 12,
        speed: 7,
        captureTier: 2,
        overworldAbility: OVERWORLD_ABILITIES.bug,
        icon: '🦗',
        attacks: [
            { name: 'Corte Rápido', type: 'Bicho', baseDmg: 2, diceCount: 2, desc: '2 base + 2 dados' }
        ]
    },
    {
        id: 'mon_for_5',
        name: 'Fungobrujo',
        biome: 'forest',
        type: 'Planta',
        weakness: 'Fuego',
        hp: 15,
        maxHp: 15,
        speed: 4,
        captureTier: 3,
        overworldAbility: OVERWORLD_ABILITIES.grass,
        icon: '🍄',
        attacks: [
            { name: 'Esporas Tóxicas', type: 'Planta', baseDmg: 4, diceCount: 1, desc: '4 base + 1 dado' }
        ]
    },
    {
        id: 'mon_for_6',
        name: 'Escaraciervo',
        biome: 'forest',
        type: 'Bicho',
        weakness: 'Fuego',
        hp: 16,
        maxHp: 16,
        speed: 6,
        captureTier: 3,
        overworldAbility: OVERWORLD_ABILITIES.bug,
        icon: '🪲',
        attacks: [
            { name: 'Cuerno Titán', type: 'Bicho', baseDmg: 3, diceCount: 2, desc: '3 base + 2 dados' }
        ]
    },
    {
        id: 'mon_for_7',
        name: 'Sylvanor',
        biome: 'forest',
        type: 'Planta',
        weakness: 'Fuego',
        hp: 20,
        maxHp: 20,
        speed: 6,
        captureTier: 4,
        overworldAbility: OVERWORLD_ABILITIES.grass,
        icon: '🌳',
        attacks: [
            { name: 'Fuerza de Bosque', type: 'Planta', baseDmg: 4, diceCount: 2, desc: '4 base + 2 dados' }
        ]
    },
    {
        id: 'mon_for_8',
        name: 'Reina Vespa',
        biome: 'forest',
        type: 'Bicho',
        weakness: 'Fuego',
        hp: 18,
        maxHp: 18,
        speed: 9,
        captureTier: 4,
        overworldAbility: OVERWORLD_ABILITIES.bug,
        icon: '🐝',
        attacks: [
            { name: 'Aguijón Letal', type: 'Bicho', baseDmg: 5, diceCount: 2, desc: '5 base + 2 dados' }
        ]
    },

    // ---------------- MONTAÑA (Mountain) ----------------
    {
        id: 'mon_mtn_1',
        name: 'Guijarrón',
        biome: 'mountain',
        type: 'Roca',
        weakness: 'Agua',
        hp: 12,
        maxHp: 12,
        speed: 2,
        captureTier: 1,
        overworldAbility: OVERWORLD_ABILITIES.rock,
        icon: '🪨',
        attacks: [
            { name: 'Lanzarrocas', type: 'Roca', baseDmg: 2, diceCount: 1, desc: '2 base + 1 dado' }
        ]
    },
    {
        id: 'mon_mtn_2',
        name: 'Picoperico',
        biome: 'mountain',
        type: 'Volador',
        weakness: 'Eléctrico',
        hp: 9,
        maxHp: 9,
        speed: 6,
        captureTier: 1,
        overworldAbility: OVERWORLD_ABILITIES.flying,
        icon: '🐦',
        attacks: [
            { name: 'Picotazo', type: 'Volador', baseDmg: 2, diceCount: 1, desc: '2 base + 1 dado' }
        ]
    },
    {
        id: 'mon_mtn_3',
        name: 'Topoacero',
        biome: 'mountain',
        type: 'Tierra',
        weakness: 'Planta',
        hp: 13,
        maxHp: 13,
        speed: 4,
        captureTier: 2,
        overworldAbility: OVERWORLD_ABILITIES.ground,
        icon: '🦡',
        attacks: [
            { name: 'Excavar', type: 'Tierra', baseDmg: 3, diceCount: 1, desc: '3 base + 1 dado' }
        ]
    },
    {
        id: 'mon_mtn_4',
        name: 'Peñascoide',
        biome: 'mountain',
        type: 'Roca',
        weakness: 'Agua',
        hp: 15,
        maxHp: 15,
        speed: 3,
        captureTier: 2,
        overworldAbility: OVERWORLD_ABILITIES.rock,
        icon: '🗿',
        attacks: [
            { name: 'Rodar', type: 'Roca', baseDmg: 3, diceCount: 2, desc: '3 base + 2 dados' }
        ]
    },
    {
        id: 'mon_mtn_5',
        name: 'Halcóntor',
        biome: 'mountain',
        type: 'Volador',
        weakness: 'Eléctrico',
        hp: 14,
        maxHp: 14,
        speed: 8,
        captureTier: 3,
        overworldAbility: OVERWORLD_ABILITIES.flying,
        icon: '🦅',
        attacks: [
            { name: 'Tajo Aéreo', type: 'Volador', baseDmg: 3, diceCount: 2, desc: '3 base + 2 dados' }
        ]
    },
    {
        id: 'mon_mtn_6',
        name: 'Gólemita',
        biome: 'mountain',
        type: 'Tierra',
        weakness: 'Planta',
        hp: 17,
        maxHp: 17,
        speed: 3,
        captureTier: 3,
        overworldAbility: OVERWORLD_ABILITIES.ground,
        icon: '🌋',
        attacks: [
            { name: 'Terremoto', type: 'Tierra', baseDmg: 4, diceCount: 2, desc: '4 base + 2 dados' }
        ]
    },
    {
        id: 'mon_mtn_7',
        name: 'Colosoroca',
        biome: 'mountain',
        type: 'Roca',
        weakness: 'Agua',
        hp: 22,
        maxHp: 22,
        speed: 3,
        captureTier: 4,
        overworldAbility: OVERWORLD_ABILITIES.rock,
        icon: '⛰️',
        attacks: [
            { name: 'Avalancha Titán', type: 'Roca', baseDmg: 5, diceCount: 2, desc: '5 base + 2 dados' }
        ]
    },
    {
        id: 'mon_mtn_8',
        name: 'Ventáguila',
        biome: 'mountain',
        type: 'Volador',
        weakness: 'Eléctrico',
        hp: 17,
        maxHp: 17,
        speed: 10,
        captureTier: 4,
        overworldAbility: OVERWORLD_ABILITIES.flying,
        icon: '🕊️',
        attacks: [
            { name: 'Huracán Cumbre', type: 'Volador', baseDmg: 4, diceCount: 3, desc: '4 base + 3 dados' }
        ]
    },

    // ---------------- PRADERA (Plains) ----------------
    {
        id: 'mon_pln_1',
        name: 'Chispito',
        biome: 'plains',
        type: 'Eléctrico',
        weakness: 'Tierra',
        hp: 9,
        maxHp: 9,
        speed: 6,
        captureTier: 1,
        overworldAbility: OVERWORLD_ABILITIES.electric,
        icon: '⚡',
        attacks: [
            { name: 'Impactrueno', type: 'Eléctrico', baseDmg: 2, diceCount: 1, desc: '2 base + 1 dado' }
        ]
    },
    {
        id: 'mon_pln_2',
        name: 'Candilín',
        biome: 'plains',
        type: 'Fuego',
        weakness: 'Agua',
        hp: 10,
        maxHp: 10,
        speed: 5,
        captureTier: 1,
        overworldAbility: OVERWORLD_ABILITIES.fire,
        icon: '🔥',
        attacks: [
            { name: 'Ascua', type: 'Fuego', baseDmg: 2, diceCount: 1, desc: '2 base + 1 dado' }
        ]
    },
    {
        id: 'mon_pln_3',
        name: 'Voltizorro',
        biome: 'plains',
        type: 'Eléctrico',
        weakness: 'Tierra',
        hp: 12,
        maxHp: 12,
        speed: 7,
        captureTier: 2,
        overworldAbility: OVERWORLD_ABILITIES.electric,
        icon: '🦊',
        attacks: [
            { name: 'Onda Trueno', type: 'Eléctrico', baseDmg: 3, diceCount: 1, desc: '3 base + 1 dado' }
        ]
    },
    {
        id: 'mon_pln_4',
        name: 'Furiaponi',
        biome: 'plains',
        type: 'Fuego',
        weakness: 'Agua',
        hp: 13,
        maxHp: 13,
        speed: 7,
        captureTier: 2,
        overworldAbility: OVERWORLD_ABILITIES.fire,
        icon: '🐎',
        attacks: [
            { name: 'Rueda Fuego', type: 'Fuego', baseDmg: 3, diceCount: 1, desc: '3 base + 1 dado' }
        ]
    },
    {
        id: 'mon_pln_5',
        name: 'Electroleón',
        biome: 'plains',
        type: 'Eléctrico',
        weakness: 'Tierra',
        hp: 15,
        maxHp: 15,
        speed: 8,
        captureTier: 3,
        overworldAbility: OVERWORLD_ABILITIES.electric,
        icon: '🦁',
        attacks: [
            { name: 'Rayo Fulgor', type: 'Eléctrico', baseDmg: 4, diceCount: 2, desc: '4 base + 2 dados' }
        ]
    },
    {
        id: 'mon_pln_6',
        name: 'Ignívoro',
        biome: 'plains',
        type: 'Fuego',
        weakness: 'Agua',
        hp: 16,
        maxHp: 16,
        speed: 6,
        captureTier: 3,
        overworldAbility: OVERWORLD_ABILITIES.fire,
        icon: '🦬',
        attacks: [
            { name: 'Lanzallamas', type: 'Fuego', baseDmg: 4, diceCount: 2, desc: '4 base + 2 dados' }
        ]
    },
    {
        id: 'mon_pln_7',
        name: 'Raidracos',
        biome: 'plains',
        type: 'Eléctrico',
        weakness: 'Tierra',
        hp: 19,
        maxHp: 19,
        speed: 9,
        captureTier: 4,
        overworldAbility: OVERWORLD_ABILITIES.electric,
        icon: '🐅',
        attacks: [
            { name: 'Trueno Ancestral', type: 'Eléctrico', baseDmg: 5, diceCount: 2, desc: '5 base + 2 dados' }
        ]
    },
    {
        id: 'mon_pln_8',
        name: 'Fénixdor',
        biome: 'plains',
        type: 'Fuego',
        weakness: 'Agua',
        hp: 18,
        maxHp: 18,
        speed: 8,
        captureTier: 4,
        overworldAbility: OVERWORLD_ABILITIES.fire,
        icon: '🦚',
        attacks: [
            { name: 'Llamarada Solar', type: 'Fuego', baseDmg: 5, diceCount: 2, desc: '5 base + 2 dados' }
        ]
    },

    // ---------------- AGUA DULCE (Freshwater) ----------------
    {
        id: 'mon_frw_1',
        name: 'Renacuajito',
        biome: 'freshwater',
        type: 'Agua',
        weakness: 'Eléctrico',
        hp: 10,
        maxHp: 10,
        speed: 4,
        captureTier: 1,
        overworldAbility: OVERWORLD_ABILITIES.water,
        icon: '🐸',
        attacks: [
            { name: 'Pistola Agua', type: 'Agua', baseDmg: 2, diceCount: 1, desc: '2 base + 1 dado' }
        ]
    },
    {
        id: 'mon_frw_2',
        name: 'Patiloto',
        biome: 'freshwater',
        type: 'Agua',
        weakness: 'Eléctrico',
        hp: 9,
        maxHp: 9,
        speed: 5,
        captureTier: 1,
        overworldAbility: OVERWORLD_ABILITIES.water,
        icon: '🦆',
        attacks: [
            { name: 'Burbujas', type: 'Agua', baseDmg: 2, diceCount: 1, desc: '2 base + 1 dado' }
        ]
    },
    {
        id: 'mon_frw_3',
        name: 'Nutrialegre',
        biome: 'freshwater',
        type: 'Agua',
        weakness: 'Eléctrico',
        hp: 13,
        maxHp: 13,
        speed: 6,
        captureTier: 2,
        overworldAbility: OVERWORLD_ABILITIES.water,
        icon: '🦦',
        attacks: [
            { name: 'Aqua Cola', type: 'Agua', baseDmg: 3, diceCount: 1, desc: '3 base + 1 dado' }
        ]
    },
    {
        id: 'mon_frw_4',
        name: 'Sapoabismal',
        biome: 'freshwater',
        type: 'Agua',
        weakness: 'Eléctrico',
        hp: 15,
        maxHp: 15,
        speed: 4,
        captureTier: 2,
        overworldAbility: OVERWORLD_ABILITIES.water,
        icon: '🐸',
        attacks: [
            { name: 'Lodazo', type: 'Agua', baseDmg: 3, diceCount: 2, desc: '3 base + 2 dados' }
        ]
    },
    {
        id: 'mon_frw_5',
        name: 'Cocodriloide',
        biome: 'freshwater',
        type: 'Agua',
        weakness: 'Eléctrico',
        hp: 17,
        maxHp: 17,
        speed: 5,
        captureTier: 3,
        overworldAbility: OVERWORLD_ABILITIES.water,
        icon: '🐊',
        attacks: [
            { name: 'Mordisco Fluvial', type: 'Agua', baseDmg: 4, diceCount: 2, desc: '4 base + 2 dados' }
        ]
    },
    {
        id: 'mon_frw_6',
        name: 'Serpentina',
        biome: 'freshwater',
        type: 'Agua',
        weakness: 'Eléctrico',
        hp: 15,
        maxHp: 15,
        speed: 7,
        captureTier: 3,
        overworldAbility: OVERWORLD_ABILITIES.water,
        icon: '🐍',
        attacks: [
            { name: 'Hidropulso', type: 'Agua', baseDmg: 3, diceCount: 2, desc: '3 base + 2 dados' }
        ]
    },
    {
        id: 'mon_frw_7',
        name: 'Gyarador',
        biome: 'freshwater',
        type: 'Agua',
        weakness: 'Eléctrico',
        hp: 20,
        maxHp: 20,
        speed: 7,
        captureTier: 4,
        overworldAbility: OVERWORLD_ABILITIES.water,
        icon: '🐉',
        attacks: [
            { name: 'Hidrobomba', type: 'Agua', baseDmg: 5, diceCount: 2, desc: '5 base + 2 dados' }
        ]
    },
    {
        id: 'mon_frw_8',
        name: 'Rei Tortugón',
        biome: 'freshwater',
        type: 'Agua',
        weakness: 'Eléctrico',
        hp: 22,
        maxHp: 22,
        speed: 3,
        captureTier: 4,
        overworldAbility: OVERWORLD_ABILITIES.water,
        icon: '🐢',
        attacks: [
            { name: 'Cañón Cascada', type: 'Agua', baseDmg: 4, diceCount: 2, desc: '4 base + 2 dados' }
        ]
    },

    // ---------------- AGUA SALADA (Saltwater) ----------------
    {
        id: 'mon_ocn_1',
        name: 'Cangrejito',
        biome: 'saltwater',
        type: 'Agua',
        weakness: 'Eléctrico',
        hp: 11,
        maxHp: 11,
        speed: 3,
        captureTier: 1,
        overworldAbility: OVERWORLD_ABILITIES.water,
        icon: '🦀',
        attacks: [
            { name: 'Pinza Tenaz', type: 'Agua', baseDmg: 2, diceCount: 1, desc: '2 base + 1 dado' }
        ]
    },
    {
        id: 'mon_ocn_2',
        name: 'Pezdardo',
        biome: 'saltwater',
        type: 'Agua',
        weakness: 'Eléctrico',
        hp: 9,
        maxHp: 9,
        speed: 7,
        captureTier: 1,
        overworldAbility: OVERWORLD_ABILITIES.water,
        icon: '🐟',
        attacks: [
            { name: 'Embestida Acuática', type: 'Agua', baseDmg: 2, diceCount: 1, desc: '2 base + 1 dado' }
        ]
    },
    {
        id: 'mon_ocn_3',
        name: 'Medusónica',
        biome: 'saltwater',
        type: 'Agua',
        weakness: 'Eléctrico',
        hp: 12,
        maxHp: 12,
        speed: 6,
        captureTier: 2,
        overworldAbility: OVERWORLD_ABILITIES.water,
        icon: '🪼',
        attacks: [
            { name: 'Descarga Marina', type: 'Agua', baseDmg: 3, diceCount: 1, desc: '3 base + 1 dado' }
        ]
    },
    {
        id: 'mon_ocn_4',
        name: 'Mantamar',
        biome: 'saltwater',
        type: 'Agua',
        weakness: 'Eléctrico',
        hp: 14,
        maxHp: 14,
        speed: 6,
        captureTier: 2,
        overworldAbility: OVERWORLD_ABILITIES.water,
        icon: '🐡',
        attacks: [
            { name: 'Oleada', type: 'Agua', baseDmg: 3, diceCount: 2, desc: '3 base + 2 dados' }
        ]
    },
    {
        id: 'mon_ocn_5',
        name: 'Tiburafán',
        biome: 'saltwater',
        type: 'Agua',
        weakness: 'Eléctrico',
        hp: 17,
        maxHp: 17,
        speed: 8,
        captureTier: 3,
        overworldAbility: OVERWORLD_ABILITIES.water,
        icon: '🦈',
        attacks: [
            { name: 'Mandíbula Abisal', type: 'Agua', baseDmg: 4, diceCount: 2, desc: '4 base + 2 dados' }
        ]
    },
    {
        id: 'mon_ocn_6',
        name: 'Krakengelio',
        biome: 'saltwater',
        type: 'Agua',
        weakness: 'Eléctrico',
        hp: 18,
        maxHp: 18,
        speed: 5,
        captureTier: 3,
        overworldAbility: OVERWORLD_ABILITIES.water,
        icon: '🐙',
        attacks: [
            { name: 'Tentáculo Voraz', type: 'Agua', baseDmg: 4, diceCount: 2, desc: '4 base + 2 dados' }
        ]
    },
    {
        id: 'mon_ocn_7',
        name: 'Leviatán Marino',
        biome: 'saltwater',
        type: 'Agua',
        weakness: 'Eléctrico',
        hp: 22,
        maxHp: 22,
        speed: 7,
        captureTier: 4,
        overworldAbility: OVERWORLD_ABILITIES.water,
        icon: '🐋',
        attacks: [
            { name: 'Tsunami Abisal', type: 'Agua', baseDmg: 5, diceCount: 2, desc: '5 base + 2 dados' }
        ]
    },
    {
        id: 'mon_ocn_8',
        name: 'Dragón Coralino',
        biome: 'saltwater',
        type: 'Dragón',
        weakness: 'Hielo',
        hp: 21,
        maxHp: 21,
        speed: 8,
        captureTier: 4,
        overworldAbility: OVERWORLD_ABILITIES.water,
        icon: '🐉',
        attacks: [
            { name: 'Aliento del Dragón', type: 'Dragón', baseDmg: 5, diceCount: 2, desc: '5 base + 2 dados' }
        ]
    }
];

const ITEMS_DATABASE = [
    // --- HERRAMIENTAS DE CAPTURA ---
    {
        id: 'item_cap_1',
        name: 'Pokeball Básica',
        category: 'capture',
        tier: 1,
        cost: 4,
        icon: '🔴',
        desc: 'Permite capturar monstruos salvajes de Tier 1.'
    },
    {
        id: 'item_cap_2',
        name: 'Superball Reforzada',
        category: 'capture',
        tier: 2,
        cost: 8,
        icon: '🔵',
        desc: 'Permite capturar monstruos salvajes de Tier 1 y Tier 2.'
    },
    {
        id: 'item_cap_3',
        name: 'Ultraball Avanzada',
        category: 'capture',
        tier: 3,
        cost: 14,
        icon: '🟡',
        desc: 'Permite capturar monstruos salvajes hasta Tier 3.'
    },
    {
        id: 'item_cap_4',
        name: 'Masterball Suprema',
        category: 'capture',
        tier: 4,
        cost: 22,
        icon: '🟣',
        desc: 'Permite capturar cualquier monstruo legendario (Tier 1 a Tier 4).'
    },

    // --- OBJETOS DE COMBATE ---
    {
        id: 'item_cmb_1',
        name: 'Banda Fuerza',
        category: 'combat',
        cost: 6,
        icon: '🥊',
        desc: '+1 daño base en todos los ataques del monstruo portador.'
    },
    {
        id: 'item_cmb_2',
        name: 'Chaleco Defensivo',
        category: 'combat',
        cost: 6,
        icon: '🦺',
        desc: 'Reduce en 1 punto el daño recibido de ataques enemigos (mínimo 1 daño).'
    },
    {
        id: 'item_cmb_3',
        name: 'Garra Rápida',
        category: 'combat',
        cost: 5,
        icon: '⚡',
        desc: '+2 Velocidad para el monstruo que la tenga equipada.'
    },
    {
        id: 'item_cmb_4',
        name: 'Cinta Focus',
        category: 'combat',
        cost: 8,
        icon: '🎗️',
        desc: 'Sobrevive con 1 HP la primera vez que el monstruo recibiría un golpe letal.'
    },
    {
        id: 'item_cmb_5',
        name: 'Lente Preciso',
        category: 'combat',
        cost: 7,
        icon: '🎯',
        desc: 'Tus dados de ataque que saquen 0 se convierten automáticamente en 1.'
    },
    {
        id: 'item_cmb_6',
        name: 'Colmillo Afilado',
        category: 'combat',
        cost: 6,
        icon: '🦷',
        desc: '+2 daño adicional si tu monstruo ataca primero en el turno.'
    },
    {
        id: 'item_cmb_7',
        name: 'Baya Aranja',
        category: 'combat',
        cost: 4,
        icon: '🫐',
        desc: 'Al llegar a 0 HP, consume la baya inmediatamente y recupera 3 HP para seguir en combate (un uso por combate).'
    },
    {
        id: 'item_cmb_8',
        name: 'Casco Dentado',
        category: 'combat',
        cost: 6,
        icon: '🪖',
        desc: 'Cada vez que el monstruo recibe daño físico de un ataque, el atacante sufre 1 de daño.'
    },
    {
        id: 'item_cmb_9',
        name: 'Pesa Recia',
        category: 'combat',
        cost: 7,
        icon: '🏋️',
        desc: '+3 HP máxima y actual para el monstruo portador.'
    },

    // --- OBJETOS DE UTILIDAD ---
    {
        id: 'item_utl_1',
        name: 'Botas Ligeras',
        category: 'utility',
        cost: 5,
        icon: '👟',
        desc: 'Puedes moverte 1 casilla adicional en tu fase de movimiento terrestre.'
    },
    {
        id: 'item_utl_2',
        name: 'Caña de Pescar',
        category: 'utility',
        cost: 5,
        icon: '🎣',
        desc: 'Permite la acción "Buscar Monstruo" en casillas de Agua Dulce o Agua Salada.'
    },
    {
        id: 'item_utl_3',
        name: 'Mapa de Rutas',
        category: 'utility',
        cost: 5,
        icon: '🗺️',
        desc: 'Recibe +2 monedas de oro cada vez que visites cualquier Punto de Interés (POI).'
    },
    {
        id: 'item_utl_4',
        name: 'Flauta Mágica',
        category: 'utility',
        cost: 6,
        icon: '🪈',
        desc: 'En combate, puedes relanzar 1 dado de ataque por turno.'
    },
    {
        id: 'item_utl_5',
        name: 'Moneda Amuleto',
        category: 'utility',
        cost: 6,
        icon: '🪙',
        desc: 'Gana +3 monedas adicionales al terminar cualquier combate (victoria o derrota).'
    },
    {
        id: 'item_utl_6',
        name: 'Poción de Campamento',
        category: 'utility',
        cost: 5,
        icon: '🧪',
        desc: 'Úsala fuera de combate para restaurar al máximo la salud de todo tu equipo.'
    },
    {
        id: 'item_utl_7',
        name: 'Telescopio Explorador',
        category: 'utility',
        cost: 7,
        icon: '🔭',
        desc: 'Al Buscar Monstruos, roba y mira 4 cartas del mazo de encuentro en lugar de 3.'
    },
    {
        id: 'item_utl_8',
        name: 'Imán de Tesoros',
        category: 'utility',
        cost: 7,
        icon: '🧲',
        desc: 'Cada 3 turnos obtienes automáticamente 2 monedas de oro.'
    }
];

const CHARACTERS_DATABASE = [
    {
        id: 'char_red',
        name: 'Red (El Audaz)',
        title: 'Entrenador Nato',
        icon: '🧢',
        avatarColor: '#d32f2f',
        startingCoins: 10,
        startingLuck: 3,
        startingToolTier: 1,
        startingItemIds: ['item_cap_1', 'item_cmb_7'],
        starterMonsterId: 'mon_pln_2', // Candilín (Fuego)
        abilityName: 'Determinación Ardiente',
        abilityDesc: 'Tus ataques hacen +1 de daño si la vida de tu monstruo activo está por debajo de la mitad.'
    },
    {
        id: 'char_blue',
        name: 'Blue (El Estratega)',
        title: 'Táctico Ambicioso',
        icon: '🕶️',
        avatarColor: '#1976d2',
        startingCoins: 10,
        startingLuck: 4,
        startingToolTier: 2,
        startingItemIds: ['item_cap_2', 'item_cmb_1'],
        starterMonsterId: 'mon_frw_1', // Renacuajito (Agua)
        abilityName: 'Primer Golpe & Fortuna',
        abilityDesc: '+2 Velocidad en turno 1 y comienzas con +1 Punto de Suerte adicional.'
    },
    {
        id: 'char_misty',
        name: 'Marina (La Pescadora)',
        title: 'Especialista Fluvial',
        icon: '🌊',
        avatarColor: '#00838f',
        startingCoins: 14,
        startingLuck: 3,
        startingToolTier: 1,
        startingItemIds: ['item_cap_1', 'item_utl_2'],
        starterMonsterId: 'mon_frw_2', // Patiloto (Agua)
        abilityName: 'Navegante Experta',
        abilityDesc: 'Moverse por casillas de Agua Dulce no consume movimiento extra y ganas +1 Suerte al visitar aguas.'
    },
    {
        id: 'char_brock',
        name: 'Flint (El Montañero)',
        title: 'Guardaparques Férreo',
        icon: '🧗',
        avatarColor: '#6d4c41',
        startingCoins: 12,
        startingLuck: 3,
        startingToolTier: 1,
        startingItemIds: ['item_cap_1', 'item_cmb_2'],
        starterMonsterId: 'mon_for_1', // Hojarín (Planta)
        abilityName: 'Resistencia Rocosa',
        abilityDesc: 'Todos los monstruos de tu equipo tienen +2 de HP máxima permanente.'
    }
];

// 4 Gym Cities always available via Cities Deck (Requirement 5 & 6)
const CITIES_DATABASE = [
    {
        id: 'city_hoja',
        cardType: 'city',
        biome: 'city',
        name: 'Ciudad Hoja',
        gymId: 'gym_1',
        gymName: 'Gimnasio Arbóreo',
        tier: 1,
        badgeName: 'Medalla Hoja',
        badgeIcon: '🍃',
        leaderName: 'Líder Erika',
        rewardCoins: 8,
        rewardLuck: 2,
        teamMonsterIds: ['mon_for_1', 'mon_for_2'],
        icon: '🏛️',
        desc: 'Ciudad capital del bosque. Tienda River disponible y desafío de Gimnasio Tier 1.',
        gym: {
            id: 'gym_1',
            name: 'Gimnasio Arbóreo',
            cityName: 'Ciudad Hoja',
            tier: 1,
            badgeName: 'Medalla Hoja',
            badgeIcon: '🍃',
            leaderName: 'Líder Erika',
            rewardCoins: 8,
            rewardLuck: 2,
            teamMonsterIds: ['mon_for_1', 'mon_for_2']
        },
        locationAction: {
            name: 'Mercado de la Hoja',
            type: 'trade',
            costCoins: 3,
            gainLuck: 1,
            desc: 'Paga 3 Monedas 🪙 para ganar 1 Punto de Suerte 🍀.'
        }
    },
    {
        id: 'city_pico',
        cardType: 'city',
        biome: 'city',
        name: 'Ciudad Pico',
        gymId: 'gym_2',
        gymName: 'Gimnasio Cumbre',
        tier: 2,
        badgeName: 'Medalla Risco',
        badgeIcon: '⛰️',
        leaderName: 'Líder Brock',
        rewardCoins: 12,
        rewardLuck: 2,
        teamMonsterIds: ['mon_mtn_3', 'mon_mtn_4'],
        icon: '🏛️',
        desc: 'Bastión montañoso. Tienda River disponible y desafío de Gimnasio Tier 2.',
        gym: {
            id: 'gym_2',
            name: 'Gimnasio Cumbre',
            cityName: 'Ciudad Pico',
            tier: 2,
            badgeName: 'Medalla Risco',
            badgeIcon: '⛰️',
            leaderName: 'Líder Brock',
            rewardCoins: 12,
            rewardLuck: 2,
            teamMonsterIds: ['mon_mtn_3', 'mon_mtn_4']
        },
        locationAction: {
            name: 'Fundición Montañesa',
            type: 'trade',
            costLuck: 1,
            gainCoins: 5,
            desc: 'Gasta 1 Punto de Suerte 🍀 para obtener 5 Monedas de oro 🪙.'
        }
    },
    {
        id: 'city_puerto',
        cardType: 'city',
        biome: 'city',
        name: 'Ciudad Puerto',
        gymId: 'gym_3',
        gymName: 'Gimnasio Marejada',
        tier: 3,
        badgeName: 'Medalla Cascada',
        badgeIcon: '💧',
        leaderName: 'Líder Misty',
        rewardCoins: 16,
        rewardLuck: 3,
        teamMonsterIds: ['mon_frw_5', 'mon_ocn_5'],
        icon: '🏛️',
        desc: 'Gran puerto marítimo. Tienda River disponible y desafío de Gimnasio Tier 3.',
        gym: {
            id: 'gym_3',
            name: 'Gimnasio Marejada',
            cityName: 'Ciudad Puerto',
            tier: 3,
            badgeName: 'Medalla Cascada',
            badgeIcon: '💧',
            leaderName: 'Líder Misty',
            rewardCoins: 16,
            rewardLuck: 3,
            teamMonsterIds: ['mon_frw_5', 'mon_ocn_5']
        },
        locationAction: {
            name: 'Aduana Portuaria',
            type: 'trade',
            costCoins: 5,
            gainLuck: 2,
            desc: 'Paga 5 Monedas 🪙 para recibir 2 Puntos de Suerte 🍀.'
        }
    },
    {
        id: 'city_flama',
        cardType: 'city',
        biome: 'city',
        name: 'Ciudad Flama',
        gymId: 'gym_4',
        gymName: 'Gimnasio Volcán',
        tier: 4,
        badgeName: 'Medalla Volcán',
        badgeIcon: '🔥',
        leaderName: 'Líder Blaine',
        rewardCoins: 22,
        rewardLuck: 3,
        teamMonsterIds: ['mon_pln_6', 'mon_pln_7'],
        icon: '🏛️',
        desc: 'Metrópolis volcánica. Tienda River disponible y desafío de Gimnasio Tier 4.',
        gym: {
            id: 'gym_4',
            name: 'Gimnasio Volcán',
            cityName: 'Ciudad Flama',
            tier: 4,
            badgeName: 'Medalla Volcán',
            badgeIcon: '🔥',
            leaderName: 'Líder Blaine',
            rewardCoins: 22,
            rewardLuck: 3,
            teamMonsterIds: ['mon_pln_6', 'mon_pln_7']
        },
        locationAction: {
            name: 'Altar de la Flama',
            type: 'special',
            desc: 'Roba 2 cartas de localización extra y cura a todo tu equipo.'
        }
    }
];

// Requirement 1 & 4: Rich Location / Environment Cards Deck
const LOCATION_CARDS_DATABASE = [
    // --- BOSQUE (Forest) ---
    {
        id: 'loc_for_1',
        cardType: 'environment',
        name: 'Bosque de las Bayas',
        biome: 'forest',
        icon: '🫐',
        flavor: 'Matorrales frondosos repletos de bayas nutricionales.',
        locationAction: {
            name: 'Cosecha Fértil',
            type: 'special',
            desc: 'Recibes 1 Baya Aranja gratis y ganas 1 Punto de Suerte 🍀.'
        }
    },
    {
        id: 'loc_for_2',
        cardType: 'environment',
        name: 'Bazar del Claro',
        biome: 'forest',
        icon: '🏕️',
        flavor: 'Un campamento de trueque entre leñadores y cazadores.',
        locationAction: {
            name: 'Trueque del Cazador',
            type: 'trade',
            costCoins: 2,
            gainLuck: 1,
            desc: 'Paga 2 Monedas 🪙 → Gana 1 Suerte 🍀.'
        }
    },
    {
        id: 'loc_for_3',
        cardType: 'environment',
        name: 'Arboleda de Sabiduría',
        biome: 'forest',
        icon: '🦉',
        flavor: 'Robles milenarios donde los espíritus enseñan artes marciales.',
        locationAction: {
            name: 'Enseñanza Ancestral',
            type: 'special',
            desc: 'Gasta 1 Suerte 🍀 para enseñar un ataque básico a cualquier criatura.'
        }
    },
    {
        id: 'loc_for_4',
        cardType: 'environment',
        name: 'Santuario del Druida',
        biome: 'forest',
        icon: '⛩️',
        flavor: 'Un círculo de piedras mágicas que revitaliza a los viajeros.',
        locationAction: {
            name: 'Bendición Verde',
            type: 'special',
            desc: 'Restaura toda la salud de tu equipo y gana +2 Monedas.'
        }
    },

    // --- MONTAÑA (Mountain) ---
    {
        id: 'loc_mtn_1',
        cardType: 'environment',
        name: 'Mina de Piedra Oro',
        biome: 'mountain',
        icon: '⛏️',
        flavor: 'Vetas de mineral precioso incrustadas en la roca dura.',
        locationAction: {
            name: 'Extracción Minera',
            type: 'trade',
            costLuck: 1,
            gainCoins: 6,
            desc: 'Gasta 1 Suerte 🍀 → Extrae 6 Monedas 🪙.'
        }
    },
    {
        id: 'loc_mtn_2',
        cardType: 'environment',
        name: 'Refugio de los Picos',
        biome: 'mountain',
        icon: '🏔️',
        flavor: 'Cabaña de piedra resguardada del gélido viento montañés.',
        locationAction: {
            name: 'Brebaje Fortificante',
            type: 'trade',
            costCoins: 4,
            gainLuck: 2,
            desc: 'Paga 4 Monedas 🪙 → Gana 2 Suerte 🍀.'
        }
    },
    {
        id: 'loc_mtn_3',
        cardType: 'environment',
        name: 'Nido del Águila',
        biome: 'mountain',
        icon: '🦅',
        flavor: 'Cresta escarpada desde la cual se divisa toda la comarca.',
        locationAction: {
            name: 'Otear el Horizonte',
            type: 'special',
            desc: 'Roba 2 cartas de localización extra inmediatamente.'
        }
    },
    {
        id: 'loc_mtn_4',
        cardType: 'environment',
        name: 'Cueva de los Fósiles',
        biome: 'mountain',
        icon: '🦴',
        flavor: 'Caverna profunda donde yacen vestigios de gigantes del pasado.',
        locationAction: {
            name: 'Excavación Rara',
            type: 'special',
            desc: 'Gasta 1 Suerte 🍀 → Recibe 7 Monedas de oro.'
        }
    },

    // --- PRADERA (Plains) ---
    {
        id: 'loc_pln_1',
        cardType: 'environment',
        name: 'Molino de los Vientos',
        biome: 'plains',
        icon: '🌾',
        flavor: 'Vastas plantaciones doradas meciéndose bajo la brisa estival.',
        locationAction: {
            name: 'Comercio Campestre',
            type: 'trade',
            costCoins: 3,
            gainLuck: 1,
            desc: 'Paga 3 Monedas 🪙 → Gana 1 Suerte 🍀.'
        }
    },
    {
        id: 'loc_pln_2',
        cardType: 'environment',
        name: 'Feria Ambulante',
        biome: 'plains',
        icon: '🎪',
        flavor: 'Mercaderes itinerantes exhibiendo exóticas baratijas.',
        locationAction: {
            name: 'Puesto Callejero',
            type: 'special',
            desc: 'Permite comprar 1 carta de la Tienda River con 2 monedas de descuento!'
        }
    },
    {
        id: 'loc_pln_3',
        cardType: 'environment',
        name: 'Establo de los Relámpagos',
        biome: 'plains',
        icon: '⚡',
        flavor: 'Cercado donde corren criaturas cargadas de estática pura.',
        locationAction: {
            name: 'Sobrecarga Afortunada',
            type: 'trade',
            costCoins: 5,
            gainLuck: 2,
            desc: 'Paga 5 Monedas 🪙 → Gana 2 Puntos de Suerte 🍀.'
        }
    },
    {
        id: 'loc_pln_4',
        cardType: 'environment',
        name: 'Llanura de Duelos',
        biome: 'plains',
        icon: '⚔️',
        flavor: 'Campo abierto donde se ponen a prueba los mejores entrenadores.',
        locationAction: {
            name: 'Desafío del Campeón',
            type: 'special',
            desc: 'Gasta 1 Suerte 🍀 para retar a un rival y ganar 6 Monedas directo.'
        }
    },

    // --- AGUA DULCE (Freshwater) ---
    {
        id: 'loc_frw_1',
        cardType: 'environment',
        name: 'Cascada Cristalina',
        biome: 'freshwater',
        icon: '🏞️',
        flavor: 'Aguas puras que caen con fuerza regeneradora.',
        locationAction: {
            name: 'Bautismo Fluvial',
            type: 'special',
            desc: 'Cura todos los puntos de vida (HP) de tus monstruos y gana +1 Suerte 🍀.'
        }
    },
    {
        id: 'loc_frw_2',
        cardType: 'environment',
        name: 'Muelle del Pescador',
        biome: 'freshwater',
        icon: '🎣',
        flavor: 'Viejo embarcadero de madera donde se congregan pescadores sabios.',
        locationAction: {
            name: 'Pesca Milagrosa',
            type: 'trade',
            costCoins: 3,
            gainLuck: 1,
            desc: 'Paga 3 Monedas 🪙 → Gana 1 Suerte 🍀.'
        }
    },
    {
        id: 'loc_frw_3',
        cardType: 'environment',
        name: 'Laguna de los Lotos',
        biome: 'freshwater',
        icon: '🪷',
        flavor: 'Flores místicas que emanan un aroma de serenidad insuperable.',
        locationAction: {
            name: 'Paz Interior',
            type: 'special',
            desc: 'Gasta 1 Suerte 🍀 para robar 2 cartas de localización extra.'
        }
    },

    // --- AGUA SALADA (Saltwater) ---
    {
        id: 'loc_ocn_1',
        cardType: 'environment',
        name: 'Arrecife Resplandeciente',
        biome: 'saltwater',
        icon: '🪸',
        flavor: 'Formaciones de coral que brillan en la penumbra marina.',
        locationAction: {
            name: 'Perlas Abisales',
            type: 'trade',
            costLuck: 1,
            gainCoins: 7,
            desc: 'Gasta 1 Suerte 🍀 → Recolecta perlas por 7 Monedas 🪙.'
        }
    },
    {
        id: 'loc_ocn_2',
        cardType: 'environment',
        name: 'Navío Naufragado',
        biome: 'saltwater',
        icon: '🏴‍☠️',
        flavor: 'Restos de un bergantín pirata encallado hace siglos.',
        locationAction: {
            name: 'Saqueo del Cofre',
            type: 'special',
            desc: '¡Encuentras 5 Monedas de oro y 1 Baya Aranja en la bodega!'
        }
    },
    {
        id: 'loc_ocn_3',
        cardType: 'environment',
        name: 'Vórtice Legendario',
        biome: 'saltwater',
        icon: '🌀',
        flavor: 'Remolino colosal donde duermen las mayores bestias del océano.',
        locationAction: {
            name: 'Invocación Mítica',
            type: 'special',
            desc: 'Gasta 2 Suerte 🍀 para buscar inmediatamente entre monstruos Legendarios (Tier 4)!'
        }
    }
];

// Requirement 5: Three Expansion Decks added when Gyms are defeated
const EXPANSION_DECKS = {
    tier2: {
        id: 'tier2',
        name: 'Expansión Tier 2: Vigor Silvestre',
        unlockAtGymsCount: 1,
        desc: 'Desbloqueada tras derrotar el 1er Gimnasio. Introduce criaturas y cartas de Tier 2.',
        monsters: [
            MONSTERS_DATABASE.find(m => m.id === 'mon_for_3'),
            MONSTERS_DATABASE.find(m => m.id === 'mon_for_4'),
            MONSTERS_DATABASE.find(m => m.id === 'mon_mtn_3'),
            MONSTERS_DATABASE.find(m => m.id === 'mon_mtn_4'),
            MONSTERS_DATABASE.find(m => m.id === 'mon_pln_3'),
            MONSTERS_DATABASE.find(m => m.id === 'mon_pln_4'),
            MONSTERS_DATABASE.find(m => m.id === 'mon_frw_3'),
            MONSTERS_DATABASE.find(m => m.id === 'mon_frw_4'),
            MONSTERS_DATABASE.find(m => m.id === 'mon_ocn_3'),
            MONSTERS_DATABASE.find(m => m.id === 'mon_ocn_4')
        ]
    },
    tier3: {
        id: 'tier3',
        name: 'Expansión Tier 3: Poder Titánico',
        unlockAtGymsCount: 2,
        desc: 'Desbloqueada tras derrotar el 2do Gimnasio. Introduce criaturas y cartas de Tier 3.',
        monsters: [
            MONSTERS_DATABASE.find(m => m.id === 'mon_for_5'),
            MONSTERS_DATABASE.find(m => m.id === 'mon_for_6'),
            MONSTERS_DATABASE.find(m => m.id === 'mon_mtn_5'),
            MONSTERS_DATABASE.find(m => m.id === 'mon_mtn_6'),
            MONSTERS_DATABASE.find(m => m.id === 'mon_pln_5'),
            MONSTERS_DATABASE.find(m => m.id === 'mon_pln_6'),
            MONSTERS_DATABASE.find(m => m.id === 'mon_frw_5'),
            MONSTERS_DATABASE.find(m => m.id === 'mon_frw_6'),
            MONSTERS_DATABASE.find(m => m.id === 'mon_ocn_5'),
            MONSTERS_DATABASE.find(m => m.id === 'mon_ocn_6')
        ]
    },
    tier4: {
        id: 'tier4',
        name: 'Expansión Tier 4: Época Legendaria',
        unlockAtGymsCount: 3,
        desc: 'Desbloqueada tras derrotar el 3er Gimnasio. Introduce criaturas míticas y cartas Legendarias.',
        monsters: [
            MONSTERS_DATABASE.find(m => m.id === 'mon_for_7'),
            MONSTERS_DATABASE.find(m => m.id === 'mon_for_8'),
            MONSTERS_DATABASE.find(m => m.id === 'mon_mtn_7'),
            MONSTERS_DATABASE.find(m => m.id === 'mon_mtn_8'),
            MONSTERS_DATABASE.find(m => m.id === 'mon_pln_7'),
            MONSTERS_DATABASE.find(m => m.id === 'mon_pln_8'),
            MONSTERS_DATABASE.find(m => m.id === 'mon_frw_7'),
            MONSTERS_DATABASE.find(m => m.id === 'mon_frw_8'),
            MONSTERS_DATABASE.find(m => m.id === 'mon_ocn_7'),
            MONSTERS_DATABASE.find(m => m.id === 'mon_ocn_8')
        ]
    }
};

window.DICE_FACES = DICE_FACES;
window.rollAttackDie = rollAttackDie;
window.rollDice = rollDice;
window.BIOMES = BIOMES;
window.TYPE_WEAKNESS = TYPE_WEAKNESS;
window.TYPE_COLORS = TYPE_COLORS;
window.OVERWORLD_ABILITIES = OVERWORLD_ABILITIES;
window.MONSTERS_DATABASE = MONSTERS_DATABASE;
window.ITEMS_DATABASE = ITEMS_DATABASE;
window.CHARACTERS_DATABASE = CHARACTERS_DATABASE;
window.CITIES_DATABASE = CITIES_DATABASE;
window.LOCATION_CARDS_DATABASE = LOCATION_CARDS_DATABASE;
window.EXPANSION_DECKS = EXPANSION_DECKS;
window.GYMS_DATABASE = CITIES_DATABASE;