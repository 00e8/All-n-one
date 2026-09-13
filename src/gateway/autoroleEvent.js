const { Events } = require('discord.js');

module.exports = {
    name: Events.GuildMemberAdd,

    async execute(member, client) {
        try {
            const stored = client.db.autorole.get(
                member.guild.id
            );

            const storedSettings = stored?.roles;

            const autoroleSettings =
                storedSettings &&
                !Array.isArray(storedSettings)
                    ? storedSettings
                    : {
                          enabled: false,
                          roles: Array.isArray(storedSettings)
                              ? storedSettings
                              : [],
                          botRoles: [],
                      };

            if (!autoroleSettings?.enabled) return;

            const rolesToAdd = member.user.bot
                ? autoroleSettings.botRoles
                : autoroleSettings.roles;

            if (
                !Array.isArray(rolesToAdd) ||
                rolesToAdd.length === 0
            ) {
                return;
            }

            const botMember =
                member.guild.members.me;

            if (!botMember) return;

            const reason = `Autorole addition for ${member.user.tag}`;

            for (const roleId of rolesToAdd) {
                try {
                    const role =
                        member.guild.roles.cache.get(roleId);

                    if (!role) continue;

                    if (
                        role.position >=
                        botMember.roles.highest.position
                    ) {
                        continue;
                    }

                    if (member.roles.cache.has(role.id)) {
                        continue;
                    }

                    await member.roles.add(
                        role,
                        reason
                    );
                } catch {}
            }
        } catch {}
    },
};