import { Player } from "../Player";
import { getRandomInt } from "../../utils/helpers/getRandomInt";
import { addOffset } from "../../utils/helpers/addOffset";
import { Generic_fromJSON, Generic_toJSON, Reviver } from "../../utils/JSONReviver";
import { BladeburnerConstants } from "./data/Constants";
// import { Contract } from "./Contract";
// import { Operation } from "./Operation";
// import { BlackOperation } from "./BlackOperation";

class StatsMultiplier {
    hack: number = 0;
    str: number = 0;
    def: number = 0;
    dex: number = 0;
    agi: number = 0;
    cha: number = 0;
    int: number = 0;

    [key: string]: number;
};

export interface IActionParams {
    name?: string;
    desc?: string;
    level?: number;
    maxLevel?: number;
    autoLevel?: boolean;
    baseDifficulty?: number;
    difficultyFac?: number;
    rewardFac?: number;
    successes?: number;
    failures?: number;
    rankGain?: number;
    rankLoss?: number;
    hpLoss?: number;
    hpLost?: number;
    isStealth?: boolean;
    isKill?: boolean;
    count?: number;
    countGrowth?: number;
    weights?: StatsMultiplier;
    decays?: StatsMultiplier;
    teamCount?: number;
}

export class Action {
    name: string = "";
    desc: string = "";

    // Difficulty scales with level. See getDifficulty() method
    level: number = 1;
    maxLevel: number = 1;
    autoLevel: boolean = true;
    baseDifficulty: number = 100;
    difficultyFac: number = 1.01;

    // Rank increase/decrease is affected by this exponent
    rewardFac: number = 1.02;

    successes: number = 0;
    failures: number = 0;

    // All of these scale with level/difficulty
    rankGain: number = 0;
    rankLoss: number = 0;
    hpLoss: number = 0;
    hpLost: number = 0;

    // Action Category. Current categories are stealth and kill
    isStealth: boolean = false;
    isKill: boolean = false;

    /**
     * Number of this contract remaining, and its growth rate
     * Growth rate is an integer and the count will increase by that integer every "cycle"
     */
    count: number = getRandomInt(1e3, 25e3);
    countGrowth: number = getRandomInt(1, 5);

    // Weighting of each stat in determining action success rate
    weights: StatsMultiplier = {hack:1/7,str:1/7,def:1/7,dex:1/7,agi:1/7,cha:1/7,int:1/7};
    // Diminishing returns of stats (stat ^ decay where 0 <= decay <= 1)
    decays: StatsMultiplier = { hack: 0.9, str: 0.9, def: 0.9, dex: 0.9, agi: 0.9, cha: 0.9, int: 0.9 };
    teamCount: number = 0;

    // Base Class for Contracts, Operations, and BlackOps
    constructor(params: IActionParams| null = null) { //  | null = null
        if(params && params.name) this.name = params.name;
        if(params && params.desc) this.desc = params.desc;

        if(params && params.baseDifficulty) this.baseDifficulty = addOffset(params.baseDifficulty, 10);
        if(params && params.difficultyFac) this.difficultyFac  =  params.difficultyFac;

        if(params && params.rewardFac) this.rewardFac = params.rewardFac;
        if(params && params.rankGain) this.rankGain = params.rankGain;
        if(params && params.rankLoss) this.rankLoss = params.rankLoss;
        if(params && params.hpLoss) this.hpLoss = params.hpLoss;

        if(params && params.isStealth) this.isStealth = params.isStealth;
        if(params && params.isKill) this.isKill = params.isKill;

        if(params && params.count) this.count =  params.count;
        if(params && params.countGrowth) this.countGrowth =  params.countGrowth;

        if(params && params.weights) this.weights =  params.weights;
        if(params && params.decays) this.decays =  params.decays;

        // Check to make sure weights are summed properly
        let sum = 0;
        for (const weight in this.weights) {
            if (this.weights.hasOwnProperty(weight)) {
                sum += this.weights[weight];
            }
        }
        if (sum - 1 >= 10 * Number.EPSILON) {
            throw new Error("Invalid weights when constructing Action " + this.name +
                            ". The weights should sum up to 1. They sum up to :" + 1);
        }

        for (const decay in this.decays) {
            if (this.decays.hasOwnProperty(decay)) {
                if (this.decays[decay] > 1) {
                    throw new Error("Invalid decays when constructing " +
                                    "Action " + this.name + ". " +
                                    "Decay value cannot be greater than 1");
                }
            }
        }
    }

    getDifficulty(): number {
        const difficulty = this.baseDifficulty * Math.pow(this.difficultyFac, this.level-1);
        if (isNaN(difficulty)) {throw new Error("Calculated NaN in Action.getDifficulty()");}
        return difficulty;
    }

    /**
     * Tests for success. Should be called when an action has completed
     * @param inst {Bladeburner} - Bladeburner instance
     */
    attempt(inst: any): boolean {
        return (Math.random() < this.getSuccessChance(inst));
    }

    // To be implemented by subtypes
    getActionTimePenalty(): number {
        return 1;
    }

    getActionTime(inst: any): number {
        const difficulty = this.getDifficulty();
        let baseTime = difficulty / BladeburnerConstants.DifficultyToTimeFactor;
        const skillFac = inst.skillMultipliers.actionTime; // Always < 1

        const effAgility      = Player.agility * inst.skillMultipliers.effAgi;
        const effDexterity    = Player.dexterity * inst.skillMultipliers.effDex;
        const statFac = 0.5 * (Math.pow(effAgility, BladeburnerConstants.EffAgiExponentialFactor) +
                             Math.pow(effDexterity, BladeburnerConstants.EffDexExponentialFactor) +
                             (effAgility / BladeburnerConstants.EffAgiLinearFactor) +
                             (effDexterity / BladeburnerConstants.EffDexLinearFactor)); // Always > 1

        baseTime = Math.max(1, baseTime * skillFac / statFac);

        return Math.ceil(baseTime*this.getActionTimePenalty());
    }

    // For actions that have teams. To be implemented by subtypes.
    getTeamSuccessBonus(inst: any): number {
        return 1;
    }

    getActionTypeSkillSuccessBonus(inst: any): number {
        return 1;
    }

    getChaosCompetencePenalty(inst: any, params: any): number {
        const city = inst.getCurrentCity();
        if (params.est) {
            return Math.pow((city.popEst / BladeburnerConstants.PopulationThreshold), BladeburnerConstants.PopulationExponent);
        } else {
            return Math.pow((city.pop / BladeburnerConstants.PopulationThreshold), BladeburnerConstants.PopulationExponent);
        }
    }

    getChaosDifficultyBonus(inst: any, params: any): number {
        const city = inst.getCurrentCity();
        if (city.chaos > BladeburnerConstants.ChaosThreshold) {
            const diff = 1 + (city.chaos - BladeburnerConstants.ChaosThreshold);
            const mult = Math.pow(diff, 0.1);
            return mult;
        }

        return 1;
    }

    /**
     * @inst - Bladeburner Object
     * @params - options:
     *  est (bool): Get success chance estimate instead of real success chance
     */
    getSuccessChance(inst: any, params: any={}) {
        if (inst == null) {throw new Error("Invalid Bladeburner instance passed into Action.getSuccessChance");}
        let difficulty = this.getDifficulty();
        let competence = 0;
        for (let stat in this.weights) {
            if (this.weights.hasOwnProperty(stat)) {
                let playerStatLvl = Player.queryStatFromString(stat);
                let key = "eff" + stat.charAt(0).toUpperCase() + stat.slice(1);
                let effMultiplier = inst.skillMultipliers[key];
                if (effMultiplier == null) {
                    console.error(`Failed to find Bladeburner Skill multiplier for: ${stat}`);
                    effMultiplier = 1;
                }
                competence += (this.weights[stat] * Math.pow(effMultiplier*playerStatLvl, this.decays[stat]));
            }
        }
        competence *= Player.getIntelligenceBonus(0.75);
        competence *= inst.calculateStaminaPenalty();

        competence *= this.getTeamSuccessBonus(inst);

        competence *= this.getChaosCompetencePenalty(inst, params);
        difficulty *= this.getChaosDifficultyBonus(inst, params);

        if(this.name == "Raid" && inst.getCurrentCity().comms <= 0) {
            return 0;
        }

        // Factor skill multipliers into success chance
        competence *= inst.skillMultipliers.successChanceAll;
        competence *= this.getActionTypeSkillSuccessBonus(inst);
        if (this.isStealth) {
            competence *= inst.skillMultipliers.successChanceStealth;
        }
        if (this.isKill) {
            competence *= inst.skillMultipliers.successChanceKill;
        }

        // Augmentation multiplier
        competence *= Player.bladeburner_success_chance_mult;

        if (isNaN(competence)) {throw new Error("Competence calculated as NaN in Action.getSuccessChance()");}
        return Math.min(1, competence / difficulty);
    }

    getSuccessesNeededForNextLevel(baseSuccessesPerLevel: number): number {
        return Math.ceil((0.5) * (this.maxLevel) * (2 * baseSuccessesPerLevel + (this.maxLevel-1)));
    }

    setMaxLevel(baseSuccessesPerLevel: number): void {
        if (this.successes >= this.getSuccessesNeededForNextLevel(baseSuccessesPerLevel)) {
            ++this.maxLevel;
        }
    }

    static fromJSON(value: any): Action {
        return Generic_fromJSON(Action, value.data);
    }

    toJSON(): any {
        return Generic_toJSON("Action", this);
    }
}






Reviver.constructors.Action = Action;