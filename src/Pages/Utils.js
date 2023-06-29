export function getStatMod(value, otherModifiers = 0) {
    if (typeof(value) !== "number") {
        return 0;
    }
    if (typeof(otherModifiers) !== "number") {
        otherModifiers = 0;
    }

    const modifier = Math.floor((value - 10)/2) + otherModifiers;
    if (modifier <= 0) {
        return modifier.toString();
    }
    return "+" + modifier;
}

export function characterReducer(oldData, action) {
    switch (action.type) {
        case "validate":
            return characterDataValidation(oldData);
        case "change-proficiency":
            return changeProficiency(oldData, action.proficiency, action.newValue);
        case "change-text-field":
            return changeField(oldData, action.mergeObject, action.fieldName);
        default:
            break;
    }
    console.error("incorrect action type passed to characterReducer");
    return oldData;
}

export function changeField(oldData, replacementData, fieldName = "") {
    if (fieldName !== "") {
        const newData = {
            ...oldData
        }
        newData[fieldName] = {
            ...newData[fieldName],
            ...replacementData,
        }
        return newData;
    }

    return {
        ...oldData,
        ...replacementData,
    };
}

function changeProficiency(oldData, proficiency, newValue) {
    const newData = {...oldData};
    newData.proficiencies[proficiency] = newValue;
    return newData;
}

export function characterDataValidation(characterData) {
    const validatedData = {...characterData};
    // General info check
    validatedData.characterName ??= "Lorem";
    validatedData.characterClass ??= "Ispum";
    validatedData.characterLevel ??= "Dolor";
    validatedData.characterBackground ??= "Sit";
    validatedData.characterRace ??= "Amet";
    // Primary skills check
    const primarySkillNames = ["str", "dex", "con", "int", "wis", "cha"];
    if (!("primarySkills" in validatedData)) {
        validatedData["primarySkills"] = {};
    }
    primarySkillNames.forEach(
        ps => {
            if (!(ps in validatedData["primarySkills"])) {
                validatedData["primarySkills"][ps] = 10;
            }
        }
    );
    // Proficiencies
    if (!("proficiencies" in validatedData)) {
        validatedData["proficiencies"] = {};
    }
    if (!("proficiencyModifier" in validatedData) ||
        typeof(validatedData["proficiencyModifier"]) !== "number"
    ) {
        validatedData["proficiencyModifier"] = 2;
    }
    // Death saving throws
    validatedData.deathSavingThrows ??= {};
    validatedData.deathSavingThrows.successes ??= 0;
    validatedData.deathSavingThrows.failures ??= 0;
    // Battle stats
    validatedData.armorClass ??= 10;
    validatedData.intiative ??= "+0";
    validatedData.hitDice ??= "0d0";
    validatedData.hitDiceTotal ??= "0";
    validatedData.exhaustion ??=  0;

    return validatedData;
}

export const defaultCharacter = {
    "characterName": "Daino",
    "characterClass": "Artificier",
    "characterLevel": "8",
    "characterBackground": "Sage",
    "characterRace": "Gnome",
    "primarySkills": {
        "str": 8,
        "dex": 16,
        "con": 12,
        "int": 20,
        "wis": 14,
        "cha": 10,
    },
    "proficiencyModifier": 3,
    "proficiencies": {
        "acrobatics": 1,
        "arcana": 1,
        "history": 1,
        "medicine": 1,
        "perception": 1,
        "conSaving": 1,
        "intSaving": 1,
    },
    "health": {
        "maxHp": 43,
        "currentHp": 43,
        "tempHp": 7,
    },
    "armorClass": 19,
    "initiative": "+3",
    "hitDice": "8d8",
    "hitDiceTotal": "8d8",
    "exhaustion": 0,
    "deathSavingThrows": {
        "successes": 0,
        "failures": 0,
    }
}

export const defaultLayout = {
    "MagicalButton1": {x: 1, y: 23, w: 1, h: 2},
    "MagicalButton2": {x: 2, y: 23, w: 1, h: 2},
    "MagicalButton3": {x: 3, y: 23, w: 1, h: 2},
    "GeneralInfo": {x: 1, y: 1, w: -1, h: 3},
    "PrimarySkills": {x: 1, y: 4, w: 2, h: 18},
    "SecondarySkills": {x: 3, y: 4, w: 3, h: 18},
    "BattleStats": {x: 6, y: 4, w: 3, h: 4},
    "HealthStats": {x: 9, y: 4, w: -1, h: 4},
    "DeathSavesTracker": {x: 6, y: 8, w: 3, h: 3},
    "HitdiceTracker": {x: 9, y: 8, w: 2, h: 3},
    "ExhaustionTracker": {x: 11, y: 8, w: -1, h: 3},
    "SavingThrows": {x: 7, y: 11, w: 2, h: 3},
}