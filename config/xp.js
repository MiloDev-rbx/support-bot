const XP_CONFIG = {
    xpPerMessage: 5,
    messageCooldownMs: 10 * 1000,
    minMessageLength: 5,
    repeatedMessageWindowMs: 60 * 1000,
    repeatedMessageLimit: 3,
    excludedChannelIds: [],

    eventXp: {
        smallEventXp: 3,
        fullEventXp: 5,
        minAttendeesForFullXp: 5
    },

    adminRoleIds: [
        "1516323966740856942",
        "1527967894854697061",
        "1519266891674161252",
        "1519266851077750804"
    ],

    levelRoleIds: {
        1: "1534325985602830397",
        2: "1534326239534387371",
        3: "1534332731956138164",
        4: "1534327040298450964",
        5: "1534328314515423233",
        6: "1534333800191103139",
        7: "1534328800861487306",
        8: "1534334610823970816",
        9: "1534334870287945900"
    },

    leaderboard: {
        limit: 10
    },

    logs: {
        channelId: process.env.XP_LOG_CHANNEL_ID || "1533480045090177034",
        color: 0x2f80ed
    },

    messages: {
        levelUpEnabled: true
    }
};

module.exports = {
    XP_CONFIG
};
