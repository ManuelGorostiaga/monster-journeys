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
        description: '🏛️ Ciudad: Tienda River y Gimnasios.'
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
        description: '🌲 Bosque: Planta / Bicho.'
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
        description: '⛰️ Montaña: Roca / Tierra / Volador.'
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
        description: '🌾 Pradera: Fuego / Eléctrico.'
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
        description: '🏞️ Agua Dulce: Criaturas fluviales.'
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
        description: '🌊 Agua Salada: Criaturas marinas.'
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
        desc: '✈️ Teletransporte a cualquier ciudad.',
        requiresCityTarget: true
    },
    water: {
        id: 'water',
        name: 'Nado Veloz',
        desc: '🌊 Movimiento: 2 en Agua Dulce/Salada.',
        waterMovement: true
    },
    grass: {
        id: 'grass',
        name: 'Rastreo Silvestre',
        desc: '🌿 Búsqueda: 4 cartas (en vez de 3).',
        searchBonus: 1
    },
    fire: {
        id: 'fire',
        name: 'Calor de Campamento',
        desc: '🔥 +3 HP a equipo o +1 🪙.',
        fireHeal: true
    },
    electric: {
        id: 'electric',
        name: 'Sobrecarga',
        desc: '⚡ +1 🪙.',
        coinsBonus: 1
    },
    rock: {
        id: 'rock',
        name: 'Romperrocas',
        desc: '🪨 Paso montañoso + 1 🪙.',
        mountainPass: true
    },
    ground: {
        id: 'ground',
        name: 'Excavación',
        desc: '🦡 +1 Movimiento.',
        burrow: true
    },
    bug: {
        id: 'bug',
        name: 'Red de Seda',
        desc: '🕸️ Trampa de seda: +1 🍀.',
        luckBonus: 1
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
            { name: 'Látigo Cepa', type: 'Planta', baseDmg: 3, diceCount: 1, effect: null, desc: null },
            { name: 'Pedrada Defensiva', type: 'Roca', baseDmg: 2, diceCount: 1, effect: 'shield_next', desc: '🛡️ Roca anti-fuego + Escudo -2 próx. turno.' }
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
            { name: 'Picadura Tóxica', type: 'Bicho', baseDmg: 2, diceCount: 1, effect: 'poison', desc: '☠️ Veneno (-1 HP/turno).' },
            { name: 'Drenaje de Savia', type: 'Planta', baseDmg: 2, diceCount: 1, effect: 'drain', desc: '🌿 Drena vida: recupera el 50% del daño infligido.' }
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
            { name: 'Trío de Espinas', type: 'Planta', baseDmg: 1, diceCount: 1, hits: 3, effect: 'multi_hit', desc: '💥 Descarga 3 espinas consecutivas.' },
            { name: 'Proyectil Rocoso', type: 'Roca', baseDmg: 3, diceCount: 1, effect: null, desc: '🪨 Cobertura de Roca anti-Fuego y Volador.' }
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
            { name: 'Ida y Vuelta', type: 'Bicho', baseDmg: 3, diceCount: 1, effect: 'pivot_switch', desc: '🔄 Ataque y cambio táctico inmediato sin daño.' },
            { name: 'Tajo Aéreo', type: 'Volador', baseDmg: 4, diceCount: 1, effect: null, desc: '🌪️ Cobertura aérea cortante anti-Planta y Bicho.' }
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
            { name: 'Espora Somnífera', type: 'Planta', baseDmg: 4, diceCount: 1, effect: 'drowsy', desc: '💤 Somnolencia: rival recibe +1 de daño.' },
            { name: 'Bomba Ácida', type: 'Bicho', baseDmg: 3, diceCount: 1, effect: 'poison', desc: '☠️ Esporas corrosivas venenosas.' }
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
            { name: 'Furia Agónica', type: 'Bicho', baseDmg: 4, diceCount: 1, effect: 'facade_status', desc: '🔥 Si sufre estado alterado, inflige +4 de daño base.' },
            { name: 'Embestida Desesperada', type: 'Roca', baseDmg: 6, diceCount: 1, recoilDmg: 2, effect: 'recoil', desc: '💥 Retroceso: 6 daño de Roca pero sufre 2 de daño propio.' }
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
        captureTier: 3,
        overworldAbility: OVERWORLD_ABILITIES.grass,
        icon: '🌳',
        attacks: [
            { name: 'Fuerza de Bosque', type: 'Planta', baseDmg: 7, diceCount: 2, effect: null, desc: null },
            { name: 'Arraigo Nutritivo', type: 'Tierra', baseDmg: 4, diceCount: 1, effect: 'drain', desc: '🌿 Absorbe nutrientes de la tierra recuperando 50% del daño.' }
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
        captureTier: 3,
        overworldAbility: OVERWORLD_ABILITIES.bug,
        icon: '🐝',
        attacks: [
            { name: 'Aguijón Letal', type: 'Bicho', baseDmg: 5, diceCount: 2, effect: 'poison', desc: '☠️ Veneno letal (-1 HP/turno).' },
            { name: 'Aguijón Perforante', type: 'Volador', baseDmg: 6, diceCount: 1, effect: 'white_dice_crit', desc: '🎯 Dados blancos (0) se convierten en críticos (+2 daño).' }
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
            { name: 'Refugio Rocoso', type: 'Roca', baseDmg: 2, diceCount: 1, effect: 'shield_next', desc: '🛡️ Escudo -2 próx. turno.' },
            { name: 'Follaje Protector', type: 'Planta', baseDmg: 2, diceCount: 1, effect: null, desc: '🌿 Cobertura de Planta anti-Agua y Tierra.' }
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
            { name: 'Picotazo', type: 'Volador', baseDmg: 3, diceCount: 1, effect: null, desc: null },
            { name: 'Viento Helado', type: 'Hielo', baseDmg: 2, diceCount: 1, effect: 'drowsy', desc: '❄️ Ráfaga gélida somnolienta.' }
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
            { name: 'Fijación Sísmica', type: 'Tierra', baseDmg: 5, fixedDmg: 5, effect: 'fixed_damage', desc: '🎯 Daño fijo garantizado de 5 (ignora tirada de dados).' },
            { name: 'Taladro Rocoso', type: 'Roca', baseDmg: 3, diceCount: 1, effect: null, desc: '🪨 Cobertura de Roca anti-Volador y Fuego.' }
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
            { name: 'Golpe de Peñasco', type: 'Roca', baseDmg: 5, diceCount: 1, effect: null, desc: null },
            { name: 'Descarga Terrestre', type: 'Tierra', baseDmg: 4, diceCount: 1, effect: 'paralyze', desc: '⚡ Cobertura de Tierra anti-Eléctrico.' }
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
            { name: 'Ojo de Francotirador', type: 'Volador', baseDmg: 4, diceCount: 2, effect: 'white_dice_crit', desc: '🎯 Dados blancos (0) se convierten en impactos críticos (+2 daño).' },
            { name: 'Picado Flamígero', type: 'Fuego', baseDmg: 5, diceCount: 1, effect: null, desc: '🔥 Cobertura ígnea aérea anti-Hielo y Planta.' }
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
            { name: 'Armadura Terrestre', type: 'Tierra', baseDmg: 5, diceCount: 1, effect: 'shield_next', desc: '🛡️ Escudo -2 próx. turno.' },
            { name: 'Colisión Pesada', type: 'Roca', baseDmg: 7, diceCount: 1, recoilDmg: 2, effect: 'recoil', desc: '💥 Impacto titánico de 7 daño con 2 de retroceso propio.' }
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
        captureTier: 3,
        overworldAbility: OVERWORLD_ABILITIES.rock,
        icon: '⛰️',
        attacks: [
            { name: 'Avalancha Titán', type: 'Roca', baseDmg: 7, diceCount: 2, effect: null, desc: null },
            { name: 'Fisura Sísmica', type: 'Tierra', baseDmg: 5, diceCount: 2, effect: 'force_switch', desc: '🌪️ Terremoto que expulsa al oponente hacia la reserva.' }
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
        captureTier: 3,
        overworldAbility: OVERWORLD_ABILITIES.flying,
        icon: '🕊️',
        attacks: [
            { name: 'Tornado Expulsor', type: 'Volador', baseDmg: 4, diceCount: 2, effect: 'force_switch', desc: '🌪️ Expulsa al monstruo rival obligándolo a cambiar por su reserva.' },
            { name: 'Ráfaga de Plumas', type: 'Bicho', baseDmg: 2, diceCount: 1, hits: 3, effect: 'multi_hit', desc: '💥 Torbellino de 3 golpes continuos.' }
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
            { name: 'Chispa Paralizante', type: 'Eléctrico', baseDmg: 2, diceCount: 1, effect: 'paralyze', desc: '⚡ Paraliza (Velocidad 0).' },
            { name: 'Burbuja de Chispa', type: 'Agua', baseDmg: 2, diceCount: 1, effect: null, desc: '💧 Cobertura acuática anti-Tierra.' }
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
            { name: 'Ascua', type: 'Fuego', baseDmg: 3, diceCount: 1, effect: null, desc: null },
            { name: 'Raíz Ígnea', type: 'Planta', baseDmg: 2, diceCount: 1, effect: 'drain', desc: '🌿 Cobertura de Planta anti-Agua y Tierra con absorción de vida.' }
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
            { name: 'Voltiocambio', type: 'Eléctrico', baseDmg: 3, diceCount: 1, effect: 'pivot_switch', desc: '🔄 Ataque y cambio táctico inmediato sin daño.' },
            { name: 'Mordisco Helado', type: 'Hielo', baseDmg: 3, diceCount: 1, effect: null, desc: '❄️ Cobertura de Hielo anti-Tierra, Dragón y Volador.' }
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
            { name: 'Carga Ígnea', type: 'Fuego', baseDmg: 3, diceCount: 1, effect: 'charge_next', desc: '⚡ Carga de poder: +3 daño en el próximo ataque.' },
            { name: 'Cocotazo Rocoso', type: 'Roca', baseDmg: 4, diceCount: 1, effect: null, desc: '🪨 Cobertura de Roca anti-Agua y Volador.' }
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
            { name: 'Electroimpulso', type: 'Eléctrico', baseDmg: 0, diceCount: 1, effect: 'speed_damage', desc: '⚡ Daño base igual a la Velocidad del atacante.' },
            { name: 'Colmillo Ígneo', type: 'Fuego', baseDmg: 4, diceCount: 1, effect: null, desc: '🔥 Cobertura de Fuego anti-Planta y Bicho.' }
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
            { name: 'Fogonazo Brutal', type: 'Fuego', baseDmg: 5, diceCount: 1, effect: null, desc: null },
            { name: 'Carga Suicida', type: 'Tierra', baseDmg: 8, diceCount: 1, recoilDmg: 3, effect: 'recoil', desc: '💥 Embestida volcánica de 8 daño con 3 de retroceso propio.' }
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
        captureTier: 3,
        overworldAbility: OVERWORLD_ABILITIES.electric,
        icon: '🐅',
        attacks: [
            { name: 'Trueno Ancestral', type: 'Eléctrico', baseDmg: 5, diceCount: 2, effect: 'paralyze', desc: '⚡ Paraliza al rival reduciendo su Velocidad a 0.' },
            { name: 'Aliento Dracónico', type: 'Dragón', baseDmg: 5, diceCount: 1, effect: 'white_dice_crit', desc: '🐉 Cobertura dracónica con críticos en dados blancos.' }
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
        captureTier: 3,
        overworldAbility: OVERWORLD_ABILITIES.fire,
        icon: '🦚',
        attacks: [
            { name: 'Llamarada Solar', type: 'Fuego', baseDmg: 7, diceCount: 2, effect: null, desc: null },
            { name: 'Vuelo Renaciente', type: 'Volador', baseDmg: 4, diceCount: 1, effect: 'drain', desc: '🦅 Alas de ceniza que curan el 50% del daño infligido.' }
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
            { name: 'Pistola Agua', type: 'Agua', baseDmg: 3, diceCount: 1, effect: null, desc: null },
            { name: 'Lodo Terrestre', type: 'Tierra', baseDmg: 2, diceCount: 1, effect: null, desc: '🦡 Cobertura de Tierra anti-Eléctrico.' }
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
            { name: 'Bostezo Sedante', type: 'Agua', baseDmg: 2, diceCount: 1, effect: 'drowsy', desc: '💤 Somnolencia: el rival recibe +1 de daño.' },
            { name: 'Latigazo de Caña', type: 'Planta', baseDmg: 3, diceCount: 1, effect: null, desc: '🌿 Cobertura de Planta anti-Agua y Roca.' }
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
            { name: 'Giro Rápido', type: 'Agua', baseDmg: 0, diceCount: 1, effect: 'speed_damage', desc: '⚡ Daño base calculado a partir de la Velocidad del atacante.' },
            { name: 'Mordisco Eléctrico', type: 'Eléctrico', baseDmg: 3, diceCount: 1, effect: 'paralyze', desc: '⚡ Dientes cargados de estática que paralizan.' }
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
            { name: 'Lodazo Tóxico', type: 'Agua', baseDmg: 3, diceCount: 1, effect: 'poison', desc: '☠️ Veneno (-1 HP/turno).' },
            { name: 'Tierra Movediza', type: 'Tierra', baseDmg: 4, diceCount: 1, effect: 'shield_next', desc: '🛡️ Fango protector que reduce 2 de daño el próx. turno.' }
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
            { name: 'Mordisco Certero', type: 'Agua', baseDmg: 4, diceCount: 2, effect: 'white_dice_crit', desc: '🎯 Dados blancos (0) se convierten en impactos críticos (+2 daño).' },
            { name: 'Coleotazo Pétreo', type: 'Roca', baseDmg: 5, diceCount: 1, effect: null, desc: '🪨 Cobertura de Roca anti-Fuego y Hielo.' }
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
            { name: 'Maremoto Expulsor', type: 'Agua', baseDmg: 4, diceCount: 2, effect: 'force_switch', desc: '🌪️ Expulsa al monstruo rival obligándolo a cambiar por su reserva.' },
            { name: 'Escamas Gélidas', type: 'Hielo', baseDmg: 4, diceCount: 1, effect: 'drowsy', desc: '❄️ Frío adormecedor anti-Dragón y Planta.' }
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
        captureTier: 3,
        overworldAbility: OVERWORLD_ABILITIES.water,
        icon: '🐉',
        attacks: [
            { name: 'Hidrobomba', type: 'Agua', baseDmg: 7, diceCount: 2, effect: null, desc: null },
            { name: 'Furia de Dragón Marino', type: 'Dragón', baseDmg: 6, fixedDmg: 6, effect: 'fixed_damage', desc: '🐉 6 de daño fijo garantizado sin depender del dado.' }
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
        captureTier: 3,
        overworldAbility: OVERWORLD_ABILITIES.water,
        icon: '🐢',
        attacks: [
            { name: 'Caparazón Espejo', type: 'Agua', baseDmg: 4, diceCount: 2, effect: 'shield_next', desc: '🛡️ Escudo -2 próx. turno.' },
            { name: 'Espiga Drenadora', type: 'Planta', baseDmg: 3, diceCount: 1, effect: 'drain', desc: '🌿 Absorbe 50% del daño en vitalidad para la tortuga.' }
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
            { name: 'Tenaza Férrea', type: 'Agua', baseDmg: 3, diceCount: 1, effect: null, desc: null },
            { name: 'Pellizco Tóxico', type: 'Bicho', baseDmg: 2, diceCount: 1, effect: 'poison', desc: '☠️ Veneno de arrecife (-1 HP/turno).' }
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
            { name: 'Triple Aguijón', type: 'Agua', baseDmg: 1, diceCount: 1, hits: 3, effect: 'multi_hit', desc: '💥 Descarga 3 impactos de aguijón consecutivos.' },
            { name: 'Dardo Relámpago', type: 'Eléctrico', baseDmg: 2, diceCount: 1, effect: 'paralyze', desc: '⚡ Descarga marina que paraliza.' }
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
            { name: 'Tentáculo Paralizante', type: 'Agua', baseDmg: 3, diceCount: 1, effect: 'paralyze', desc: '⚡ Paraliza (Velocidad 0).' },
            { name: 'Absorción Abisal', type: 'Planta', baseDmg: 3, diceCount: 1, effect: 'drain', desc: '🌿 Sifón bioluminiscente que drena 50% del daño.' }
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
            { name: 'Giro Marino', type: 'Agua', baseDmg: 3, diceCount: 1, effect: 'pivot_switch', desc: '🔄 Ataque y cambio táctico inmediato sin daño.' },
            { name: 'Onda Sónica Aérea', type: 'Volador', baseDmg: 4, diceCount: 1, effect: null, desc: '🦅 Planeo sobre las olas anti-Planta y Bicho.' }
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
            { name: 'Mandíbula Letal', type: 'Agua', baseDmg: 4, diceCount: 2, effect: 'white_dice_crit', desc: '🎯 Dados blancos (0) se convierten en impactos críticos (+2 daño).' },
            { name: 'Dentellada Cruenta', type: 'Tierra', baseDmg: 7, diceCount: 1, recoilDmg: 2, effect: 'recoil', desc: '💥 Mordisco salvaje de 7 daño con 2 de retroceso propio.' }
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
            { name: 'Tentáculo Voraz', type: 'Agua', baseDmg: 4, diceCount: 2, effect: 'drowsy', desc: '💤 Somnolencia: el rival recibe +1 de daño.' },
            { name: 'Tinta Cegadora', type: 'Bicho', baseDmg: 4, diceCount: 1, effect: 'shield_next', desc: '🛡️ Nube oscura que reduce 2 de daño el próx. turno.' }
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
        captureTier: 3,
        overworldAbility: OVERWORLD_ABILITIES.water,
        icon: '🐋',
        attacks: [
            { name: 'Tsunami Titánico', type: 'Agua', baseDmg: 7, diceCount: 2, effect: null, desc: null },
            { name: 'Vórtice Helado', type: 'Hielo', baseDmg: 5, diceCount: 2, effect: 'drowsy', desc: '❄️ Congelación adormecedora anti-Dragón y Planta.' }
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
        captureTier: 3,
        overworldAbility: OVERWORLD_ABILITIES.water,
        icon: '🐉',
        attacks: [
            { name: 'Furia Dragón', type: 'Dragón', baseDmg: 6, fixedDmg: 6, effect: 'fixed_damage', desc: '🎯 6 de daño fijo garantizado (ignora dados).' },
            { name: 'Resplandor Solar', type: 'Fuego', baseDmg: 5, diceCount: 1, effect: 'charge_next', desc: '🔥 Cobertura ígnea anti-Hielo + Carga +3 próximo ataque.' }
        ]
    },

    // --- TIER 4: CRIATURAS LEGENDARIAS (1 por cada tipo) ---
    {
        id: 'mon_leg_grass',
        name: 'Yggdrassor',
        biome: 'forest',
        type: 'Planta',
        weakness: 'Fuego',
        hp: 26,
        maxHp: 26,
        speed: 7,
        captureTier: 4,
        isLegendary: true,
        overworldAbility: OVERWORLD_ABILITIES.grass,
        icon: '🌳',
        attacks: [
            { name: 'Ira de Gaia', type: 'Planta', baseDmg: 8, diceCount: 2, hits: 2, effect: 'multi_hit', desc: '💥 Descarga 2 embestidas colosales continuas de 8+dados.' },
            { name: 'Seiva Primordial', type: 'Agua', baseDmg: 6, diceCount: 1, effect: 'drain', desc: '🌿 Drenaje milenario: restaura 50% del daño en vitalidad.' }
        ]
    },
    {
        id: 'mon_leg_bug',
        name: 'Soberanocoris',
        biome: 'forest',
        type: 'Bicho',
        weakness: 'Fuego',
        hp: 25,
        maxHp: 25,
        speed: 9,
        captureTier: 4,
        isLegendary: true,
        overworldAbility: OVERWORLD_ABILITIES.bug,
        icon: '👑',
        attacks: [
            { name: 'Enjambre Apocalíptico', type: 'Bicho', baseDmg: 9, diceCount: 2, effect: 'poison', desc: '☠️ Veneno devastador (-1 HP/turno).' },
            { name: 'Danza de Escamas', type: 'Roca', baseDmg: 7, diceCount: 1, effect: 'shield_next', desc: '🪨 Escudo de quitina mineral -2 daño próx. turno.' }
        ]
    },
    {
        id: 'mon_leg_rock',
        name: 'Geotitán',
        biome: 'mountain',
        type: 'Roca',
        weakness: 'Agua',
        hp: 28,
        maxHp: 28,
        speed: 4,
        captureTier: 4,
        isLegendary: true,
        overworldAbility: OVERWORLD_ABILITIES.rock,
        icon: '🗿',
        attacks: [
            { name: 'Cataclismo Pétreo', type: 'Roca', baseDmg: 9, diceCount: 2, effect: 'shield_next', desc: '🛡️ Escudo protector titánico (-2 daño próx. turno).' },
            { name: 'Impacto Meteoro', type: 'Fuego', baseDmg: 11, diceCount: 1, recoilDmg: 3, effect: 'recoil', desc: '💥 Meteoro ardiente de 11 daño con 3 de retroceso.' }
        ]
    },
    {
        id: 'mon_leg_ground',
        name: 'Terragón',
        biome: 'mountain',
        type: 'Tierra',
        weakness: 'Planta',
        hp: 27,
        maxHp: 27,
        speed: 5,
        captureTier: 4,
        isLegendary: true,
        overworldAbility: OVERWORLD_ABILITIES.ground,
        icon: '🦣',
        attacks: [
            { name: 'Fisura Devastadora', type: 'Tierra', baseDmg: 9, fixedDmg: 10, diceCount: 2, effect: 'fixed_damage', desc: '🎯 Daño colosal fijo de 10 garantizado.' },
            { name: 'Alud de Hielo', type: 'Hielo', baseDmg: 7, diceCount: 2, effect: 'drowsy', desc: '❄️ Cobertura de Hielo anti-Planta y Volador.' }
        ]
    },
    {
        id: 'mon_leg_flying',
        name: 'Aethelgard',
        biome: 'mountain',
        type: 'Volador',
        weakness: 'Eléctrico',
        hp: 24,
        maxHp: 24,
        speed: 11,
        captureTier: 4,
        isLegendary: true,
        overworldAbility: OVERWORLD_ABILITIES.flying,
        icon: '🦅',
        attacks: [
            { name: 'Tornado del Juicio', type: 'Volador', baseDmg: 9, diceCount: 2, effect: 'force_switch', desc: '🌪️ Viento supremo que expulsa al oponente hacia la reserva.' },
            { name: 'Lanza Relámpago', type: 'Eléctrico', baseDmg: 8, diceCount: 1, effect: 'white_dice_crit', desc: '⚡ Rayo certero con impactos críticos en dados blancos.' }
        ]
    },
    {
        id: 'mon_leg_ice',
        name: 'Glaciodón',
        biome: 'mountain',
        type: 'Hielo',
        weakness: 'Fuego',
        hp: 26,
        maxHp: 26,
        speed: 6,
        captureTier: 4,
        isLegendary: true,
        overworldAbility: OVERWORLD_ABILITIES.water,
        icon: '❄️',
        attacks: [
            { name: 'Cero Absoluto', type: 'Hielo', baseDmg: 9, diceCount: 2, effect: 'paralyze', desc: '⚡ Congelación absoluta que paraliza al rival (Velocidad 0).' },
            { name: 'Geiser Subterráneo', type: 'Tierra', baseDmg: 7, diceCount: 1, effect: null, desc: '🦡 Cobertura de Tierra anti-Fuego, Roca y Acero.' }
        ]
    },
    {
        id: 'mon_leg_electric',
        name: 'Fulgoraptor',
        biome: 'plains',
        type: 'Eléctrico',
        weakness: 'Tierra',
        hp: 24,
        maxHp: 24,
        speed: 12,
        captureTier: 4,
        isLegendary: true,
        overworldAbility: OVERWORLD_ABILITIES.electric,
        icon: '⚡',
        attacks: [
            { name: 'Juicio del Rayo', type: 'Eléctrico', baseDmg: 8, diceCount: 2, effect: 'speed_damage', desc: '⚡ Poder titánico potenciado por la Velocidad extrema.' },
            { name: 'Chorro de Plasma', type: 'Agua', baseDmg: 7, diceCount: 1, effect: 'drain', desc: '💧 Cobertura marina anti-Tierra que recupera vida.' }
        ]
    },
    {
        id: 'mon_leg_fire',
        name: 'Piroclasto',
        biome: 'plains',
        type: 'Fuego',
        weakness: 'Agua',
        hp: 26,
        maxHp: 26,
        speed: 9,
        captureTier: 4,
        isLegendary: true,
        overworldAbility: OVERWORLD_ABILITIES.fire,
        icon: '🔥',
        attacks: [
            { name: 'Llama del Fin', type: 'Fuego', baseDmg: 9, diceCount: 2, effect: 'charge_next', desc: '⚡ Carga cataclísmica: +3 daño en el próximo turno.' },
            { name: 'Erupción Telúrica', type: 'Tierra', baseDmg: 8, diceCount: 2, effect: 'force_switch', desc: '🦡 Sismo volcánico que expulsa al rival del combate.' }
        ]
    },
    {
        id: 'mon_leg_water',
        name: 'Hydragón Marino',
        biome: 'freshwater',
        type: 'Agua',
        weakness: 'Eléctrico',
        hp: 28,
        maxHp: 28,
        speed: 8,
        captureTier: 4,
        isLegendary: true,
        overworldAbility: OVERWORLD_ABILITIES.water,
        icon: '🐉',
        attacks: [
            { name: 'Tsunami Celestial', type: 'Agua', baseDmg: 9, diceCount: 2, effect: 'drowsy', desc: '💤 Maremoto somnoliento (+1 daño a todos los ataques recibidos).' },
            { name: 'Tormenta de Escarcha', type: 'Hielo', baseDmg: 8, diceCount: 1, effect: 'paralyze', desc: '❄️ Congela y paraliza al rival (Velocidad 0).' }
        ]
    },
    {
        id: 'mon_leg_dragon',
        name: 'Bahamut Abisal',
        biome: 'saltwater',
        type: 'Dragón',
        weakness: 'Hielo',
        hp: 27,
        maxHp: 27,
        speed: 10,
        captureTier: 4,
        isLegendary: true,
        overworldAbility: OVERWORLD_ABILITIES.flying,
        icon: '🌀',
        attacks: [
            { name: 'Cometa Ancestral', type: 'Dragón', baseDmg: 10, diceCount: 2, effect: null, desc: null },
            { name: 'Aliento Ígneo Supremo', type: 'Fuego', baseDmg: 8, diceCount: 1, effect: 'charge_next', desc: '🔥 Cobertura ígnea anti-Hielo + Carga +3 daño próx. turno.' }
        ]
    }
];

const ITEMS_DATABASE = [
    // --- OBJETOS DE COMBATE ---
    {
        id: 'item_cmb_1',
        name: 'Banda Fuerza',
        category: 'combat',
        cost: 6,
        icon: '🥊',
        desc: '🥊 +1 daño.'
    },
    {
        id: 'item_cmb_2',
        name: 'Chaleco Defensivo',
        category: 'combat',
        cost: 6,
        icon: '🦺',
        desc: '🦺 -1 daño recibido (mín. 1).'
    },
    {
        id: 'item_cmb_3',
        name: 'Garra Rápida',
        category: 'combat',
        cost: 5,
        icon: '⚡',
        desc: '⚡ +2 Vel.'
    },
    {
        id: 'item_cmb_4',
        name: 'Cinta Focus',
        category: 'combat',
        cost: 8,
        icon: '🎗️',
        desc: '🎗️ Sobrevive con 1 HP a golpe letal.'
    },
    {
        id: 'item_cmb_5',
        name: 'Lente Preciso',
        category: 'combat',
        cost: 7,
        icon: '🎯',
        desc: '🎯 Dados 0 ➔ 1.'
    },
    {
        id: 'item_cmb_6',
        name: 'Colmillo Afilado',
        category: 'combat',
        cost: 6,
        icon: '🦷',
        desc: '🦷 +2 daño si ataca 1º.'
    },
    {
        id: 'item_cmb_7',
        name: 'Baya Aranja',
        category: 'combat',
        cost: 4,
        icon: '🫐',
        desc: '🫐 A 0 HP ➔ Recupera 3 HP (1 uso).'
    },
    {
        id: 'item_cmb_8',
        name: 'Casco Dentado',
        category: 'combat',
        cost: 6,
        icon: '🪖',
        desc: '🪖 Atacante sufre 1 daño por golpe.'
    },
    {
        id: 'item_cmb_9',
        name: 'Pesa Recia',
        category: 'combat',
        cost: 7,
        icon: '🏋️',
        desc: '🏋️ +3 Max HP.'
    },
    {
        id: 'item_cmb_10',
        name: 'Cinto Experto',
        category: 'combat',
        cost: 6,
        icon: '🥋',
        desc: '🥋 Golpe supereficaz ➔ +1 daño extra.'
    },
    {
        id: 'item_cmb_11',
        name: 'Baya Caqui',
        category: 'combat',
        cost: 5,
        icon: '🍈',
        desc: '🍈 Inmune a Parálisis y Somnolencia.'
    },

    // --- OBJETOS DE UTILIDAD ---
    {
        id: 'item_utl_1',
        name: 'Botas Ligeras',
        category: 'utility',
        cost: 5,
        icon: '👟',
        desc: '👟 +1 Movimiento.'
    },
    {
        id: 'item_utl_2',
        name: 'Incienso Silvestre',
        category: 'utility',
        cost: 5,
        icon: '🪔',
        desc: '🪔 Buscar: +1 carta.'
    },
    {
        id: 'item_utl_3',
        name: 'Mapa de Rutas',
        category: 'utility',
        cost: 5,
        icon: '🗺️',
        desc: '🗺️ Descubrir zona ➔ +1 🪙.'
    },
    {
        id: 'item_utl_4',
        name: 'Flauta Mágica',
        category: 'utility',
        cost: 6,
        icon: '🪈',
        desc: '🪈 Relanza 1 dado por turno.'
    },
    {
        id: 'item_utl_5',
        name: 'Moneda Amuleto',
        category: 'utility',
        cost: 6,
        icon: '🪙',
        desc: '🪙 Fin de combate ➔ +1 🪙.'
    },
    {
        id: 'item_utl_6',
        name: 'Trébol Dorado',
        category: 'utility',
        cost: 6,
        icon: '🍀',
        desc: '🍀 Al equipar o poseer ➔ +1 🍀.'
    },
    {
        id: 'item_utl_7',
        name: 'Telescopio Explorador',
        category: 'utility',
        cost: 7,
        icon: '🔭',
        desc: '🔭 Buscar: 4 cartas.'
    },
    {
        id: 'item_utl_8',
        name: 'Imán de Tesoros',
        category: 'utility',
        cost: 7,
        icon: '🧲',
        desc: '🧲 Inicio de turno ➔ +1 🪙.'
    },
    {
        id: 'item_utl_9',
        name: 'Cantimplora de Viaje',
        category: 'utility',
        cost: 5,
        icon: '🍶',
        desc: '🍶 Moverse por Agua Dulce o Salada ➔ +1 🍀.'
    }
];

const CHARACTERS_DATABASE = [
    {
        id: 'char_red',
        name: 'Red (El Audaz)',
        title: 'Entrenador Nato',
        icon: '🧢',
        avatarColor: '#d32f2f',
        startingCoins: 2,
        startingLuck: 3,
        startingItemIds: ['item_cmb_7', 'item_cmb_6'],
        starterMonsterId: 'mon_pln_2', // Candilín (Fuego)
        abilityName: 'Determinación Ardiente',
        abilityDesc: 'HP < 50% ➔ +1 daño.'
    },
    {
        id: 'char_blue',
        name: 'Blue (El Estratega)',
        title: 'Táctico Ambicioso',
        icon: '🕶️',
        avatarColor: '#1976d2',
        startingCoins: 2,
        startingLuck: 4,
        startingItemIds: ['item_cmb_1', 'item_utl_5'],
        starterMonsterId: 'mon_frw_1', // Renacuajito (Agua)
        abilityName: 'Primer Golpe & Fortuna',
        abilityDesc: 'Turno 1: +2 Vel. +1 🍀 inicial.'
    },
    {
        id: 'char_misty',
        name: 'Marina (La Pescadora)',
        title: 'Especialista Fluvial',
        icon: '🌊',
        avatarColor: '#00838f',
        startingCoins: 4,
        startingLuck: 3,
        startingItemIds: ['item_utl_1', 'item_cmb_3'],
        starterMonsterId: 'mon_frw_2', // Patiloto (Agua)
        abilityName: 'Navegante Experta',
        abilityDesc: 'Visitar aguas ➔ +1 🍀. Empieza con 4 🪙 y Botas Ligeras.'
    },
    {
        id: 'char_brock',
        name: 'Flint (El Montañero)',
        title: 'Guardaparques Férreo',
        icon: '🧗',
        avatarColor: '#6d4c41',
        startingCoins: 3,
        startingLuck: 3,
        startingItemIds: ['item_cmb_2', 'item_cmb_8'],
        starterMonsterId: 'mon_for_1', // Hojarín (Planta)
        abilityName: 'Resistencia Rocosa',
        abilityDesc: 'Equipo: +2 Max HP.'
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
        rewardCoins: 3,
        rewardLuck: 1,
        teamMonsterIds: ['mon_for_1', 'mon_for_2'],
        teamsByTier: {
            1: ['mon_for_1', 'mon_for_2'],
            2: ['mon_for_3', 'mon_for_4'],
            3: ['mon_for_5', 'mon_for_6', 'mon_for_7']
        },
        icon: '🏛️',
        desc: '🏛️ Tienda River y Gimnasio Adaptativo.',
        gym: {
            id: 'gym_1',
            name: 'Gimnasio Arbóreo',
            cityName: 'Ciudad Hoja',
            tier: 1,
            badgeName: 'Medalla Hoja',
            badgeIcon: '🍃',
            leaderName: 'Líder Erika',
            rewardCoins: 3,
            rewardLuck: 1,
            teamMonsterIds: ['mon_for_1', 'mon_for_2'],
            teamsByTier: {
                1: ['mon_for_1', 'mon_for_2'],
                2: ['mon_for_3', 'mon_for_4'],
                3: ['mon_for_5', 'mon_for_6', 'mon_for_7']
            }
        },
        locationAction: {
            name: 'Mercado de la Hoja',
            type: 'trade',
            costCoins: 2,
            gainLuck: 1,
            desc: '2 🪙 ➔ +1 🍀'
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
        rewardCoins: 4,
        rewardLuck: 1,
        teamMonsterIds: ['mon_mtn_3', 'mon_mtn_4'],
        teamsByTier: {
            1: ['mon_mtn_1', 'mon_mtn_2'],
            2: ['mon_mtn_3', 'mon_mtn_4'],
            3: ['mon_mtn_6', 'mon_mtn_7', 'mon_mtn_5']
        },
        icon: '🏛️',
        desc: '🏛️ Tienda River y Gimnasio Adaptativo.',
        gym: {
            id: 'gym_2',
            name: 'Gimnasio Cumbre',
            cityName: 'Ciudad Pico',
            tier: 2,
            badgeName: 'Medalla Risco',
            badgeIcon: '⛰️',
            leaderName: 'Líder Brock',
            rewardCoins: 4,
            rewardLuck: 1,
            teamMonsterIds: ['mon_mtn_3', 'mon_mtn_4'],
            teamsByTier: {
                1: ['mon_mtn_1', 'mon_mtn_2'],
                2: ['mon_mtn_3', 'mon_mtn_4'],
                3: ['mon_mtn_6', 'mon_mtn_7', 'mon_mtn_5']
            }
        },
        locationAction: {
            name: 'Fundición Montañesa',
            type: 'trade',
            costLuck: 1,
            gainCoins: 2,
            desc: '1 🍀 ➔ +2 🪙'
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
        rewardCoins: 5,
        rewardLuck: 2,
        teamMonsterIds: ['mon_frw_5', 'mon_ocn_5'],
        teamsByTier: {
            1: ['mon_frw_1', 'mon_frw_2'],
            2: ['mon_frw_3', 'mon_ocn_3'],
            3: ['mon_frw_5', 'mon_ocn_5', 'mon_frw_7']
        },
        icon: '🏛️',
        desc: '🏛️ Tienda River, Gimnasio y Puerto Marítimo.',
        isPort: true,
        gym: {
            id: 'gym_3',
            name: 'Gimnasio Marejada',
            cityName: 'Ciudad Puerto',
            tier: 3,
            badgeName: 'Medalla Cascada',
            badgeIcon: '💧',
            leaderName: 'Líder Misty',
            rewardCoins: 5,
            rewardLuck: 2,
            teamMonsterIds: ['mon_frw_5', 'mon_ocn_5'],
            teamsByTier: {
                1: ['mon_frw_1', 'mon_frw_2'],
                2: ['mon_frw_3', 'mon_ocn_3'],
                3: ['mon_frw_5', 'mon_ocn_5', 'mon_frw_7']
            }
        },
        locationAction: {
            name: 'Embarcadero de Ciudad Puerto',
            type: 'port_travel',
            desc: '⛵ Viaje Portuario: Navega a cualquier otro Puerto en el tablero.'
        }
    },
    {
        id: 'city_flama',
        cardType: 'city',
        biome: 'city',
        name: 'Ciudad Flama',
        gymId: 'gym_4',
        gymName: 'Gimnasio Volcán',
        tier: 3,
        badgeName: 'Medalla Volcán',
        badgeIcon: '🔥',
        leaderName: 'Líder Blaine',
        rewardCoins: 6,
        rewardLuck: 2,
        teamMonsterIds: ['mon_pln_6', 'mon_pln_7'],
        teamsByTier: {
            1: ['mon_pln_1', 'mon_pln_2'],
            2: ['mon_pln_3', 'mon_pln_4'],
            3: ['mon_pln_5', 'mon_pln_6', 'mon_pln_7']
        },
        icon: '🏛️',
        desc: '🏛️ Tienda River y Gimnasio Adaptativo.',
        gym: {
            id: 'gym_4',
            name: 'Gimnasio Volcán',
            cityName: 'Ciudad Flama',
            tier: 3,
            badgeName: 'Medalla Volcán',
            badgeIcon: '🔥',
            leaderName: 'Líder Blaine',
            rewardCoins: 6,
            rewardLuck: 2,
            teamMonsterIds: ['mon_pln_6', 'mon_pln_7'],
            teamsByTier: {
                1: ['mon_pln_1', 'mon_pln_2'],
                2: ['mon_pln_3', 'mon_pln_4'],
                3: ['mon_pln_5', 'mon_pln_6', 'mon_pln_7']
            }
        },
        locationAction: {
            name: 'Altar de la Flama',
            type: 'special',
            desc: 'Roba 2 cartas de entorno, +1 🍀'
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
        locationAction: {
            name: 'Cosecha',
            type: 'special',
            desc: '🫐 +1 Baya Aranja, +1 🍀'
        }
    },
    {
        id: 'loc_for_2',
        cardType: 'environment',
        name: 'Bazar del Claro',
        biome: 'forest',
        icon: '🏕️',
        locationAction: {
            name: 'Trueque',
            type: 'trade',
            costCoins: 2,
            gainLuck: 1,
            desc: '2 🪙 ➔ +1 🍀'
        }
    },
    {
        id: 'loc_for_3',
        cardType: 'environment',
        name: 'Arboleda de Sabiduría',
        biome: 'forest',
        icon: '🦉',
        locationAction: {
            name: 'Enseñanza',
            type: 'special',
            desc: '1 🍀 ➔ Enseña 1 ataque básico'
        }
    },
    {
        id: 'loc_for_4',
        cardType: 'environment',
        name: 'Santuario del Druida',
        biome: 'forest',
        icon: '⛩️',
        locationAction: {
            name: 'Bendición',
            type: 'special',
            desc: '+1 Max HP a 1 criatura, +1 🪙'
        }
    },

    // --- MONTAÑA (Mountain) ---
    {
        id: 'loc_mtn_1',
        cardType: 'environment',
        name: 'Mina de Piedra Oro',
        biome: 'mountain',
        icon: '⛏️',
        locationAction: {
            name: 'Extracción',
            type: 'trade',
            costLuck: 1,
            gainCoins: 2,
            desc: '1 🍀 ➔ +2 🪙'
        }
    },
    {
        id: 'loc_mtn_2',
        cardType: 'environment',
        name: 'Refugio de los Picos',
        biome: 'mountain',
        icon: '🏔️',
        locationAction: {
            name: 'Brebaje',
            type: 'trade',
            costCoins: 2,
            gainLuck: 1,
            desc: '2 🪙 ➔ +1 🍀'
        }
    },
    {
        id: 'loc_mtn_3',
        cardType: 'environment',
        name: 'Nido del Águila',
        biome: 'mountain',
        icon: '🦅',
        locationAction: {
            name: 'Otear',
            type: 'special',
            desc: 'Roba 2 cartas de entorno'
        }
    },
    {
        id: 'loc_mtn_4',
        cardType: 'environment',
        name: 'Cueva de los Fósiles',
        biome: 'mountain',
        icon: '🦴',
        locationAction: {
            name: 'Excavación',
            type: 'trade',
            costLuck: 1,
            gainCoins: 2,
            desc: '1 🍀 ➔ +2 🪙'
        }
    },

    // --- PRADERA (Plains) ---
    {
        id: 'loc_pln_1',
        cardType: 'environment',
        name: 'Molino de los Vientos',
        biome: 'plains',
        icon: '🌾',
        locationAction: {
            name: 'Comercio',
            type: 'trade',
            costCoins: 2,
            gainLuck: 1,
            desc: '2 🪙 ➔ +1 🍀'
        }
    },
    {
        id: 'loc_pln_2',
        cardType: 'environment',
        name: 'Feria Ambulante',
        biome: 'plains',
        icon: '🎪',
        locationAction: {
            name: 'Puesto Callejero',
            type: 'special',
            desc: 'Tienda River (-1 🪙)'
        }
    },
    {
        id: 'loc_pln_3',
        cardType: 'environment',
        name: 'Establo de los Relámpagos',
        biome: 'plains',
        icon: '⚡',
        locationAction: {
            name: 'Sobrecarga',
            type: 'trade',
            costCoins: 2,
            gainLuck: 1,
            desc: '2 🪙 ➔ +1 🍀'
        }
    },
    {
        id: 'loc_pln_4',
        cardType: 'environment',
        name: 'Llanura de Duelos',
        biome: 'plains',
        icon: '⚔️',
        locationAction: {
            name: 'Desafío',
            type: 'special',
            desc: '1 🍀 ➔ +2 🪙'
        }
    },

    // --- AGUA DULCE (Freshwater) ---
    {
        id: 'loc_frw_1',
        cardType: 'environment',
        name: 'Cascada Cristalina',
        biome: 'freshwater',
        icon: '🏞️',
        locationAction: {
            name: 'Bautismo',
            type: 'special',
            desc: '+1 🍀'
        }
    },
    {
        id: 'loc_frw_2',
        cardType: 'environment',
        name: 'Muelle del Pescador',
        biome: 'freshwater',
        icon: '🎣',
        isPort: true,
        locationAction: {
            name: 'Muelle Fluvial',
            type: 'port_travel',
            desc: '⛵ Viaje Portuario: Navega a cualquier otro Puerto en el tablero.'
        }
    },
    {
        id: 'loc_frw_3',
        cardType: 'environment',
        name: 'Santuario del Renacer',
        biome: 'freshwater',
        icon: '🪷',
        locationAction: {
            name: 'Rescate de Criatura',
            type: 'special',
            desc: '🕊️ Rescata 1 monstruo del descarte y añádelo a tu equipo.'
        }
    },

    // --- AGUA SALADA (Saltwater) ---
    {
        id: 'loc_ocn_port',
        cardType: 'environment',
        name: 'Puerto Ultramar',
        biome: 'saltwater',
        icon: '⚓',
        isPort: true,
        locationAction: {
            name: 'Embarcadero de Ultramar',
            type: 'port_travel',
            desc: '⛵ Viaje Portuario: Navega a cualquier otro Puerto en el tablero.'
        }
    },
    {
        id: 'loc_ocn_1',
        cardType: 'environment',
        name: 'Arrecife Resplandeciente',
        biome: 'saltwater',
        icon: '🪸',
        locationAction: {
            name: 'Perlas',
            type: 'trade',
            costLuck: 1,
            gainCoins: 2,
            desc: '1 🍀 ➔ +2 🪙'
        }
    },
    {
        id: 'loc_ocn_2',
        cardType: 'environment',
        name: 'Navío Naufragado',
        biome: 'saltwater',
        icon: '🏴‍☠️',
        locationAction: {
            name: 'Saqueo',
            type: 'special',
            desc: '+2 🪙, +1 Baya Aranja'
        }
    },
    {
        id: 'loc_ocn_3',
        cardType: 'environment',
        name: 'Vórtice Legendario',
        biome: 'saltwater',
        icon: '🌀',
        tier: 3,
        locationAction: {
            name: 'Invocación Mítica',
            type: 'special',
            desc: '2 🍀 ➔ Busca monstruos Legendarios (T4)'
        }
    }
];

const ANCESTRAL_ATTACKS = [
    { name: 'Danza de Espinas', type: 'Planta', baseDmg: 3, diceCount: 1, effect: null, desc: null },
    { name: 'Ignición Mística', type: 'Fuego', baseDmg: 3, diceCount: 1, effect: null, desc: null },
    { name: 'Chorro Torrencial', type: 'Agua', baseDmg: 3, diceCount: 1, effect: null, desc: null },
    { name: 'Electrochoque', type: 'Eléctrico', baseDmg: 2, diceCount: 1, effect: 'paralyze', desc: '⚡ Paraliza (Velocidad 0).' },
    { name: 'Muralla de Granito', type: 'Roca', baseDmg: 2, diceCount: 1, effect: 'shield_next', desc: '🛡️ Escudo -2 próx. turno.' },
    { name: 'Veneno Arácnido', type: 'Bicho', baseDmg: 2, diceCount: 1, effect: 'poison', desc: '☠️ Veneno (-1 HP/turno).' }
];

const EXPANSION_DECKS = {
    tier2: {
        id: 'tier2',
        name: 'Expansión Tier 2: Vigor Silvestre',
        unlockAtGymsCount: 1,
        desc: 'Desbloqueada tras derrotar el 1er Gimnasio. Introduce criaturas y cartas de Tier 2.',
        monsters: MONSTERS_DATABASE.filter(m => m.captureTier === 2)
    },
    tier3: {
        id: 'tier3',
        name: 'Expansión Tier 3: Poder Titánico',
        unlockAtGymsCount: 2,
        desc: 'Desbloqueada tras derrotar el 2do Gimnasio. Introduce criaturas de Tier 3 y el Vórtice Legendario.',
        monsters: MONSTERS_DATABASE.filter(m => m.captureTier === 3)
    },
    tier4: {
        id: 'tier4',
        name: 'Expansión Tier 4: Leyendas Ancestrales',
        unlockAtGymsCount: 3,
        desc: 'Desbloqueada tras derrotar el 3er Gimnasio. Despierta a las criaturas Legendarias de Tier 4.',
        monsters: MONSTERS_DATABASE.filter(m => m.captureTier === 4)
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
window.ANCESTRAL_ATTACKS = ANCESTRAL_ATTACKS;