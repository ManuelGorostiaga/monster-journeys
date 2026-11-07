# Monster Journeys - Prototipo de Juego de Mesa

Prototipo jugable en HTML5 / JavaScript / CSS para testear todas las mecánicas del juego de mesa estilo *Sinnoh Journeys*.

- **Jugar Online (Producción)**: [https://monster-journeys.vercel.app](https://monster-journeys.vercel.app)
- **Repositorio**: [https://github.com/ManuelGorostiaga/monster-journeys](https://github.com/ManuelGorostiaga/monster-journeys)

## Cómo Ejecutar
Abre `index.html` directamente en tu navegador (Google Chrome, Microsoft Edge, Firefox). No requiere servidores externos ni dependencias.

Para recompilar el juego tras hacer cambios en los módulos:
```bash
node build.js
```

Para correr la suite de tests automatizados:
```bash
node test-suite.js
```

## Características Implementadas
1. **Soporte de 1 a 4 Jugadores (Modo Solitario / Hotseat):** Configura de 1 a 4 jugadores y contrólalos todos tú mismo para probar el equilibrio del juego.
2. **Tablero Hexagonal (18 x 12):**
   - Perímetro exterior 100% rodeado de Agua Salada (Océano).
   - 5 Biomas: Bosque, Montaña, Pradera, Agua Dulce y Agua Salada.
   - 4 Ciudades con Gimnasios (Líderes Erika, Brock, Misty, Blaine) espaciadas a más de 5 casilleros de distancia entre sí (distancias de 7 a 14 casillas).
   - 50% de las casillas contienen Puntos de Interés (Bayas, Cofres con monedas, Altares, Aguas termales, Torres de vigía, Fósiles).
3. **Mazo de Encuentro Salvaje:**
   - Robas 3 cartas del bioma actual con dorsos temáticos diferentes.
   - No hay combate salvaje: puedes capturar si tienes la herramienta de tier adecuado (Tier 1 a 4) o enseñar su técnica si has ganado suficientes medallas de gimnasio (Tier 1 a 4).
4. **Tienda River de 8 Cartas:**
   - Siempre mantiene exactamente 8 cartas de objetos visibles.
   - **Garantía sin duplicados:** Nunca hay dos objetos repetidos en el river. Se repone al instante.
   - Categorías: Herramientas de captura, Objetos de combate y Objetos de utilidad.
5. **Combate 1v1:**
   - Dados de ataque con caras `[0, 1, 1, 1, 1, 2]`.
   - Tabla de debilidades con etiqueta `Weak +2` en cada carta (añade +2 daño si el ataque explota la debilidad, sin resistencias ni inmunidades).
   - Iniciativa por Velocidad al inicio del turno: la criatura más rápida actúa primero (puede elegir su ataque o cambiar de monstruo). Cambiar de criatura consume el turno del jugador (sin penalización de daño gratuito inmediato). Los ataques no son simultáneos; quien actúa primero elige su ataque primero. Si el rival sobrevive y no ha actuado en el turno, realiza su acción a continuación.
   - Puntos de Suerte 🍀 en combate: permiten tirar de vuelta los dados de ataque en vez de sumar daño plano adicional.
   - Los NPCs no cambian de criatura voluntariamente.
   - Recompensa de dinero garantizada incluso en derrota.
   - Curación total del equipo tras cada pelea.
   - Posibilidad de aprender el ataque del rival derrotado.
6. **Tablero Personal del Jugador:**
   - 4 espacios para criaturas (3 activos de combate + 1 en reserva de tablero). Criaturas extra van a la caja de reserva.
   - Diales interactivos para ajustar y trackear la salud (HP).
   - Máximo 1 objeto equipado por criatura.
   - Mano de cartas de objetos en inventario.
   - Reordenamiento libre de la alineación en cualquier momento.
   - Habilidades de mapa (Overworld) por tipo de criatura (Vuelo, Nado, Rastreo, Calor, etc.).
7. **Torneo Final (Ronda 20):**
   - 1 Jugador: Reto Boss Gauntlet contra Campeones de Élite.
   - 2 Jugadores: Duelo al Mejor de 3.
   - 3 Jugadores: Torneo Triangular por puntos.
   - 4 Jugadores: Playoffs (Semifinales, 3er Puesto y Gran Final).
   - Botón de testeo rápido: "Ir a Ronda 20 (Probar Torneo)" en la barra superior.
