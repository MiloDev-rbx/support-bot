function hasAllowedRole(member, allowedRoleIds = []) {
    if (!Array.isArray(allowedRoleIds) || allowedRoleIds.length === 0) {
        return true;
    }

    if (!member || !member.roles) {
        return false;
    }

    if (Array.isArray(member.roles)) {
        return allowedRoleIds.some(roleId => member.roles.includes(roleId));
    }

    if (member.roles.cache) {
        return allowedRoleIds.some(roleId => member.roles.cache.has(roleId));
    }

    return false;
}

function formatAllowedRoles(allowedRoleIds = []) {
    if (!Array.isArray(allowedRoleIds) || allowedRoleIds.length === 0) {
        return "todos los usuarios";
    }

    return allowedRoleIds.map(roleId => `<@&${roleId}>`).join(", ");
}

async function canUseCommand(interaction, command) {
    const allowedRoleIds = command.allowedRoleIds || [];

    if (hasAllowedRole(interaction.member, allowedRoleIds)) {
        return true;
    }

    await interaction.reply({
        content: `No tienes permisos para usar este comando. Rangos permitidos: ${formatAllowedRoles(allowedRoleIds)}.`,
        ephemeral: true
    });

    return false;
}

module.exports = {
    canUseCommand
};
