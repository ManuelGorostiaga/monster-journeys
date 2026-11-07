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
        this.roundFirst = 1;
        this.activeTurnActor = 1;
        this.actionsTakenThisRound = 0;
        this.bets = [];
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
        this.roundFirst = 1;
        this.activeTurnActor = 1;
        this.actionsTakenThisRound = 0;
        this.bets = [];

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
                if (!base) throw new Error(`Gym monster ${id} not found in MONSTERS_DATABASE`);
                return this.cloneMonster(base);
            });
            this.p2ActiveIndex = 0;
            this.log(`⚔️ ¡Comienza el combate de gimnasio contra ${gym.leaderName} (${gym.cityName}) - Tier Adaptativo ${gym.tier} (${this.p2Team.length} criaturas)!`);
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

        const nonParticipants = this.getNonParticipatingPlayers();
        if (nonParticipants.length > 0 && window.UI && typeof UI.showCombatBettingModal === 'function') {
            UI.showCombatBettingModal({
                nonParticipants,
                contenders: this.getBattleContenders(),
                onComplete: () => {
                    if (window.UI) {
                        UI.showCombatModal();
                        UI.renderCombatArena();
                    }
                    this.startRound();
                }
            });
        } else {
            if (window.UI) {
                UI.showCombatModal();
                UI.renderCombatArena();
            }
            this.startRound();
        }
    }

    getNonParticipatingPlayers() {
        if (!this.game || !this.game.players) return [];
        return this.game.players.filter(p => {
            if (p.id === this.player1.id) return false;
            if (this.player2 && p.id === this.player2.id) return false;
            return true;
        });
    }

    getBattleContenders() {
        if (!this.player1) throw new Error('player1 is required to get battle contenders');
        const contenders = [
            {
                id: this.player1.id,
                name: this.player1.name,
                color: this.player1.color,
                type: 'player',
                activeMonster: this.getP1Active()
            }
        ];
        if (this.player2) {
            contenders.push({
                id: this.player2.id,
                name: this.player2.name,
                color: this.player2.color,
                type: 'player',
                activeMonster: this.getP2Active()
            });
        } else {
            contenders.push({
                id: 'npc',
                name: this.getOpponentDisplayName(),
                color: '#64748b',
                type: 'npc',
                activeMonster: this.getP2Active()
            });
        }
        return contenders;
    }

    placeBet(bettorId, predictedWinnerId) {
        if (!bettorId) throw new Error('bettorId is required to place a bet');
        if (!predictedWinnerId) throw new Error('predictedWinnerId is required to place a bet');

        const bettor = this.game.players.find(p => p.id === bettorId);
        if (!bettor) throw new Error(`Bettor player ${bettorId} not found in game`);

        const nonParticipants = this.getNonParticipatingPlayers();
        if (!nonParticipants.some(p => p.id === bettorId)) {
            throw new Error(`Player ${bettorId} (${bettor.name}) is a combat participant and cannot bet`);
        }

        const contenders = this.getBattleContenders();
        const chosenContender = contenders.find(c => c.id === predictedWinnerId);
        if (!chosenContender) {
            throw new Error(`Invalid predictedWinnerId ${predictedWinnerId}. Must match one of the active combatants: ${contenders.map(c => c.id).join(', ')}`);
        }

        const betData = {
            bettorId,
            bettorName: bettor.name,
            bettorColor: bettor.color,
            predictedWinnerId: chosenContender.id,
            predictedWinnerName: chosenContender.name,
            ballotColor: chosenContender.color,
            won: false
        };

        const existingIndex = this.bets.findIndex(b => b.bettorId === bettorId);
        if (existingIndex >= 0) {
            this.bets[existingIndex] = betData;
        } else {
            this.bets.push(betData);
        }

        return betData;
    }

    resolveBets(actualWinnerId, actualWinnerName) {
        if (!this.bets || this.bets.length === 0) return;

        this.bets.forEach(bet => {
            const bettor = this.game.players.find(p => p.id === bet.bettorId);
            if (!bettor) throw new Error(`Bettor ${bet.bettorId} not found during bet resolution`);

            if (bet.predictedWinnerId === actualWinnerId) {
                bet.won = true;
                bettor.luck = (bettor.luck || 0) + 1;
                this.log(`🍀 ¡${bettor.name} predijo con su papeleta la victoria de ${bet.predictedWinnerName} y gana +1 Suerte (Total: ${bettor.luck} 🍀)!`);
                if (window.UI) {
                    UI.logGame(`🗳️🍀 ¡${bettor.name} acertó su predicción en el combate y ganó +1 Punto de Suerte!`);
                }
            } else {
                bet.won = false;
                this.log(`❌ ${bettor.name} apostó por ${bet.predictedWinnerName}, pero el vencedor fue ${actualWinnerName}.`);
                if (window.UI) {
                    UI.logGame(`🗳️❌ ${bettor.name} falló su predicción en el combate.`);
                }
            }
        });
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
            baseSpeed: m.speed,
            captureTier: m.captureTier,
            icon: m.icon,
            attacks: JSON.parse(JSON.stringify(m.attacks)),
            equippedItem: m.equippedItem ? JSON.parse(JSON.stringify(m.equippedItem)) : null,
            focusSashUsed: false,
            berryUsed: false,
            status: null, // 'paralysis', 'poison', 'drowsy'
            shieldNextTurn: 0,
            chargeNextTurn: 0
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

    getEffectiveSpeed(monster, player) {
        if (!monster) return 0;
        if (monster.status === 'paralysis') return 0;
        let spd = (monster.speed !== undefined) ? monster.speed : 0;
        if (monster.equippedItem && monster.equippedItem.id === 'item_cmb_3') spd += 2;
        if (this.turnNumber === 1 && player && player.characterId === 'char_blue') spd += 2;
        return Math.max(0, spd);
    }

    startRound() {
        if (!this.inCombat) return;

        const p1Mon = this.getP1Active();
        const p2Mon = this.getP2Active();
        if (!p1Mon || !p2Mon || p1Mon.hp <= 0 || p2Mon.hp <= 0) {
            this.checkFaints();
            return;
        }

        this.isProcessing = false;
        this.actionsTakenThisRound = 0;

        const p1Speed = this.getEffectiveSpeed(p1Mon, this.player1);
        const p2Speed = this.getEffectiveSpeed(p2Mon, this.player2);
        const p1GoesFirst = (p1Speed > p2Speed) || (p1Speed === p2Speed && Math.random() < 0.5);

        this.roundFirst = p1GoesFirst ? 1 : 2;
        this.activeTurnActor = this.roundFirst;

        const fasterName = p1GoesFirst ? p1Mon.name : p2Mon.name;
        const slowerName = p1GoesFirst ? p2Mon.name : p1Mon.name;
        const maxSpd = Math.max(p1Speed, p2Speed);
        const minSpd = Math.min(p1Speed, p2Speed);

        this.log(`--- Turno ${this.turnNumber} ---`);
        this.log(`⚡ Iniciativa: **${fasterName}** es más veloz (${maxSpd} vs ${minSpd}) y actúa primero.`);

        if (window.UI) {
            UI.renderCombatArena();
        }

        if (this.activeTurnActor === 2 && !this.player2) {
            this.isProcessing = true;
            setTimeout(() => {
                if (!this.inCombat) return;
                this.executeOpponentAction();
            }, 600);
        }
    }

    executeOpponentAction() {
        if (!this.inCombat) return;
        const oppMon = this.getP2Active();
        const p1Mon = this.getP1Active();
        if (!oppMon || oppMon.hp <= 0 || !p1Mon || p1Mon.hp <= 0) return;

        const oppAttack = this.chooseOpponentAttack(oppMon, p1Mon);
        this.executeAttack({
            attacker: oppMon,
            defender: p1Mon,
            attack: oppAttack,
            attackerPlayer: this.player2,
            defenderPlayer: this.player1,
            first: (this.actionsTakenThisRound === 0)
        });

        SoundFX.diceRoll();
        this.actionsTakenThisRound++;

        if (window.UI) UI.renderCombatArena();

        if (p1Mon.hp <= 0) {
            setTimeout(() => {
                this.handleFaint(p1Mon, this.player1);
                if (!this.inCombat) return;
                this.endRound();
            }, 600);
            return;
        }

        if (this.actionsTakenThisRound >= 2) {
            setTimeout(() => {
                this.endRound();
            }, 700);
        } else {
            this.activeTurnActor = 1;
            this.isProcessing = false;
            this.log(`👉 ¡Es el turno de **${this.player1.name}**! Puedes atacar o cambiar de monstruo.`);
            if (window.UI) UI.renderCombatArena();
        }
    }

    toggleLuckBoost() {
        return this.toggleLuckReroll();
    }

    toggleLuckReroll() {
        if (this.isProcessing) return;
        const activePlayer = (this.activeTurnActor === 2 && this.player2) ? this.player2 : this.player1;
        if (!activePlayer) return;
        if (!this.useLuckNextAttack && activePlayer.luck <= 0) {
            alert('¡No tienes suficientes Puntos de Suerte 🍀!');
            return;
        }
        this.useLuckNextAttack = !this.useLuckNextAttack;
        if (window.UI) UI.renderCombatArena();
    }

    playerAttack(attackIndex = 0, playerNum = null) {
        if (this.isProcessing || !this.inCombat) return;
        const currentActor = playerNum || this.activeTurnActor;
        if (currentActor !== this.activeTurnActor) return;

        this.isProcessing = true;
        const attackerIsP1 = (currentActor === 1);
        const attackerMon = attackerIsP1 ? this.getP1Active() : this.getP2Active();
        const defenderMon = attackerIsP1 ? this.getP2Active() : this.getP1Active();
        const attackerPlayer = attackerIsP1 ? this.player1 : this.player2;
        const defenderPlayer = attackerIsP1 ? this.player2 : this.player1;

        const atk = attackerMon.attacks[attackIndex] || attackerMon.attacks[0];

        this.executeAttack({
            attacker: attackerMon,
            defender: defenderMon,
            attack: atk,
            attackerPlayer,
            defenderPlayer,
            first: (this.actionsTakenThisRound === 0)
        });

        SoundFX.diceRoll();
        this.actionsTakenThisRound++;

        if (window.UI) UI.renderCombatArena();

        if (defenderMon.hp <= 0) {
            setTimeout(() => {
                this.handleFaint(defenderMon, defenderPlayer);
                if (!this.inCombat) return;
                this.endRound();
            }, 600);
            return;
        }

        if (this.actionsTakenThisRound >= 2) {
            setTimeout(() => {
                this.endRound();
            }, 700);
        } else {
            const nextActor = attackerIsP1 ? 2 : 1;
            this.activeTurnActor = nextActor;
            setTimeout(() => {
                if (!this.inCombat) return;
                if (nextActor === 2 && !this.player2) {
                    this.executeOpponentAction();
                } else {
                    this.isProcessing = false;
                    const nextPlayer = nextActor === 1 ? this.player1 : this.player2;
                    this.log(`👉 ¡Es el turno de **${nextPlayer.name}**! Puedes atacar o cambiar de monstruo.`);
                    if (window.UI) UI.renderCombatArena();
                }
            }, 700);
        }
    }

    playerSwitchMonster(newIndex, playerNum = null) {
        if (this.isProcessing || !this.inCombat) return;
        const currentActor = playerNum || this.activeTurnActor;
        if (currentActor !== this.activeTurnActor) return;

        const team = (currentActor === 1) ? this.p1Team : this.p2Team;
        const currentIdx = (currentActor === 1) ? this.p1ActiveIndex : this.p2ActiveIndex;
        const player = (currentActor === 1) ? this.player1 : this.player2;

        if (newIndex === currentIdx) return;
        if (team[newIndex].hp <= 0) {
            alert('¡Ese monstruo está debilitado y no puede entrar a luchar!');
            return;
        }

        this.isProcessing = true;
        const oldMon = team[currentIdx];
        if (currentActor === 1) {
            this.p1ActiveIndex = newIndex;
        } else {
            this.p2ActiveIndex = newIndex;
        }
        const newMon = team[newIndex];

        this.log(`🔄 ${player.name} retira a ${oldMon.name} y envía a ${newMon.name}.`);
        this.log(`⏱️ Cambiar de monstruo consume el turno de ${player.name}.`);

        SoundFX.step();
        this.actionsTakenThisRound++;

        if (window.UI) UI.renderCombatArena();

        if (this.actionsTakenThisRound >= 2) {
            setTimeout(() => {
                this.endRound();
            }, 600);
        } else {
            const nextActor = (currentActor === 1) ? 2 : 1;
            this.activeTurnActor = nextActor;
            setTimeout(() => {
                if (!this.inCombat) return;
                if (nextActor === 2 && !this.player2) {
                    this.executeOpponentAction();
                } else {
                    this.isProcessing = false;
                    const nextPlayer = nextActor === 1 ? this.player1 : this.player2;
                    this.log(`👉 ¡Es el turno de **${nextPlayer.name}**! Puedes atacar o cambiar de monstruo.`);
                    if (window.UI) UI.renderCombatArena();
                }
            }, 700);
        }
    }

    endRound() {
        if (!this.inCombat) return;

        this.endTurnPoisonPhase();
        if (!this.inCombat) return;

        this.turnNumber++;
        this.startRound();
    }

    chooseOpponentAttack(attacker, defender) {
        if (!attacker || !attacker.attacks || attacker.attacks.length === 0) return null;
        if (attacker.attacks.length === 1) return attacker.attacks[0];

        const superEffective = attacker.attacks.find(a => (defender.weakness === a.type) || (TYPE_WEAKNESS[defender.type] === a.type));
        if (superEffective) return superEffective;

        if (attacker.hp <= attacker.maxHp / 2) {
            const drainAtk = attacker.attacks.find(a => a.effect === 'drain');
            if (drainAtk) return drainAtk;
        }

        return attacker.attacks[0];
    }

    executeTurnSequence(firstStrike, secondStrike) {
        this.executeAttack(firstStrike);
        SoundFX.diceRoll();

        setTimeout(() => {
            if (!this.inCombat) return;

            const firstTargetFainted = firstStrike.defender.hp <= 0;
            if (window.UI) UI.renderCombatArena();

            if (firstTargetFainted) {
                this.handleFaint(firstStrike.defender, firstStrike.defenderPlayer);
                if (!this.inCombat) return;

                this.endTurnPoisonPhase();
                if (!this.inCombat) return;

                this.turnNumber++;
                this.isProcessing = false;
                if (window.UI) UI.renderCombatArena();
                return;
            }

            setTimeout(() => {
                if (!this.inCombat) return;

                const activeSecondAttacker = (secondStrike.attackerPlayer === this.player1) ? this.getP1Active() : this.getP2Active();
                if (secondStrike.attacker !== activeSecondAttacker) {
                    secondStrike.attacker = activeSecondAttacker;
                    secondStrike.attack = (secondStrike.attackerPlayer === this.player1)
                        ? activeSecondAttacker.attacks[0]
                        : this.chooseOpponentAttack(activeSecondAttacker, secondStrike.defender);
                }

                if (secondStrike.attacker && secondStrike.attacker.hp > 0) {
                    this.executeAttack(secondStrike);
                    if (window.UI) UI.renderCombatArena();

                    const secondTargetFainted = secondStrike.defender.hp <= 0;
                    if (secondTargetFainted) {
                        this.handleFaint(secondStrike.defender, secondStrike.defenderPlayer);
                        if (!this.inCombat) return;
                    }
                }

                if (!this.inCombat) return;

                this.endTurnPoisonPhase();
                if (!this.inCombat) return;

                this.turnNumber++;
                this.isProcessing = false;
                if (window.UI) UI.renderCombatArena();
            }, 700);

        }, 700);
    }

    endTurnPoisonPhase() {
        const checkPoison = (mon, player) => {
            if (mon && mon.status === 'poison' && mon.hp > 0) {
                mon.hp = Math.max(0, mon.hp - 1);
                this.log(`☠️ ¡${mon.name} sufre 1 de daño por veneno (${mon.hp}/${mon.maxHp} HP)!`);
                if (mon.hp <= 0) {
                    this.handleFaint(mon, player);
                }
            }
        };
        checkPoison(this.getP1Active(), this.player1);
        const p1Alive = this.p1Team && this.p1Team.some(m => m.hp > 0);
        if (p1Alive) {
            checkPoison(this.getP2Active(), this.player2);
        }
    }

    executeAttack({ attacker, defender, attack, attackerPlayer, defenderPlayer, first = false, isFreeAttackOnSwitch = false }) {
        this.log(`💥 ${attacker.name} usa **${attack.name}** contra ${defender.name}!`);

        // Attack Effect: Multiple hits (3 hits)
        if (attack.effect === 'multi_hit') {
            const multiDmg = this.executeMultiHitAttack({ attacker, defender, attack, attackerPlayer, defenderPlayer, first });
            this.applyAttackOnHitEffects(attacker, defender, attack, attackerPlayer, defenderPlayer, multiDmg);
            return;
        }

        // Attack Effect: Fixed damage (ignores dice rolls and variances)
        if (attack.effect === 'fixed_damage') {
            let fixedDmg = attack.fixedDmg || attack.baseDmg || 5;
            this.log(`🎯 ¡Daño Fijo! Inflige ${fixedDmg} de daño base garantizado.`);

            if (attacker.equippedItem && attacker.equippedItem.id === 'item_cmb_1') {
                fixedDmg += 1;
                this.log(`🥊 Banda Fuerza añade +1 al daño fijo.`);
            }

            if (first && attacker.equippedItem && attacker.equippedItem.id === 'item_cmb_6') {
                fixedDmg += 2;
                this.log(`🦷 Colmillo Afilado inflige +2 daño fijo por atacar primero.`);
            }

            if (attacker.chargeNextTurn > 0) {
                fixedDmg += attacker.chargeNextTurn;
                this.log(`⚡ ¡Carga previa! Suma +${attacker.chargeNextTurn} de daño a este ataque.`);
                attacker.chargeNextTurn = 0;
            }

            if (defender.status === 'drowsy') {
                fixedDmg += 1;
                this.log(`💤 ¡Somnoliento! ${defender.name} sufre +1 de daño adicional.`);
            }

            if (defender.shieldNextTurn > 0) {
                const reduction = Math.min(fixedDmg - 1, defender.shieldNextTurn);
                if (reduction > 0) {
                    fixedDmg -= reduction;
                    this.log(`🛡️ ¡Barrera Protectora! Absorbe ${reduction} de daño.`);
                }
                defender.shieldNextTurn = 0;
            }

            if (defender.equippedItem && defender.equippedItem.id === 'item_cmb_2') {
                fixedDmg = Math.max(1, fixedDmg - 1);
                this.log(`🦺 Chaleco Defensivo reduce el daño fijo en 1.`);
            }

            this.applyDamageToDefender(attacker, defender, fixedDmg);
            this.applyAttackOnHitEffects(attacker, defender, attack, attackerPlayer, defenderPlayer, fixedDmg);
            return;
        }

        // Standard dice rolling
        const diceCount = (attack.diceCount !== undefined) ? attack.diceCount : 1;
        let { rolls, total: diceSum } = rollDice(diceCount);

        // Check Lente Preciso: turns 0 into 1
        if (attacker.equippedItem && attacker.equippedItem.id === 'item_cmb_5') {
            rolls = rolls.map(r => r === 0 ? 1 : r);
            diceSum = rolls.reduce((a, b) => a + b, 0);
            this.log(`🎯 Lente Preciso convierte las tiradas mínimas a 1.`);
        }

        // Check Flauta Mágica (item_utl_4): rerolls lowest die if <= 1
        const hasFlute = (attackerPlayer && attackerPlayer.inventory && attackerPlayer.inventory.some(i => i.id === 'item_utl_4')) ||
                         (attacker.equippedItem && attacker.equippedItem.id === 'item_utl_4');
        if (hasFlute && rolls.length > 0) {
            const minRoll = Math.min(...rolls);
            if (minRoll < 2) {
                const minIdx = rolls.indexOf(minRoll);
                const reroll = rollAttackDie();
                if (reroll > minRoll) {
                    rolls[minIdx] = reroll;
                    diceSum = rolls.reduce((a, b) => a + b, 0);
                    this.log(`🪈 ¡Flauta Mágica relanza el dado más bajo (${minRoll} ➡️ ${reroll})!`);
                }
            }
        }

        if (attackerPlayer && this.useLuckNextAttack && attackerPlayer.luck >= 1) {
            attackerPlayer.luck -= 1;
            this.useLuckNextAttack = false;
            const initialRolls = rolls.slice();
            const initialSum = diceSum;
            const rerollRes = rollDice(diceCount);
            rolls = rerollRes.rolls;
            if (attacker.equippedItem && attacker.equippedItem.id === 'item_cmb_5') {
                rolls = rolls.map(r => r === 0 ? 1 : r);
            }
            diceSum = rolls.reduce((a, b) => a + b, 0);
            this.log(`🍀 ¡${attackerPlayer.name} gasta 1 Suerte para tirar de vuelta los dados en combate! (Tirada inicial: [${initialRolls.join(', ')}] = ${initialSum} ➡️ Nueva tirada: [${rolls.join(', ')}] = ${diceSum}).`);
        }

        // Attack Effect: White dice count as Critical Hits (+2 damage per 0 face)
        if (attack.effect === 'white_dice_crit') {
            let zeroCount = 0;
            rolls.forEach(r => {
                if (r === 0) zeroCount++;
            });
            if (zeroCount > 0) {
                const critBonus = zeroCount * 2;
                diceSum += critBonus;
                this.log(`🎯 ¡CRÍTICO EN DADO BLANCO! ${zeroCount} dado(s) blanco(s) (0) se convierten en impactos críticos (+${critBonus} daño total)!`);
                SoundFX.weaknessHit();
            }
        }

        // Calculate base damage
        let baseDmg = attack.baseDmg || 1;

        // Attack Effect: Damage equal to speed attribute
        if (attack.effect === 'speed_damage') {
            let effSpeed = (attacker.status === 'paralysis') ? 1 : Math.max(1, attacker.speed);
            if (attacker.equippedItem && attacker.equippedItem.id === 'item_cmb_3') {
                effSpeed += 2;
            }
            baseDmg = effSpeed;
            this.log(`⚡ ¡Velocidad Ofensiva! Daño base calculado a partir de la Velocidad del atacante (${effSpeed}).`);
        } else if (attack.effect === 'facade_status') {
            if (attacker.status) {
                baseDmg += 4;
                this.log(`🔥 ¡Furia Agónica! Por sufrir estado alterado (${attacker.status.toUpperCase()}), ¡inflige +4 de daño base!`);
            }
        }

        let damage = baseDmg + diceSum;

        // User bonus: Charge stored from previous attack
        if (attacker.chargeNextTurn > 0) {
            damage += attacker.chargeNextTurn;
            this.log(`⚡ ¡Carga previa! Suma +${attacker.chargeNextTurn} de daño a este ataque.`);
            attacker.chargeNextTurn = 0;
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

        // Status on defender: Drowsy (+1 damage received)
        if (defender.status === 'drowsy') {
            damage += 1;
            this.log(`💤 ¡Somnoliento! ${defender.name} sufre +1 de daño adicional.`);
        }

        // Status on defender: Shield from previous move (-2 damage received, min 1)
        if (defender.shieldNextTurn > 0) {
            const reduction = Math.min(damage - 1, defender.shieldNextTurn);
            if (reduction > 0) {
                damage -= reduction;
                this.log(`🛡️ ¡Barrera Protectora! Absorbe ${reduction} de daño.`);
            }
            defender.shieldNextTurn = 0;
        }

        // Defender items: Chaleco Defensivo (-1 daño recibido, min 1)
        if (defender.equippedItem && defender.equippedItem.id === 'item_cmb_2') {
            damage = Math.max(1, damage - 1);
            this.log(`🦺 Chaleco Defensivo reduce el daño en 1.`);
        }

        this.log(`Ataque de **${attack.name}**: ${damage} de daño total.${weaknessBonus > 0 ? ' (¡+2 por debilidad!)' : ''}`);

        this.applyDamageToDefender(attacker, defender, damage);
        this.applyAttackOnHitEffects(attacker, defender, attack, attackerPlayer, defenderPlayer, damage);
    }

    executeMultiHitAttack({ attacker, defender, attack, attackerPlayer, defenderPlayer, first }) {
        const hits = attack.hits || 3;
        let totalMultiDamage = 0;
        this.log(`💥 ¡Ataque Múltiple! ${attacker.name} descarga una ráfaga de ${hits} golpes.`);

        const useLuckReroll = Boolean(attackerPlayer && this.useLuckNextAttack && attackerPlayer.luck >= 1);
        if (useLuckReroll) {
            attackerPlayer.luck -= 1;
            this.useLuckNextAttack = false;
            this.log(`🍀 ¡${attackerPlayer.name} gasta 1 Suerte para tirar de vuelta cualquier impacto fallido durante la ráfaga!`);
        }

        for (let h = 1; h <= hits; h++) {
            if (defender.hp <= 0) break;

            let roll = rollAttackDie();
            if (useLuckReroll && roll === 0) {
                const rerolled = rollAttackDie();
                this.log(`  🍀 Relanzamiento por Suerte en golpe ${h}: ${roll} ➡️ ${rerolled}`);
                roll = rerolled;
            }

            if (attacker.equippedItem && attacker.equippedItem.id === 'item_cmb_5' && roll === 0) {
                roll = 1;
            }

            let hitDmg = (attack.baseDmg || 1) + roll;

            if (attacker.equippedItem && attacker.equippedItem.id === 'item_cmb_1') {
                hitDmg += 1;
            }

            if (defender.status === 'drowsy') hitDmg += 1;
            if (defender.shieldNextTurn > 0) {
                hitDmg = Math.max(1, hitDmg - defender.shieldNextTurn);
                defender.shieldNextTurn = 0;
            }

            if (defender.equippedItem && defender.equippedItem.id === 'item_cmb_2') {
                hitDmg = Math.max(1, hitDmg - 1);
            }

            const prevHp = defender.hp;
            let afterHp = prevHp - hitDmg;

            if (afterHp <= 0 && defender.equippedItem && defender.equippedItem.id === 'item_cmb_7' && !defender.berryUsed) {
                defender.berryUsed = true;
                afterHp = 3;
                this.log(`🫐 ¡Baya Aranja se activa durante el combo! ${defender.name} recupera 3 HP.`);
            }

            if (afterHp <= 0 && defender.equippedItem && defender.equippedItem.id === 'item_cmb_4' && !defender.focusSashUsed) {
                defender.focusSashUsed = true;
                afterHp = 1;
                this.log(`🎗️ ¡Cinta Focus activada durante el combo! ${defender.name} sobrevive con 1 HP.`);
            }

            defender.hp = Math.max(0, afterHp);
            totalMultiDamage += hitDmg;
            this.log(`  ➡️ Golpe ${h}/${hits}: ${hitDmg} daño (Dado: ${roll}). [${defender.name}: ${defender.hp}/${defender.maxHp} HP]`);
            SoundFX.hit();

            if (defender.equippedItem && defender.equippedItem.id === 'item_cmb_8' && attacker.hp > 0) {
                attacker.hp = Math.max(0, attacker.hp - 1);
                this.log(`🪖 ¡Casco Dentado hiere a ${attacker.name} por 1 punto de daño reflejado!`);
            }
        }

        this.log(`💥 Total de la ráfaga múltiple: ${totalMultiDamage} de daño.`);
        return totalMultiDamage;
    }

    applyDamageToDefender(attacker, defender, damage) {
        const initialHp = defender.hp;
        let newHp = initialHp - damage;

        // Baya Aranja triggers when reaching 0 HP
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

    applyAttackOnHitEffects(attacker, defender, attack, attackerPlayer, defenderPlayer, damageDealt = 0) {
        if (!attack.effect) return;

        if (attack.effect === 'drain' && attacker.hp > 0 && damageDealt > 0) {
            const healAmount = Math.max(1, Math.floor(damageDealt / 2));
            const prevHp = attacker.hp;
            attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmount);
            const actualHealed = attacker.hp - prevHp;
            if (actualHealed > 0) {
                this.log(`🌿 ¡Drenaje de Vida! ${attacker.name} absorbe ${actualHealed} HP (${attacker.hp}/${attacker.maxHp} HP).`);
                if (typeof SoundFX !== 'undefined' && SoundFX.victory) SoundFX.victory();
            }
        }

        if (attack.effect === 'recoil' && attacker.hp > 0) {
            const recoilDmg = attack.recoilDmg || 2;
            attacker.hp = Math.max(0, attacker.hp - recoilDmg);
            this.log(`💥 ¡Retroceso violento! ${attacker.name} sufre ${recoilDmg} de daño por el impacto (${attacker.hp}/${attacker.maxHp} HP).`);
            if (typeof SoundFX !== 'undefined' && SoundFX.hit) SoundFX.hit();
            if (attacker.hp <= 0) {
                this.handleFaint(attacker, attackerPlayer);
            }
        }

        // 1. Paralizar (0 speed)
        if (attack.effect === 'paralyze' && defender.hp > 0) {
            defender.status = 'paralysis';
            defender.speed = 0;
            this.log(`⚡ ¡${defender.name} ha sido PARALIZADO! Su Velocidad queda reducida a 0.`);
            SoundFX.weaknessHit();
        }

        // 2. Envenenar (-1 hp por turno)
        if (attack.effect === 'poison' && defender.hp > 0) {
            defender.status = 'poison';
            this.log(`☠️ ¡${defender.name} ha sido ENVENENADO! Perderá 1 HP al final de cada turno.`);
        }

        // 3. Somnoliento (recibe +1 dmg)
        if (attack.effect === 'drowsy' && defender.hp > 0) {
            defender.status = 'drowsy';
            this.log(`💤 ¡${defender.name} ha caído en SOMNOLENCIA! Recibirá +1 de daño de todos los ataques.`);
        }

        // 4. Escudo próximo turno (-2 daño recibido)
        if (attack.effect === 'shield_next' && attacker.hp > 0) {
            attacker.shieldNextTurn = 2;
            this.log(`🛡️ ¡${attacker.name} levanta un Escudo! El próximo ataque que reciba se reducirá en 2 de daño.`);
        }

        // 5. Carga próximo turno (+3 daño al próximo ataque)
        if (attack.effect === 'charge_next' && attacker.hp > 0) {
            attacker.chargeNextTurn = 3;
            this.log(`⚡ ¡${attacker.name} carga su poder! Su próximo ataque infligirá +3 de daño adicional.`);
        }

        // 6. Pivot switch (te permite cambiar de monstruo inmediatamente sin penalización)
        if (attack.effect === 'pivot_switch' && attacker.hp > 0) {
            if (attackerPlayer === this.player1) {
                const otherAlive = this.p1Team.some((m, idx) => idx !== this.p1ActiveIndex && m.hp > 0);
                if (otherAlive) {
                    this.log(`🔄 ¡${attack.name} activa el cambio táctico! ${attackerPlayer.name} puede cambiar de monstruo sin recibir daño.`);
                    if (window.UI) {
                        setTimeout(() => {
                            UI.promptPivotSwitch();
                        }, 500);
                    }
                }
            }
        }

        // 7. Force switch (obliga al rival a cambiar, jugando todavía su turno)
        if (attack.effect === 'force_switch') {
            const isDefenderP1 = (defenderPlayer === this.player1) || (defender === this.getP1Active());
            const team = isDefenderP1 ? this.p1Team : this.p2Team;
            const currentIdx = isDefenderP1 ? this.p1ActiveIndex : this.p2ActiveIndex;
            const nextIdx = team.findIndex((m, idx) => idx !== currentIdx && m.hp > 0);

            if (nextIdx >= 0) {
                if (isDefenderP1) {
                    this.p1ActiveIndex = nextIdx;
                    this.log(`🌪️ ¡${attack.name} expulsa a ${defender.name}! ${this.player1 ? this.player1.name : 'Jugador 1'} es forzado a sacar a **${this.getP1Active().name}**.`);
                } else {
                    this.p2ActiveIndex = nextIdx;
                    this.log(`🌪️ ¡${attack.name} expulsa a ${defender.name}! ${this.getOpponentDisplayName()} es forzado a sacar a **${this.getP2Active().name}**.`);
                }
                this.log(`➡️ El nuevo monstruo continúa jugando su turno.`);
            } else {
                this.log(`🌪️ ¡${attack.name} intentó expulsar a ${defender.name}, pero el rival no tiene reservas vivas!`);
            }
        }
    }

    playerPivotSwitch(newIndex) {
        if (newIndex === this.p1ActiveIndex) return;
        if (this.p1Team[newIndex].hp <= 0) {
            alert('¡Ese monstruo está debilitado!');
            return;
        }
        const oldMon = this.getP1Active();
        this.p1ActiveIndex = newIndex;
        const newMon = this.getP1Active();
        const pName = this.player1 ? this.player1.name : 'Jugador 1';
        this.log(`🔄 ¡Retirada táctica! ${pName} envía a **${newMon.name}** al combate.`);
        SoundFX.step();
        if (window.UI) UI.renderCombatArena();
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
        this.inCombat = false;
        this.isProcessing = false;
        this.log(`🏁 FIN DEL COMBATE: ${playerWon ? `¡VICTORIA para ${this.player1.name}!` : `¡${this.player1.name} ha sido derrotado!`}`);

        let rewardCoins = 2;
        if (this.gymData) {
            rewardCoins = this.gymData.rewardCoins;
        }

        const hasAmulet = this.player1.inventory && this.player1.inventory.some(i => i.id === 'item_utl_5');
        if (hasAmulet) {
            rewardCoins += 1;
            this.log(`🪙 Moneda Amuleto otorga +1 moneda extra.`);
        }

        this.player1.coins += rewardCoins;
        SoundFX.coin();

        if (playerWon) {
            SoundFX.victory();
            this.log(`🎉 ¡Has ganado ${rewardCoins} monedas de oro!`);

            if (this.gymData) {
                if (this.gymData.rewardLuck) {
                    this.player1.luck = (this.player1.luck || 0) + this.gymData.rewardLuck;
                    this.log(`🍀 ¡Obtienes +${this.gymData.rewardLuck} Suerte por vencer en el Gimnasio!`);
                }

                if (!this.player1.badges.includes(this.gymData.tier)) {
                    this.player1.badges.push(this.gymData.tier);
                    this.player1.badges.sort((a, b) => a - b);
                }
                this.log(`🏅 ¡OBTIENES LA ${this.gymData.badgeName.toUpperCase()}! (Tier ${this.gymData.tier}).`);
                this.log(`✨ ¡Ahora puedes enseñar ataques de monstruos de Tier ${this.gymData.tier}!`);

                if (this.game && this.game.onGymDefeated) {
                    this.game.onGymDefeated(this.player1, this.gymData);
                }
            }
        } else {
            this.log(`🪙 REGLA 14: A pesar de la derrota, ¡obtienes ${rewardCoins} monedas de recompensa para recuperarte!`);
        }

        if (this.p1Team) {
            this.p1Team.forEach(m => {
                m.hp = m.maxHp;
                m.status = null;
                m.shieldNextTurn = 0;
                m.chargeNextTurn = 0;
            });
        }
        if (this.player1 && this.player1.monsters) {
            this.player1.monsters.forEach(m => {
                m.hp = m.maxHp;
                m.status = null;
                m.shieldNextTurn = 0;
                m.chargeNextTurn = 0;
            });
        }
        if (this.p2Team) {
            this.p2Team.forEach(m => {
                m.hp = m.maxHp;
                m.status = null;
                m.shieldNextTurn = 0;
                m.chargeNextTurn = 0;
            });
        }
        if (this.player2 && this.player2.monsters) {
            this.player2.monsters.forEach(m => {
                m.hp = m.maxHp;
                m.status = null;
                m.shieldNextTurn = 0;
                m.chargeNextTurn = 0;
            });
        }
        this.log(`🌿 Todos tus monstruos han descansado y recuperado el 100% de su salud y estados.`);

        const actualWinnerId = playerWon
            ? this.player1.id
            : (this.player2 ? this.player2.id : 'npc');
        const actualWinnerName = playerWon
            ? this.player1.name
            : (this.player2 ? this.player2.name : this.getOpponentDisplayName());

        this.resolveBets(actualWinnerId, actualWinnerName);

        if (window.UI) {
            UI.renderCombatArena();
            UI.showCombatResultModal({
                won: playerWon,
                coins: rewardCoins,
                badge: playerWon && this.gymData ? this.gymData : null,
                moveTeaching: this.pendingMoveTeaching,
                bets: this.bets,
                onContinue: () => {
                    this.inCombat = false;
                    this.isProcessing = false;
                    if (window.UI) UI.hideCombatModal();
                    if (this.onCombatEndCallback) {
                        this.onCombatEndCallback(playerWon);
                    }
                }
            });
        }
    }
}

window.CombatEngine = CombatEngine;
