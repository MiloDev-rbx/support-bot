function getRequiredXpForLevel(level) {
    if (level <= 0) {
        return 0;
    }

    return level * level * 100;
}

function calculateLevel(totalXp) {
    let level = 0;

    while (totalXp >= getRequiredXpForLevel(level + 1)) {
        level += 1;
    }

    return level;
}

function getNextLevelInfo(totalXp) {
    const level = calculateLevel(totalXp);
    const nextLevel = level + 1;
    const requiredXp = getRequiredXpForLevel(nextLevel);

    return {
        level,
        nextLevel,
        requiredXp,
        remainingXp: Math.max(0, requiredXp - totalXp)
    };
}

module.exports = {
    calculateLevel,
    getNextLevelInfo,
    getRequiredXpForLevel
};
