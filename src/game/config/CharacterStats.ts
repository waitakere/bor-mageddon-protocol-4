export const CHARACTER_STATS = {
    marko_1993: {
        baseSpeed: 300, // Bumped up for a much snappier walk
        runSpeed: 550,  // Aggressive sprint speed
        maxHealth: 100,
        hitDamage: 12
    },
    darko_1993: {
        baseSpeed: 320, // Darko is the lightest/fastest of the group
        runSpeed: 580,  // Very fast sprint
        maxHealth: 90,
        hitDamage: 10
    },
    maja_1993: {
        baseSpeed: 270, // Maja is the Heavy/Tank, but gets a baseline speed boost so she doesn't feel sluggish
        runSpeed: 500,  // Solid, heavy charge
        maxHealth: 130,
        hitDamage: 15
    },
    // Fallback default
    default: {
        baseSpeed: 300,
        runSpeed: 550,
        maxHealth: 100,
        hitDamage: 12
    }
};