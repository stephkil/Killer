class Success{

    async checkAllSuccess(user,param,success){
        if(success == "Spawn Kill") return await this.SpawnKill(param);
        if(success == "Collectionneur") return await this.Collectionneur(user);
        if(success == "First Blood") return await this.FirstBlood(param);
        if(success == "Spectateur") return await this.Spectateur(param);
        if(success == "Pentakill") return await this.Pentakill(param);
        if(success == "Invincible") return await this.Invincible(user,param);
        if(success == "Serial Killer") return await this.SerialKiller(user,param[0],param[1]);
        if(success == "Jack the Ripper") return await this.JackTheRipper(user);
        if(success == "Il n'en restera qu'un") return await this.IlEnResteraUn();
        if(success == "Speedrunner") return await this.Speedrunner(param);
    }

    async SpawnKill(game){
        console.log("spawnKill : (", game.histo.length, ") ", game.histo);
        if(game.histo.length == 0){
            return true;
        }
        return false;
    }

    async Collectionneur(user){
        console.log("Collectionneur : ", user.game_survivant, " || ", user.game_topKiller, " || ", user.game_killerAlpha, " || ", user.game_killerSupreme);
        if(user.game_survivant >=1 && user.game_topKiller >=1 && user.game_killerAlpha >=1 && user.game_killerSupreme >=1){
            return true;
        }
        return false;
    }

    async FirstBlood(game){
        console.log("FirstBlood : (", game.histo.length, ") ", game.histo);
        if(game.histo.length == 0){
            return true;
        }
        return false;
    }

    async Spectateur(nbKill){
        console.log("Spectateur : ", nbKill);
        if(nbKill == 0){
            return true;
        }
        return false;
    }

    async Pentakill(kill){
        console.log("Pentakill : ", kill);
        if(kill >= 5){
            return true;
        }
        return false;
    }

    async Invincible(user,bdd){
        console.log("Invincible");
        return await bdd.last2Games(user);
    }

    async SerialKiller(user,game,bdd){
        console.log("SerialKiller");
        return await bdd.last3Kill(user,game);
    }

    async JackTheRipper(user){
        console.log("JackTheRipper : ", user.kill);
        if(user.kill >= 25){
            return true;
        }
        return false;
    }

    async IlEnResteraUn(){
        console.log("IlEnResteraUn");
        return true;
    }

    async Speedrunner(game){
        const now = new Date();
        const startDate = new Date(game.start_date); // Date de début du jeu
        const millisecondsElapsed = now - startDate; // Millisecondes écoulées depuis le début du jeu

        const min = millisecondsElapsed / 60000;
        console.log("Speedrunner : ", min);

        if(min <= 15){
            return true;
        }
        return false;
    }
}

module.exports = Success;