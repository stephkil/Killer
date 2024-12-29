class Success{

    async checkAllSuccess(user,game,success){
        if(success == "Spawn Kill") return await this.SpawnKill(game);
        if(success == "Collectionneur") return await this.Collectionneur(user);
        if(success == "First Blood") return await this.FirstBlood(game);
        if(success == "Spectateur") return await this.Spectateur(game);
        if(success == "Pentakill") return await this.Pentakill();
        if(success == "Invincible") return await this.Invincible();
        if(success == "Serial Killer") return await this.SerialKiller();
        if(success == "Jack the Ripper") return await this.JackTheRipper(user);
        if(success == "Il n'en restera qu'un") return await this.IlEnResteraUn();
        if(success == "Speedrunner") return await this.Speedrunner();
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

    async Pentakill(){
        console.log("Pentakill");
    }

    async Invincible(){
        console.log("Invincible");
    }

    async SerialKiller(){
        console.log("SerialKiller");
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
    }

    async Speedrunner(){
        console.log("Speedrunner");
    }
}

module.exports = Success;