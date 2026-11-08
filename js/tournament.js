class TournamentEngine {
    constructor(game) {
        this.game = game;
        this.active = false;
        this.format = null; // 'gauntlet' (1P), 'best_of_3' (2P), 'triangular' (3P), 'playoffs' (4P)
        this.matches = [];
        this.currentMatchIndex = 0;
        this.standings = {}; // playerId -> score
        this.winner = null;
    }

    startTournament(players) {
        this.active = true;
        this.currentMatchIndex = 0;
        this.winner = null;
        this.standings = {};

        players.forEach(p => {
            this.standings[p.id] = 0;
        });

        const count = players.length;

        if (count === 1) {
            this.format = 'gauntlet';
            this.setupGauntlet(players[0]);
        } else if (count === 2) {
            this.format = 'best_of_3';
            this.setupBestOfThree(players[0], players[1]);
        } else if (count === 3) {
            this.format = 'triangular';
            this.setupTriangular(players);
        } else {
            this.format = 'playoffs';
            this.setupPlayoffs(players);
        }

        if (window.UI) {
            UI.showTournamentModal();
            UI.renderTournamentBracket();
        }
    }

    setupGauntlet(player) {
        this.matches = [
            {
                name: 'Ronda 1: Reto del Élite',
                p1: player,
                p2: null,
                isNpc: true,
                npcName: 'Campeón Bruno',
                npcMonsters: [
                    MONSTERS_DATABASE.find(m => m.id === 'mon_mtn_7'),
                    MONSTERS_DATABASE.find(m => m.id === 'mon_mtn_6'),
                    MONSTERS_DATABASE.find(m => m.id === 'mon_for_7')
                ],
                winner: null
            },
            {
                name: 'Ronda 2: Reto del Élite Avanzado',
                p1: player,
                p2: null,
                isNpc: true,
                npcName: 'Campeona Cynthia',
                npcMonsters: [
                    MONSTERS_DATABASE.find(m => m.id === 'mon_ocn_8'),
                    MONSTERS_DATABASE.find(m => m.id === 'mon_pln_8'),
                    MONSTERS_DATABASE.find(m => m.id === 'mon_frw_7')
                ],
                winner: null
            },
            {
                name: 'Gran Final: Reto Supremo',
                p1: player,
                p2: null,
                isNpc: true,
                npcName: 'Maestro Legendario',
                npcMonsters: [
                    MONSTERS_DATABASE.find(m => m.id === 'mon_ocn_7'),
                    MONSTERS_DATABASE.find(m => m.id === 'mon_pln_7'),
                    MONSTERS_DATABASE.find(m => m.id === 'mon_for_8')
                ],
                winner: null
            }
        ];
    }

    setupBestOfThree(p1, p2) {
        this.matches = [
            { name: 'Duelo 1 (Mejor de 3)', p1, p2, winner: null },
            { name: 'Duelo 2 (Mejor de 3)', p1, p2, winner: null },
            { name: 'Duelo 3 (Desempate si es necesario)', p1, p2, winner: null }
        ];
    }

    setupTriangular(players) {
        const [p1, p2, p3] = players;
        this.matches = [
            { name: 'Jornada 1', p1, p2, winner: null },
            { name: 'Jornada 2', p1: p2, p2: p3, winner: null },
            { name: 'Jornada 3', p1: p3, p2: p1, winner: null }
        ];
    }

    setupPlayoffs(players) {
        const [p1, p2, p3, p4] = players;
        this.matches = [
            { id: 'sf1', name: 'Semifinal 1: P1 vs P4', p1, p2: p4, winner: null },
            { id: 'sf2', name: 'Semifinal 2: P2 vs P3', p1: p2, p2: p3, winner: null },
            { id: 'bronze', name: 'Tercer Puesto', p1: null, p2: null, winner: null },
            { id: 'final', name: 'Gran Final del Torneo', p1: null, p2: null, winner: null }
        ];
    }

    getCurrentMatch() {
        return this.matches[this.currentMatchIndex] || null;
    }

    playCurrentMatch() {
        const match = this.getCurrentMatch();
        if (!match || match.winner) return;

        if (window.UI) {
            UI.hideTournamentModal();
        }

        if (match.isNpc) {
            this.game.combatEngine.startBattle({
                type: 'tournament',
                player1: match.p1,
                npc: { name: match.npcName, monsters: match.npcMonsters },
                onEnd: (won) => {
                    match.winner = won ? match.p1.name : match.npcName;
                    if (won) {
                        this.standings[match.p1.id] = (this.standings[match.p1.id] || 0) + 1;
                    }
                    this.advanceTournament();
                }
            });
        } else {
            this.game.combatEngine.startBattle({
                type: 'tournament',
                player1: match.p1,
                player2: match.p2,
                onEnd: (won) => {
                    const matchWinner = won ? match.p1 : match.p2;
                    match.winner = matchWinner.name;
                    this.standings[matchWinner.id] = (this.standings[matchWinner.id] || 0) + 1;
                    this.advanceTournament();
                }
            });
        }
    }

    advanceTournament() {
        const count = this.game.players.length;

        // Check Best of 3 early conclusion
        if (this.format === 'best_of_3') {
            const p1Wins = this.standings[this.game.players[0].id] || 0;
            const p2Wins = this.standings[this.game.players[1].id] || 0;
            if (p1Wins >= 2) {
                this.winner = this.game.players[0];
                this.concludeTournament();
                return;
            }
            if (p2Wins >= 2) {
                this.winner = this.game.players[1];
                this.concludeTournament();
                return;
            }
        }

        // Check Playoffs progression
        if (this.format === 'playoffs') {
            if (this.currentMatchIndex === 0) {
                // SF1 finished
                this.currentMatchIndex = 1;
                if (window.UI) {
                    UI.showTournamentModal();
                    UI.renderTournamentBracket();
                }
                return;
            } else if (this.currentMatchIndex === 1) {
                // SF2 finished, setup Bronze and Final
                const sf1 = this.matches[0];
                const sf2 = this.matches[1];
                const sf1Winner = sf1.winner === sf1.p1.name ? sf1.p1 : sf1.p2;
                const sf1Loser = sf1.winner === sf1.p1.name ? sf1.p2 : sf1.p1;
                const sf2Winner = sf2.winner === sf2.p1.name ? sf2.p1 : sf2.p2;
                const sf2Loser = sf2.winner === sf2.p1.name ? sf2.p2 : sf2.p1;

                this.matches[2].p1 = sf1Loser;
                this.matches[2].p2 = sf2Loser;

                this.matches[3].p1 = sf1Winner;
                this.matches[3].p2 = sf2Winner;

                this.currentMatchIndex = 2; // Bronze match
                if (window.UI) {
                    UI.showTournamentModal();
                    UI.renderTournamentBracket();
                }
                return;
            } else if (this.currentMatchIndex === 2) {
                // Bronze finished, move to Grand Final
                this.currentMatchIndex = 3;
                if (window.UI) {
                    UI.showTournamentModal();
                    UI.renderTournamentBracket();
                }
                return;
            } else if (this.currentMatchIndex === 3) {
                // Final finished
                const finalMatch = this.matches[3];
                this.winner = finalMatch.winner === finalMatch.p1.name ? finalMatch.p1 : finalMatch.p2;
                this.concludeTournament();
                return;
            }
        }

        this.currentMatchIndex++;
        if (this.currentMatchIndex >= this.matches.length) {
            // Find overall winner by standings
            let bestPlayer = this.game.players[0];
            let maxWins = -1;
            this.game.players.forEach(p => {
                if ((this.standings[p.id] || 0) > maxWins) {
                    maxWins = this.standings[p.id] || 0;
                    bestPlayer = p;
                }
            });
            this.winner = bestPlayer;
            this.concludeTournament();
        } else {
            if (window.UI) {
                UI.showTournamentModal();
                UI.renderTournamentBracket();
            }
        }
    }

    concludeTournament() {
        SoundFX.victory();
        if (window.UI) {
            UI.hideTournamentModal();
            UI.renderTournamentBracket();
            UI.showVictoryModal(this.winner);
        }
    }
}

window.TournamentEngine = TournamentEngine;
