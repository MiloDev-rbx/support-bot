const { XP_CONFIG } = require("../config/xp");

function getRoleIdForLevel(level) {
    const cappedLevel = Math.min(level, Object.keys(XP_CONFIG.levelRoleIds).length);
    return XP_CONFIG.levelRoleIds[cappedLevel] || null;
}

function getProgressRoleIds() {
    return Object.values(XP_CONFIG.levelRoleIds).filter(Boolean);
}

async function updateMemberLevelRole(member, level) {
    if (!member) {
        return {
            changed: false,
            roleId: null
        };
    }

    const targetRoleId = getRoleIdForLevel(level);
    const progressRoleIds = getProgressRoleIds();
    const rolesToRemove = progressRoleIds.filter(roleId =>
        roleId !== targetRoleId && member.roles.cache.has(roleId)
    );

    let changed = false;

    if (rolesToRemove.length > 0) {
        await member.roles.remove(rolesToRemove);
        changed = true;
    }

    if (targetRoleId && !member.roles.cache.has(targetRoleId)) {
        await member.roles.add(targetRoleId);
        changed = true;

        return {
            changed,
            roleId: targetRoleId
        };
    }

    return {
        changed,
        roleId: targetRoleId
    };
}

async function safelyUpdateMemberLevelRole(member, level) {
    try {
        return await updateMemberLevelRole(member, level);
    } catch (error) {
        console.error("No se pudo sincronizar el rol de nivel:", error);

        return {
            changed: false,
            roleId: getRoleIdForLevel(level),
            error
        };
    }
}

module.exports = {
    getRoleIdForLevel,
    updateMemberLevelRole: safelyUpdateMemberLevelRole
};
