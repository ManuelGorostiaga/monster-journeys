const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, 'css', 'styles.css'), 'utf8');
const soundJs = fs.readFileSync(path.join(__dirname, 'js', 'sound.js'), 'utf8');
const dataJs = fs.readFileSync(path.join(__dirname, 'js', 'data.js'), 'utf8');
const cardmapJs = fs.readFileSync(path.join(__dirname, 'js', 'cardmap.js'), 'utf8');
const combatJs = fs.readFileSync(path.join(__dirname, 'js', 'combat.js'), 'utf8');
const tournamentJs = fs.readFileSync(path.join(__dirname, 'js', 'tournament.js'), 'utf8');
const gameJs = fs.readFileSync(path.join(__dirname, 'js', 'game.js'), 'utf8');
const uiJs = fs.readFileSync(path.join(__dirname, 'js', 'ui.js'), 'utf8');

const htmlTemplate = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Monster Journeys - Prototipo de Juego de Mesa (1 a 4 Jugadores)</title>
    <style>
${css}
    </style>
</head>
<body>
    <!-- TOP APP HEADER -->
    <header class="app-header">
        <div class="header-left">
            <h1 class="app-title">🃏 Monster Journeys</h1>
            <div class="round-tracker">
                <span>Ronda:</span>
                <strong id="display-round">1 / 20</strong>
            </div>
        </div>

        <div class="header-center">
            <div class="turn-indicator">
                <span>Turno:</span>
                <strong id="display-active-player" style="margin-left: 4px;">Jugador 1</strong>
            </div>
            <span id="status-movement" class="status-pill tag-success">Movimiento: Disponible</span>
            <span id="status-action" class="status-pill tag-primary">Acción: Disponible</span>
        </div>

        <div class="header-right">
            <button id="btn-header-codex" class="btn-header btn-header-codex">📚 Códice</button>
            <button id="btn-sound-toggle" class="btn-header">🔊 Sonido</button>
            <button id="btn-rules" class="btn-header">📖 Reglas (31)</button>
            <button id="btn-header-reset" class="btn-header btn-header-reset">🔄 Reiniciar</button>
        </div>
    </header>

    <!-- DEBUG TOOLBAR -->
    <div class="debug-toolbar">
        <span class="debug-label">🛠️ Test Controls:</span>
        <button id="btn-dbg-coins" class="btn-debug">+10 🪙 Monedas</button>
        <button id="btn-dbg-luck" class="btn-debug">+5 🍀 Suerte</button>
        <button id="btn-dbg-badges" class="btn-debug">🏅 3 Medallas (Torneo)</button>
        <button id="btn-dbg-heal" class="btn-debug">💖 Curar Equipo</button>
        <button id="btn-dbg-expansion" class="btn-debug">📦 +1 Expansión</button>
        <button id="btn-dbg-tournament" class="btn-debug" style="background: #7c2d12; color: #ffedd5; font-weight: bold;">🏆 Forzar Torneo</button>
    </div>

    <!-- MAIN WORKSPACE -->
    <main class="main-workspace">
        <!-- CARD MAP BOARD (Interconnected Card Node System) -->
        <div class="map-view-card">
            <div class="map-header-bar">
                <div class="map-legend">
                    <span style="font-weight: bold; color: #fbbf24;">Tablero de Nodos de Cartas Interconectadas:</span>
                    <div class="legend-item"><span class="legend-color" style="background: #475569;"></span> 🏛️ Ciudad</div>
                    <div class="legend-item"><span class="legend-color" style="background: #2e7d32;"></span> 🌲 Bosque</div>
                    <div class="legend-item"><span class="legend-color" style="background: #6d4c41;"></span> ⛰️ Montaña</div>
                    <div class="legend-item"><span class="legend-color" style="background: #f59e0b;"></span> 🌾 Pradera</div>
                    <div class="legend-item"><span class="legend-color" style="background: #0284c7;"></span> 💧 Agua Dulce</div>
                    <div class="legend-item"><span class="legend-color" style="background: #1e3a8a;"></span> 🌊 Agua Salada</div>
                </div>
                <div style="font-size: 0.78rem; color: #94a3b8;">
                    💡 Haz clic en una carta adyacente para moverte o en un casillero vacío <strong>(+)</strong> para colocar una carta y descubrir zona.
                </div>
            </div>

            <!-- Scrollable / Drag Tabletop Viewport -->
            <div id="card-board-viewport" class="card-board-viewport">
                <div id="card-board-grid" class="card-board-grid"></div>
            </div>

            <!-- ACTION CONTROLS BAR -->
            <div class="action-controls-bar">
                <div class="action-buttons-group">
                    <button id="btn-act-search" class="btn-action btn-action-primary">
                        🔍 Buscar Monstruos (Salvajes)
                    </button>
                    <button id="btn-act-gym" class="btn-action btn-action-fight" style="display: none;">
                        🏛️ Desafiar Gimnasio
                    </button>
                    <button id="btn-act-shop" class="btn-action btn-action-primary">
                        🛒 Tienda River (8 Cartas)
                    </button>
                    <button id="btn-act-loc-action" class="btn-action btn-action-action">
                        🔄 Acción de Lugar
                    </button>
                    <button id="btn-act-travel" class="btn-action">
                        ✈️ Viajar a otra Ciudad
                    </button>
                </div>

                <div>
                    <button id="btn-act-endturn" class="btn-action btn-action-primary" style="background: linear-gradient(180deg, #10b981, #059669); border-color: #34d399;">
                        ⏭️ Terminar Turno
                    </button>
                </div>
            </div>
        </div>

        <!-- PLAYER DASHBOARD -->
        <div class="player-dashboard-card">
            <!-- Player Tabs Switcher -->
            <div id="player-tabs-bar" class="player-tabs-bar"></div>

            <!-- Player Info & Resources Banner -->
            <div class="player-info-banner">
                <div class="character-card-preview">
                    <div id="board-char-icon" class="char-avatar-frame">🧢</div>
                    <div>
                        <div id="board-player-name" style="font-size: 0.8rem; color: #94a3b8; font-weight: bold;">Jugador 1</div>
                        <div id="board-char-title" class="char-title-text">Rojo (Entrenador Legendario)</div>
                        <div id="board-char-ability" class="char-ability-text">Habilidad: Determinación (+1 al daño cuando HP &lt; 50%)</div>
                    </div>
                </div>

                <div class="player-resources">
                    <div class="resource-box">
                        <span class="resource-label">Monedas de Oro</span>
                        <span id="board-coins-val" class="resource-value">10 🪙</span>
                    </div>

                    <div class="resource-box">
                        <span class="resource-label">Puntos de Suerte</span>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span id="board-luck-val" class="resource-value luck-val">3 🍀</span>
                            <button class="btn-action-small" style="width: auto; padding: 2px 8px; background: #065f46; border-color: #34d399;" onclick="UI.game.draftLocationCard(UI.game.getActivePlayer())">
                                + Draftear (1🍀)
                            </button>
                        </div>
                    </div>

                    <div class="resource-box">
                        <span class="resource-label">Medallas (3 para Clasificar!)</span>
                        <div id="board-badges-list" class="badges-row"></div>
                    </div>
                </div>
            </div>

            <!-- LOCATION CARDS HAND (Requirement 1 & 6) -->
            <div class="location-hand-section">
                <div class="section-header-row">
                    <div class="section-title-tag">
                        <span>🗺️ Mano de Exploración (Cartas de Entorno en Mano - Robas hasta 5):</span>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-action-small" style="width: auto; background: #065f46; border-color: #34d399;" onclick="UI.game.draftLocationCard(UI.game.getActivePlayer())">
                            🍀 Draftear 3 Cartas (1 Suerte)
                        </button>
                    </div>
                </div>
                <div id="location-hand-cards-list" class="location-cards-row"></div>
            </div>

            <!-- CREATURE SLOTS ON PERSONAL BOARD (Rule 24 & Rule 3) -->
            <div class="creature-board-section">
                <div class="section-header-row">
                    <div class="section-title-tag">
                        <span>👾 Tablero Personal de Criaturas (3 en Combate + 1 en Reserva):</span>
                    </div>
                    <span style="font-size: 0.72rem; color: #94a3b8;">
                        Regla 27: Puedes cambiar el orden en cualquier momento fuera de combate.
                    </span>
                </div>
                <div id="creature-slots-container" class="creature-slots-grid"></div>
            </div>

            <!-- HAND OF ITEMS / INVENTORY (Rule 24) -->
            <div class="items-hand-section">
                <div class="section-header-row">
                    <div class="section-title-tag">
                        <span>🎒 Mano de Cartas de Objetos (Herramientas, Combate y Utilidad):</span>
                    </div>
                    <span style="font-size: 0.72rem; color: #94a3b8;">
                        Regla 10: Máximo 1 objeto equipado por criatura.
                    </span>
                </div>
                <div id="board-inventory-items" class="inventory-cards-grid"></div>
            </div>
        </div>

        <!-- GAME EVENT LOG -->
        <div class="game-log-panel">
            <div style="font-weight: bold; color: #fbbf24; margin-bottom: 4px;">📜 Registro de Eventos de la Partida:</div>
            <div id="game-event-log"></div>
        </div>
    </main>

    <!-- ========================================================
         MODALS
         ======================================================== -->

    <!-- MODAL: CODEX / COMPENDIO (Requirement 3) -->
    <div id="modal-codex" class="modal-backdrop">
        <div class="modal-dialog codex-dialog">
            <div class="modal-header">
                <h3>📚 Códice del Mundo: Criaturas, Ataques, Objetos y Áreas</h3>
                <button class="modal-close-btn" onclick="UI.hideCodexModal()">✕</button>
            </div>
            <div class="codex-tabs-bar">
                <button class="codex-tab-btn active" data-tab="monsters" onclick="UI.setCodexTab('monsters')">👾 Monstruos (32)</button>
                <button class="codex-tab-btn" data-tab="attacks" onclick="UI.setCodexTab('attacks')">⚔️ Ataques</button>
                <button class="codex-tab-btn" data-tab="items" onclick="UI.setCodexTab('items')">🎒 Objetos (20)</button>
                <button class="codex-tab-btn" data-tab="areas" onclick="UI.setCodexTab('areas')">🗺️ Áreas y Ciudades (23)</button>
            </div>
            <div class="modal-body">
                <div class="codex-controls-row">
                    <input type="text" id="codex-search-input" class="codex-search-input" placeholder="🔍 Buscar por nombre, tipo, efecto..." oninput="UI.onCodexSearch(this.value)">
                    <div id="codex-filter-chips" class="codex-filters-group"></div>
                </div>
                <div id="codex-content-grid" class="codex-cards-grid"></div>
            </div>
        </div>
    </div>

    <!-- MODAL: PLACE CARD / PLANT CITY -->
    <div id="modal-place-card" class="modal-backdrop">
        <div class="modal-dialog" style="max-width: 860px;">
            <div class="modal-header">
                <h3>🗺️ Descubrir Nueva Zona: Elige qué carta colocar</h3>
                <button class="modal-close-btn" onclick="document.getElementById('modal-place-card').classList.remove('open')">✕</button>
            </div>
            <div class="modal-body">
                <p style="font-size: 0.85rem; color: #cbd5e1;">
                    Elige una carta de tu Mano de Entorno para descubrir este bioma, o funda la siguiente Ciudad del Mazo de Ciudades (siempre disponible para cualquier jugador):
                </p>
                <div id="place-card-options" class="location-cards-row" style="flex-wrap: wrap; justify-content: center;"></div>
            </div>
        </div>
    </div>

    <!-- MODAL: LOCATION ACTION (RESOURCE TRADING & SPECIALS) -->
    <div id="modal-location-action" class="modal-backdrop">
        <div class="modal-dialog" style="max-width: 520px;">
            <div class="modal-header">
                <h3 id="loc-action-title">🔄 Acción de Localización</h3>
                <button class="modal-close-btn" onclick="document.getElementById('modal-location-action').classList.remove('open')">✕</button>
            </div>
            <div class="modal-body">
                <div id="loc-action-body"></div>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button id="btn-confirm-loc-action" class="btn-action btn-action-primary" style="flex: 1; justify-content: center;">
                        Ejecutar Acción
                    </button>
                    <button class="btn-action" style="flex: 1; justify-content: center;" onclick="document.getElementById('modal-location-action').classList.remove('open')">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- MODAL: DRAFT LOCATION (Requirement 3: Spend 1 Luck to Draft 3) -->
    <div id="modal-draft-location" class="modal-backdrop">
        <div class="modal-dialog" style="max-width: 720px;">
            <div class="modal-header">
                <h3>🍀 Drafteo de Cartas de Localización (Miras 3, eliges 1)</h3>
            </div>
            <div class="modal-body">
                <p style="font-size: 0.85rem; color: #cbd5e1;">
                    Has gastado 1 Punto de Suerte 🍀 para consultar el mazo de exploración. Elige la carta que prefieres añadir a tu mano:
                </p>
                <div id="draft-cards-grid" class="location-cards-row" style="justify-content: center;"></div>
            </div>
        </div>
    </div>

    <!-- MODAL: SEARCH ENCOUNTER (Rule 7, 6, 30 + Luck Redraw) -->
    <div id="modal-search" class="modal-backdrop">
        <div class="modal-dialog" style="max-width: 860px;">
            <div class="modal-header">
                <h3>🔍 Mazo de Encuentro Salvaje (Miras 3 cartas)</h3>
                <button class="modal-close-btn" onclick="UI.hideSearchModal()">✕</button>
            </div>
            <div class="modal-body">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <p style="font-size: 0.85rem; color: #cbd5e1; margin: 0;">
                        Elige una criatura para <strong>Capturar</strong> o <strong>Aprender su Ataque</strong>:
                    </p>
                    <button id="btn-search-redraw" class="btn-action btn-action-luck">
                        🍀 Redibujar Monstruos (1 Suerte)
                    </button>
                </div>
                <div id="search-cards-grid" class="search-cards-grid"></div>
            </div>
        </div>
    </div>

    <!-- MODAL: RIVER SHOP (Rule 16: exactly 8 cards) -->
    <div id="modal-shop" class="modal-backdrop">
        <div class="modal-dialog" style="max-width: 960px;">
            <div class="modal-header">
                <h3>🛒 Tienda del River (8 Cartas sin duplicados)</h3>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span style="font-weight: bold; color: #fbbf24;">Tus Monedas: <span id="shop-player-coins">10 🪙</span></span>
                    <button class="modal-close-btn" onclick="UI.hideShopModal()">✕</button>
                </div>
            </div>
            <div class="modal-body">
                <p style="font-size: 0.82rem; color: #94a3b8;">
                    <strong>Regla 16:</strong> El river siempre mantiene 8 cartas distintas. Al comprar una carta, se repone inmediatamente sin permitir duplicados en el mostrador. Solo accesible en Ciudades.
                </p>
                <div id="shop-river-grid" class="shop-river-grid"></div>
            </div>
        </div>
    </div>

    <!-- MODAL: COMBAT ARENA -->
    <div id="modal-combat" class="modal-backdrop">
        <div class="modal-dialog" style="max-width: 860px;">
            <div class="modal-header">
                <h3 id="combat-modal-title">⚔️ Arena de Combate 1v1</h3>
            </div>
            <div class="modal-body">
                <div class="combat-arena-board">
                    <!-- Left: Player 1 Fighter -->
                    <div class="combat-fighter-card active-attacker">
                        <div id="combat-p1-mon-icon" class="combat-fighter-avatar">🦖</div>
                        <div id="combat-p1-mon-name" style="font-weight: 800; font-size: 1.1rem; color: #fff;">Monstruo P1</div>
                        <div style="font-size: 0.85rem; font-weight: bold;" id="combat-p1-hp-text">10 / 10 HP</div>
                        <div class="hp-bar-outer"><div id="combat-p1-hp-bar" class="hp-bar-fill" style="width: 100%;"></div></div>
                        <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-top: 4px;">
                            <span id="combat-p1-speed">Vel: 4 ⚡</span>
                            <span id="combat-p1-weak" class="weakness-tag">Weak +2: Planta</span>
                        </div>
                    </div>

                    <div class="combat-vs-divider">VS</div>

                    <!-- Right: Opponent Fighter -->
                    <div class="combat-fighter-card">
                        <div id="combat-p2-mon-icon" class="combat-fighter-avatar">🦅</div>
                        <div id="combat-p2-mon-name" style="font-weight: 800; font-size: 1.1rem; color: #fff;">Oponente</div>
                        <div style="font-size: 0.85rem; font-weight: bold;" id="combat-p2-hp-text">10 / 10 HP</div>
                        <div class="hp-bar-outer"><div id="combat-p2-hp-bar" class="hp-bar-fill" style="width: 100%; background: #ef4444;"></div></div>
                        <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-top: 4px;">
                            <span id="combat-p2-speed">Vel: 4 ⚡</span>
                            <span id="combat-p2-weak" class="weakness-tag">Weak +2: Fuego</span>
                        </div>
                    </div>
                </div>

                <div id="combat-actions-bar" class="combat-actions-bar"></div>

                <div class="combat-log-stream" id="combat-log-stream"></div>
            </div>
        </div>
    </div>

    <!-- MODAL: COMBAT RESULT -->
    <div id="modal-combat-result" class="modal-backdrop">
        <div class="modal-dialog" style="max-width: 520px; text-align: center;">
            <div class="modal-header">
                <h3 id="result-title">🎉 ¡Fin del Combate!</h3>
            </div>
            <div class="modal-body">
                <div id="result-body"></div>
                <button id="btn-result-continue" class="btn-action btn-action-primary" style="margin-top: 14px; width: 100%; justify-content: center;">
                    Continuar Partida
                </button>
            </div>
        </div>
    </div>

    <!-- MODAL: CITY TRAVEL -->
    <div id="modal-travel" class="modal-backdrop">
        <div class="modal-dialog" style="max-width: 620px;">
            <div class="modal-header">
                <h3>✈️ Viaje Rápido entre Ciudades</h3>
                <button class="modal-close-btn" onclick="UI.hideCityTravelModal()">✕</button>
            </div>
            <div class="modal-body">
                <p style="font-size: 0.85rem; color: #cbd5e1;">
                    <strong>Regla 15:</strong> Al encontrarte en una Ciudad, puedes gastar tu acción para desplazarte instantáneamente a cualquier otra Ciudad descubierta en el mapa:
                </p>
                <div id="travel-cities-list" class="travel-cities-list"></div>
            </div>
        </div>
    </div>

    <!-- MODAL: TOURNAMENT (Rule 28) -->
    <div id="modal-tournament" class="modal-backdrop">
        <div class="modal-dialog" style="max-width: 780px;">
            <div class="modal-header">
                <h3>🏆 Gran Torneo de Campeones</h3>
            </div>
            <div class="modal-body">
                <div id="tournament-bracket-view"></div>
            </div>
        </div>
    </div>

    <!-- MODAL: VICTORY -->
    <div id="modal-victory" class="modal-backdrop">
        <div class="modal-dialog" style="max-width: 480px; text-align: center; padding: 20px;">
            <div style="font-size: 3rem; margin-bottom: 8px;">👑</div>
            <h2 style="font-size: 1.6rem; color: #fbbf24; margin-bottom: 6px;">¡TENEMOS UN CAMPEÓN!</h2>
            <h3 id="victory-champion-name" style="font-size: 1.3rem; color: #fff; margin-bottom: 16px;">Jugador 1</h3>
            <p style="color: #cbd5e1; font-size: 0.9rem; margin-bottom: 20px;">
                ¡Ha triunfado en el Gran Torneo Final tras demostrar su destreza en la exploración, la estrategia de mazo y los combates de monstruos!
            </p>
            <button class="btn-action btn-action-primary" style="width: 100%; justify-content: center;" onclick="location.reload()">
                Jugar Otra Partida
            </button>
        </div>
    </div>

    <!-- MODAL: RULES GUIDE -->
    <div id="modal-rules" class="modal-backdrop">
        <div class="modal-dialog" style="max-width: 820px;">
            <div class="modal-header">
                <h3>📖 Reglas Completas del Juego de Mesa</h3>
                <button class="modal-close-btn" onclick="UI.hideRulesModal()">✕</button>
            </div>
            <div class="modal-body" style="font-size: 0.84rem; line-height: 1.6; color: #cbd5e1;">
                <ol style="padding-left: 20px; display: flex; flex-direction: column; gap: 6px;">
                    <li><strong>Monstruos:</strong> Cada monstruo es una carta con vida, velocidad y ataque.</li>
                    <li><strong>Cambio de Monstruo:</strong> En combate puedes cambiar de monstruo o atacar. Si cambias, el entrante recibe el daño sin atacar ese turno.</li>
                    <li><strong>Límite de Equipo:</strong> Máximo 3 monstruos activos en combate + 1 en reserva (4 en tablero personal).</li>
                    <li><strong>Evolución:</strong> Los monstruos no evolucionan.</li>
                    <li><strong>Mazos de Biomas:</strong> Salen de biomas temáticos (Bosque, Montaña, Pradera, Agua Dulce, Agua Salada).</li>
                    <li><strong>Herramientas de Captura:</strong> Cada criatura tiene un tier de captura (1 a 3). Sin la herramienta no puede ser capturada.</li>
                    <li><strong>Mazo de Encuentro:</strong> Al buscar miras las primeras 3 cartas del mazo del bioma y eliges una.</li>
                    <li><strong>Mapa de Región Estilo Pokémon:</strong> Mapa con nodos y rutas interconectadas. Los jugadores inician en diferentes esquinas del mapa (SO, NE, NO, SE). La mayoría de nodos alojan 1 carta de entorno, mientras que los grandes cruces (hubs) alojan hasta 2 cartas.</li>
                    <li><strong>Mazo de Ciudades:</strong> Las Ciudades están en un mazo aparte, siempre plantables para cualquier jugador en cualquier nodo conectado. La tienda solo es accesible desde Ciudades.</li>
                    <li><strong>Objetos Equipados:</strong> Máximo un objeto equipado por monstruo.</li>
                    <li><strong>Sistema de Suerte:</strong> Los puntos de Suerte 🍀 permiten sumar +1 al dado en combate, draftear 3 cartas de entorno en vez de robar 1, o redibujar los 3 monstruos salvajes vistos.</li>
                    <li><strong>Enseñar Ataques:</strong> Al encontrar un monstruo salvaje, puedes elegir capturarlo o que enseñe su técnica de ataque a cualquier criatura de tu equipo.</li>
                    <li><strong>Recuperación:</strong> Los monstruos recuperan toda su salud tras una pelea.</li>
                    <li><strong>Recompensa de Derrota:</strong> Al perder una pelea, obtienes dinero de todas maneras como si hubieras ganado.</li>
                    <li><strong>Viaje Rápido:</strong> Se puede viajar de una ciudad a otra si estás en una ciudad.</li>
                    <li><strong>Tienda River:</strong> 8 cartas de objetos sin duplicados. Al comprar se repone de inmediato. Solo accesible en Ciudades.</li>
                    <li><strong>Habilidades de Overworld:</strong> Los tipos otorgan habilidades especiales en el mapa en vez de la acción normal.</li>
                    <li><strong>Tabla de Debilidades:</strong> Golpe efectivo añade +2 de daño ("Weak +2" en cada carta). Sin resistencias ni inmunidades.</li>
                    <li><strong>Combates:</strong> Duelos 1v1 entre criaturas activas con tirada de dados de ataque.</li>
                    <li><strong>Expansiones de Mazos:</strong> Al inicio el mazo solo contiene cartas de Tier 1. Derrotar al 1er gimnasio añade Tier 2 al mazo, y derrotar al 2do gimnasio añade Tier 3. Hay 3 tiers en total (1, 2 y 3).</li>
                    <li><strong>Condición de Torneo:</strong> Derrotar 3 de los 4 gimnasios disponibles (o alcanzar 20 rondas) activa el Gran Torneo Final!</li>
                </ol>
            </div>
        </div>
    </div>

    <!-- MODAL: SETUP (1 to 4 Players) -->
    <div id="modal-setup" class="modal-backdrop open">
        <div class="modal-dialog" style="max-width: 640px;">
            <div class="modal-header">
                <h3>🎮 Configuración de Partida (1 a 4 Jugadores)</h3>
            </div>
            <div class="modal-body">
                <p style="font-size: 0.88rem; color: #cbd5e1;">
                    Elige el número de jugadores. Si juegas en solitario, podrás controlar a todos los jugadores por turnos para testear todas las mecánicas:
                </p>
                <div style="display: flex; gap: 8px; justify-content: center; margin: 10px 0;">
                    <button class="btn-action btn-count-choice" onclick="selectPlayerCount(1)">1 Jugador (Solo)</button>
                    <button class="btn-action btn-count-choice active" onclick="selectPlayerCount(2)">2 Jugadores</button>
                    <button class="btn-action btn-count-choice" onclick="selectPlayerCount(3)">3 Jugadores</button>
                    <button class="btn-action btn-count-choice" onclick="selectPlayerCount(4)">4 Jugadores</button>
                </div>
                <div id="player-setup-rows"></div>
                <button class="btn-action btn-action-primary" style="width: 100%; justify-content: center; padding: 12px; font-size: 1rem; margin-top: 10px;" onclick="startGameFromSetup()">
                    🚀 Comenzar Partida de Testeo
                </button>
            </div>
        </div>
    </div>

    <!-- TOAST NOTIFICATION -->
    <div id="toast-notification"></div>

    <!-- SCRIPTS -->
    <script>
${soundJs}
${dataJs}
${cardmapJs}
${combatJs}
${tournamentJs}
${gameJs}
${uiJs}

    let selectedCount = 2;

    function selectPlayerCount(count) {
        selectedCount = count;
        document.querySelectorAll('.btn-count-choice').forEach((b, i) => {
            b.classList.toggle('active', i + 1 === count);
        });
        renderSetupRows();
    }

    function renderSetupRows() {
        const container = document.getElementById('player-setup-rows');
        if (!container) return;
        let html = '';
        for (let i = 0; i < selectedCount; i++) {
            const charPreset = CHARACTERS_DATABASE[i % CHARACTERS_DATABASE.length];
            html += \`
                <div class="player-config-row" style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; margin-bottom: 8px; display: grid; grid-template-columns: 140px 1fr 1fr; gap: 10px; align-items: center;">
                    <div>
                        <strong style="color: \${['#ef4444', '#3b82f6', '#10b981', '#8b5cf6'][i]};">Jugador \${i + 1}</strong>
                        <input type="text" id="setup-p\${i}-name" class="setup-input" value="Jugador \${i + 1}" style="background: #1e242d; border: 1px solid #4b5563; color: #fff; padding: 6px; border-radius: 4px; width: 100%; margin-top: 4px;">
                    </div>
                    <div>
                        <label style="font-size: 0.72rem; color: #9ca3af;">Personaje:</label>
                        <select id="setup-p\${i}-char" class="setup-select" style="background: #1e242d; border: 1px solid #4b5563; color: #fff; padding: 6px; border-radius: 4px; width: 100%;">
                            \${CHARACTERS_DATABASE.map(c => \`
                                <option value="\${c.id}" \${c.id === charPreset.id ? 'selected' : ''}>
                                    \${c.icon} \${c.name} (\${c.title})
                                </option>
                            \`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="font-size: 0.72rem; color: #9ca3af;">Monstruo Inicial:</label>
                        <select id="setup-p\${i}-starter" class="setup-select" style="background: #1e242d; border: 1px solid #4b5563; color: #fff; padding: 6px; border-radius: 4px; width: 100%;">
                            <option value="mon_for_1">🌱 Hojarín (Planta)</option>
                            <option value="mon_pln_2">🔥 Candilín (Fuego)</option>
                            <option value="mon_frw_1">💧 Renacuajito (Agua)</option>
                            <option value="mon_mtn_1">🪨 Guijarrón (Roca)</option>
                        </select>
                    </div>
                </div>
            \`;
        }
        container.innerHTML = html;
    }

    function startGameFromSetup() {
        const configs = [];
        for (let i = 0; i < selectedCount; i++) {
            const name = document.getElementById(\`setup-p\${i}-name\`).value || \`Jugador \${i + 1}\`;
            const charId = document.getElementById(\`setup-p\${i}-char\`).value;
            const starterId = document.getElementById(\`setup-p\${i}-starter\`).value;
            configs.push({ name, characterId: charId, starterMonsterId: starterId });
        }
        document.getElementById('modal-setup').classList.remove('open');
        const game = new MonsterJourneyGame();
        window.gameInstance = game;
        UI.init(game);
        game.initGame(configs);
    }

    window.addEventListener('DOMContentLoaded', () => {
        renderSetupRows();
    });
    </script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'index.html'), htmlTemplate, 'utf8');
console.log('Successfully bundled index.html!');
