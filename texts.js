// Global TEXTS object for centralized text management
const TEXTS = {
    // Menu & Navigation
    MENU: {
        TITLE: 'Lisa\'s Christmas Game',
        SUBTITLE: 'Choose your mode',
        NORMAL_MODE_TITLE: 'PRESENT MODE',
        NORMAL_MODE_DESC: 'Much to win, nothing to lose',
        ENDLESS_MODE_TITLE: 'ENDLESS MODE',
        ENDLESS_MODE_DESC: 'Much to lose, nothing to win',
        MENU_BUTTON: 'MENU'
    },

    // Game Title
    GAME_TITLE: "Lisa's Christmas Game",

    // Control Instructions
    INSTRUCTIONS: {
        JUMP: 'Press W or UP to jump',
        BOOST: 'Double tap D or -> for Boost'
    },

    // Game Over Screen
    GAME_OVER: {
        TITLE: '💥 GAME OVER 💥',
        MESSAGE: 'Du hast ein Hindernis getroffen!',
        DISTANCE_FORMAT: (distance, total) => `Geschaffte Distanz: ${Math.floor(distance)}m von ${total}m`,
        RESTART_HINT: 'Drücke LEERTASTE zum Neustarten'
    },

    // Win Screen
    WIN_SCREEN: {
        TITLE: '🎄 FROHE WEIHNACHTEN! 🎄',
        GIFT_HEADER: 'Geschenkgutschein für Lisa',
        TRIP_HIGHLIGHT: '✨ ALL-INCLUSIVE SKITRIP ✨',
        TRIP_TO: 'nach',
        LOCATION: '🏔️ HOCHFICHT, Österreich 🏔️',
        DATE: '📅 6. Januar 2026 📅',
        MEAL_HEADER: '🍽️ INKLUSIVE EINKEHR 🍽️',
        MEAL_DETAIL: '🌭 Currywurst & Pommes 🍟'
    },

    // Boost Meter
    BOOST_METER: {
        BOOSTING: '💨 BOOSTING! 💨',
        READY: 'BOOST READY!',
        COOLDOWN: '🫘 Digesting... 🫘'
    },

    // Progress Bar (Normal Mode)
    PROGRESS: {
        LABEL: 'Distance till present',
        DISTANCE_FORMAT: (distance, total) => {
            const remaining = total - distance;
            return `${Math.floor(distance)}m / ${total}m  (${Math.floor(remaining)}m remaining)`;
        }
    },

    // Distance Counter (Endless Mode)
    DISTANCE_COUNTER: {
        LABEL: 'Distance',
        DISTANCE_FORMAT: (distance) => `${Math.floor(distance)}m`,
        HIGH_SCORE_FORMAT: (score) => `Best: ${score}m`
    },

    // Milestone Animation (Endless Mode)
    MILESTONE: {
        DISTANCE_FORMAT: (distance) => `${distance}m!`,
        ACHIEVEMENT: 'Milestone Reached!'
    }
};
