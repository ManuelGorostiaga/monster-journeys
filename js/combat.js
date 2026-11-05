class CombatEngine {
    constructor(game) {
        this.game = game;
        this.inCombat = false;
        this.battleType = null; // 'gym', 'npc', 'pvp', 'tournament'
        this.player1 = null;
        this.player2 = null; // or null for NPC/Gym
        this.gymData = null;
        this.npcData = null;
        this.combatLog = [];

        this.p1ActiveIndex = 0;
        this.p2ActiveIndex = 0;

        this.p1Team = [];
        this.p2Team = [];

        this.turnNumber = 1;
        this.isProcessing = false;
        this.pendingMoveTeaching = null;
        this.onCombatEndCallback = null;
        this.useLuckNextAttack = false;
    }

    startBattle({ type, player1, player2 = null, gym = null, npc = null, onEnd = null }) {
        this.inCombat = true;
        this.battleType = type;
        this.player1 = player1;
        this.player2 = player2;
        this.gymData = gym;
        this.npcData = npc;
        this.combatLog = [];
        this.turnNumber = 1;
        this.isProcessing = false;
        this.pendingMoveTeaching = null;
        this.onCombatEndCallback = onEnd;
        this.useLuckNextAttack = false;

        // Player 1 team (active top 3 monsters from board)
        this.p1Team = player1.monsters.slice(0, 3).map(m => this.cloneMonster(m));
        this.p1ActiveIndex = 0;

        // Find first alive monster
        const firstAliveP1 = this.p1Team.findIndex(m => m.hp > 0);
        this.p1ActiveIndex = firstAliveP1 >= 0 ? firstAliveP1 : 0;

        // Opponent team
        if (type === 'gym') {
            this.p2Team = gym.teamMonsterIds.map(id => {
                const base = MONSTERS_DATABASE.find(m => m.id === id);
                return this.cloneMonster(base);
            });
            this.p2ActiveIndex = 0;
            this.log(`⚔️ ¡Comienza el combate de gimnasio contra ${gym.leaderName} (${gym.cityName})!`);
        } else if (type === 'npc') {
            this.p2Team = npc.monsters.map(m => this.cloneMonster(m));
            this.p2ActiveIndex = 0;
            this.log(`⚔️ ¡Comienza el combate contra el Entrenador ${npc.name}!`);
        } else if (type === 'pvp' || type === 'tournament') {
            this.p2Team = player2.monsters.slice(0, 3).map(m => this.cloneMonster(m));
            const firstAliveP2 = this.p2Team.findIndex(m => m.hp > 0);
            this.p2ActiveIndex = firstAliveP2 >= 0 ? firstAliveP2 : 0;
            this.log(`⚔️ ¡Duelo entre ${player1.name} y ${player2.name}!`);
        }

        const p1Active = this.p1Team[this.p1ActiveIndex];
        const p2Active = this.p2Team[this.p2ActiveIndex];
        this.log(`${player1.name} envía a ${p1Active.name} (HP: ${p1Active.hp}/${p1Active.maxHp}).`);
        this.log(`${this.getOpponentDisplayName()} envía a ${p2Active.name} (HP: ${p2Active.hp}/${p2Active.maxHp}).`);

        if (window.UI) {
            UI.showCombatModal();
            UI.renderCombatArena();
        }
    }

    cloneMonster(m) {
        return {
            id: m.id,
            name: m.name,
            biome: m.biome,
            type: m.type,
            weakness: m.weakness,
            hp: m.hp,
            maxHp: m.maxHp,
            speed: m.speed,
            captureTier: m.captureTier,
            icon: m.icon,
            attacks: JSON.parse(JSON.stringify(m.attacks)),
            equippedItem: m.equippedItem ? JSON.parse(JSON.stringify(m.equippedItem)) : null,
            focusSashUsed: false,
            berryUsed: false
        };
    }

    getOpponentDisplayName() {
        if (this.gymData) return this.gymData.leaderName;
        if (this.npcData) return this.npcData.name;
        if (this.player2) return this.player2.name;
        return 'Oponente';
    }

    log(msg) {
        this.combatLog.push(msg);
        if (window.UI) {
            UI.updateCombatLog(msg);
        }
    }

    getP1Active() {
        return this.p1Team[this.p1ActiveIndex];
    }

    getP2Active() {
        return this.p2Team[this.p2ActiveIndex];
    }

    // Switch monster for Player 1
    // Rule 2: "En un turno el jugador puede cambiar de monstruo o seguir peleando. Si cambia de monstruo recibe el danio."
    playerSwitchMonster(newIndex) {
        if (this.isProcessing) return;
        if (newIndex === this.p1ActiveIndex) return;
        if (this.p1Team[newIndex].hp <= 0) {
            alert('¡Ese monstruo está debilitado y no puede entrar a luchar!');
            return;
        }

        this.isProcessing = true;
        const oldMon = this.getP1Active();
        this.p1ActiveIndex = newIndex;
        const newMon = this.getP1Active();

        this.log(`🔄 ${this.player1.name} retira a ${oldMon.name} y envía a ${newMon.name}.`);
        this.log(`⚠️ Regla de cambio: ¡${newMon.name} recibe el ataque enemigo sin poder atacar este turno!`);

        SoundFX.step();

        // Opponent gets a free attack on the incoming monster!
        setTimeout(() => {
            const oppMon = this.getP2Active();
            const oppAttack = oppMon.attacks[0];
            this.executeAttack({
                attacker: oppMon,
                defender: newMon,
                attack: oppAttack,
                attackerPlayer: this.player2,
                defenderPlayer: this.player1,
                isFreeAttackOnSwitch: true
            });

            this.checkFaints();
            this.turnNumber++;
            this.isProcessing = false;
            if (window.UI) UI.renderCombatArena();
        }, 600);
    }

    toggleLuckBoost() {
        if (this.isProcessing) return;
        const activePlayer = this.player1;
        if (!activePlayer) return;
        if (!this.useLuckNextAttack && activePlayer.luck <= 0) {
            alert('¡No tienes suficientes Puntos de Suerte 🍀!');
            return;
        }
        this.useLuckNextAttack = !this.useLuckNextAttack;
        if (window.UI) UI.renderCombatArena();
    }

    // Player selects an attack
    playerAttack(attackIndex = 0) {
        if (this.isProcessing) return;
        this.isProcessing = true;

        const p1Mon = this.getP1Active();
        const p2Mon = this.getP2Active();
        const p1Attack = p1Mon.attacks[attackIndex] || p1Mon.attacks[0];

        // Opponent attack choice (NPCs use attack 0; in PvP player 2 chooses)
        const p2Attack = p2Mon.attacks[0];

        // Calculate initiative (Speed + item + abilities)
        let p1Speed = p1Mon.speed;
        let p2Speed = p2Mon.speed;

        if (p1Mon.equippedItem && p1Mon.equippedItem.id === 'item_cmb_3') p1Speed += 2; // Garra Rápida
        if (p2Mon.equippedItem && p2Mon.equippedItem.id === 'item_cmb_3') p2Speed += 2;

        // Blue character ability: +2 Speed on turn 1
        if (this.turnNumber === 1) {
            if (this.player1 && this.player1.characterId === 'char_blue') p1Speed += 2;
            if (this.player2 && this.player2.characterId === 'char_blue') p2Speed += 2;
        }

        const p1GoesFirst = p1Speed > p2Speed || (p1Speed === p2Speed && Math.random() < 0.5);

        this.log(`--- Turno ${this.turnNumber} ---`);
        this.log(`Iniciativa: ${p1GoesFirst ? p1Mon.name : p2Mon.name} es más veloz (${Math.max(p1Speed, p2Speed)} vs ${Math.min(p1Speed, p2Speed)}).`);

        if (p1GoesFirst) {
            this.executeTurnSequence(
                { attacker: p1Mon, defender: p2Mon, attack: p1Attack, attackerPlayer: this.player1, defenderPlayer: this.player2, first: true },
                { attacker: p2Mon, defender: p1Mon, attack: p2Attack, attackerPlayer: this.player2, defenderPlayer: this.player1, first: false }
            );
        } else {
            this.executeTurnSequence(
                { attacker: p2Mon, defender: p1Mon, attack: p2Attack, attackerPlayer: this.player2, defenderPlayer: this.player1, first: true },
                { attacker: p1Mon, defender: p2Mon, attack: p1Attack, attackerPlayer: this.player1, defenderPlayer: this.player2, first: false }
            );
        }
    }

    executeTurnSequence(firstStrike, secondStrike) {
        // Step 1: First strike
        this.executeAttack(firstStrike);
        SoundFX.diceRoll();

        setTimeout(() => {
            const firstTargetFainted = firstStrike.defender.hp <= 0;
            if (window.UI) UI.renderCombatArena();

            if (firstTargetFainted) {
                this.handleFaint(firstStrike.defender, firstStrike.defenderPlayer);
                this.turnNumber++;
                this.isProcessing = false;
                if (window.UI) UI.renderCombatArena();
                return;
            }

            // Step 2: Second strike
            setTimeout(() => {
                this.executeAttack(secondStrike);
                if (window.UI) UI.renderCombatArena();

                const secondTargetFainted = secondStrike.defender.hp <= 0;
                if (secondTargetFainted) {
                    this.handleFaint(secondStrike.defender, secondStrike.defenderPlayer);
                }

                this.turnNumber++;
                this.isProcessing = false;
                if (window.UI) UI.renderCombatArena();
            }, 700);

        }, 700);
    }

    // Rule 31: "Los ataques tiran dados de ataque de 0 1 1 1 1 2 caras. Y eso determina eldanio total."
    // Rule 18: "En combate existe una tabla de debilidades. Si un monstruo ataca a uno contra el que tiene ventaja, el que recibe el ataque recibe 2 puntos adicionales de danio. Las cartas tienen que indicar weak +2 en su propia carta. No hay resistencias ni inmunidades"
    executeAttack({ attacker, defender, attack, attackerPlayer, defenderPlayer, first = false, isFreeAttackOnSwitch = false }) {
        this.log(`💥 ${attacker.name} usa **${attack.name}** contra ${defender.name}!`);

        // Roll dice
        const diceCount = attack.diceCount || 1;
        let { rolls, total: diceSum } = rollDice(diceCount);

        // Check Lente Preciso: turns 0 into 1
        if (attacker.equippedItem && attacker.equippedItem.id === 'item_cmb_5') {
            rolls = rolls.map(r => r === 0 ? 1 : r);
            diceSum = rolls.reduce((a, b) => a + b, 0);
            this.log(`🎯 Lente Preciso convierte las tiradas mínimas a 1.`);
        }

        let damage = (attack.baseDmg || 1) + diceSum;

        // Requirement 3: Luck point spent to add +1 to roll
        let luckBonus = 0;
        if (attackerPlayer && this.useLuckNextAttack && attackerPlayer.luck >= 1) {
            attackerPlayer.luck -= 1;
            this.useLuckNextAttack = false;
            luckBonus = 1;
            damage += luckBonus;
            this.log(`🍀 ¡${attackerPlayer.name} gasta 1 Suerte para sumar +1 al ataque!`);
        }

        // Check Type Weakness: Weak +2!
        let weaknessBonus = 0;
        const isWeak = (defender.weakness === attack.type) || (TYPE_WEAKNESS[defender.type] === attack.type);
        if (isWeak) {
            weaknessBonus = 2;
            damage += weaknessBonus;
            this.log(`⚡ ¡GOLPE EFECTIVO! ${defender.name} tiene debilidad a ${attack.type} (Weak +2 daño).`);
            SoundFX.weaknessHit();
        } else {
            SoundFX.hit();
        }

        // Check Banda Fuerza (+1 daño)
        if (attacker.equippedItem && attacker.equippedItem.id === 'item_cmb_1') {
            damage += 1;
            this.log(`🥊 Banda Fuerza añade +1 al daño total.`);
        }

        // Check Colmillo Afilado (+2 daño si ataca primero)
        if (first && attacker.equippedItem && attacker.equippedItem.id === 'item_cmb_6') {
            damage += 2;
            this.log(`🦷 Colmillo Afilado inflige +2 daño por atacar primero.`);
        }

        // Red character ability: Determinación (+1 dmg if attacker HP < 50%)
        if (attackerPlayer && attackerPlayer.characterId === 'char_red' && attacker.hp <= (attacker.maxHp / 2)) {
            damage += 1;
            this.log(`🔥 Determinación de Red aumenta el daño en +1.`);
        }

        // Defender items: Chaleco Defensivo (-1 daño recibido, min 1)
        if (defender.equippedItem && defender.equippedItem.id === 'item_cmb_2') {
            damage = Math.max(1, damage - 1);
            this.log(`🦺 Chaleco Defensivo reduce el daño en 1.`);
        }

        this.log(`Ataque de **${attack.name}**: ${damage} de daño total.${weaknessBonus > 0 ? ' (¡+2 por debilidad!)' : ''}`);

        // Apply damage to defender
        const initialHp = defender.hp;
        let newHp = initialHp - damage;

        // Requirement 2: Baya Aranja triggers when reaching 0 HP
        if (newHp <= 0 && defender.equippedItem && defender.equippedItem.id === 'item_cmb_7' && !defender.berryUsed) {
            defender.berryUsed = true;
            newHp = 3;
            this.log(`🫐 ¡${defender.name} llega a 0 HP pero consume su Baya Aranja y recupera 3 HP para seguir en combate!`);
        }

        // Check Cinta Focus: survive lethal hit with 1 HP
        if (newHp <= 0 && defender.equippedItem && defender.equippedItem.id === 'item_cmb_4' && !defender.focusSashUsed) {
            newHp = 1;
            defender.focusSashUsed = true;
            this.log(`🎗️ ¡Cinta Focus activada! ${defender.name} sobrevive con 1 HP milagrosamente.`);
        }

        defender.hp = Math.max(0, newHp);
        this.log(`❤️ ${defender.name} recibe ${damage} daño. (Salud restante: ${defender.hp}/${defender.maxHp}).`);

        // Casco Dentado: recoil damage 1 back to attacker
        if (defender.equippedItem && defender.equippedItem.id === 'item_cmb_8' && attacker.hp > 0) {
            attacker.hp = Math.max(0, attacker.hp - 1);
            this.log(`🪖 ¡Casco Dentado hiere a ${attacker.name} por 1 punto de daño reflejado!`);
        }
    }

    checkFaints() {
        const p1Active = this.getP1Active();
        const p2Active = this.getP2Active();

        if (p1Active && p1Active.hp <= 0) {
            this.handleFaint(p1Active, this.player1);
        }
        if (p2Active && p2Active.hp <= 0) {
            this.handleFaint(p2Active, this.player2);
        }
    }

    handleFaint(monster, ownerPlayer) {
        this.log(`💀 ¡${monster.name} ha caído debilitado!`);
        SoundFX.faint();

        // Check if this was a defeated opponent monster that teaches an attack!
        // Rule 29: "Cuando derrotamos a un monstruo en combate le podemos esnseniar ese ataque a uno de nuestros monstruos."
        const isOpponentMonster = (ownerPlayer === this.player2 || !ownerPlayer);
        if (isOpponentMonster && this.player1) {
            this.pendingMoveTeaching = {
                monsterName: monster.name,
                attack: monster.attacks[0],
                sourceMonster: monster
            };
        }

        // Check remaining alive monsters
        const p1Alive = this.p1Team.filter(m => m.hp > 0);
        const p2Alive = this.p2Team.filter(m => m.hp > 0);

        if (p1Alive.length === 0) {
            this.endBattle(false);
            return;
        }

        if (p2Alive.length === 0) {
            this.endBattle(true);
            return;
        }

        // If P2's active fainted, NPC sends next monster automatically
        // Rule 21: "Los npcs no cambian de monstruo" (they only send out next when active faints)
        if (this.getP2Active().hp <= 0) {
            const nextIdx = this.p2Team.findIndex(m => m.hp > 0);
            if (nextIdx >= 0) {
                this.p2ActiveIndex = nextIdx;
                this.log(`➡️ ${this.getOpponentDisplayName()} envía a ${this.getP2Active().name} al campo.`);
            }
        }

        // If P1's active fainted, switch to next alive
        if (this.getP1Active().hp <= 0) {
            const nextIdx = this.p1Team.findIndex(m => m.hp > 0);
            if (nextIdx >= 0) {
                this.p1ActiveIndex = nextIdx;
                this.log(`➡️ ${this.player1.name} envía a ${this.getP1Active().name} al campo.`);
            }
        }
    }

    // End battle
    // Rule 13: "Los monstruos se recuperan la salud despues de una pelea."
    // Rule 14: "Cuando el jugador pierde la pelea, obtiene dinero de todas maneras, como si hubiera ganado."
    endBattle(playerWon) {
        this.isProcessing = false;
        this.log(`🏁 FIN DEL COMBATE: ${playerWon ? `¡VICTORIA para ${this.player1.name}!` : `¡${this.player1.name} ha sido derrotado!`}`);

        let rewardCoins = 6;
        if (this.gymData) {
            rewardCoins = this.gymData.rewardCoins;
        }

        // Amulet Coin bonus
        const hasAmulet = this.player1.inventory.some(i => i.id === 'item_utl_5');
        if (hasAmulet) {
            rewardCoins += 3;
            this.log(`🪙 Moneda Amuleto otorga +3 monedas extras.`);
        }

        // RULE 14: Even if lost, player receives money as if won!
        this.player1.coins += rewardCoins;
        SoundFX.coin();

        if (playerWon) {
            SoundFX.victory();
            this.log(`🎉 ¡Has ganado ${rewardCoins} monedas de oro!`);

            if (this.gymData) {
                // Award Gym Badge & Luck
                if (this.gymData.rewardLuck) {
                    this.player1.luck = (this.player1.luck || 0) + this.gymData.rewardLuck;
                    this.log(`🍀 ¡Obtienes +${this.gymData.rewardLuck} Suerte por vencer en el Gimnasio!`);
                }

                if (!this.player1.badges.includes(this.gymData.tier)) {
                    this.player1.badges.push(this.gymData.tier);
                    this.player1.badges.sort((a, b) => a - b);
                    this.log(`🏅 ¡OBTIENES LA ${this.gymData.badgeName.toUpperCase()}! (Tier ${this.gymData.tier}).`);
                    this.log(`✨ ¡Ahora puedes enseñar ataques de monstruos de Tier ${this.gymData.tier}!`);

                    // Requirement 5: Trigger expansion decks & 3/4 gym check
                    if (this.game && this.game.onGymDefeated) {
                        this.game.onGymDefeated(this.player1, this.gymData);
                    }
                }
            }
        } else {
            this.log(`🪙 REGLA 14: A pesar de la derrota, ¡obtienes ${rewardCoins} monedas de recompensa para recuperarte!`);
        }

        // RULE 13: Monsters fully recover HP after a fight!
        this.player1.monsters.forEach(m => {
            m.hp = m.maxHp;
        });
        this.log(`🌿 Todos tus monstruos han descansado y recuperado el 100% de su salud.`);

        if (window.UI) {
            UI.renderCombatArena();
            UI.showCombatResultModal({
                won: playerWon,
                coins: rewardCoins,
                badge: playerWon && this.gymData ? this.gymData : null,
                moveTeaching: this.pendingMoveTeaching,
                onContinue: () => {
                    this.inCombat = false;
                    if (this.onCombatEndCallback) {
                        this.onCombatEndCallback(playerWon);
                    }
                    if (window.UI) UI.hideCombatModal();
                }
            });
        }
    }
}

window.CombatEngine = CombatEngine;
