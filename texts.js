// Global TEXTS object for centralized text management
const TEXTS = {
    // Menu & Navigation
    MENU: {
        TITLE: 'Lisa\'s Christmas Game',
        SUBTITLE: 'Choose your mode',
        NORMAL_MODE_TITLE: '🎁 PRESENT MODE 🎁',
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
        MESSAGE: 'You hit an obstacle!',
        DISTANCE_FORMAT: (distance, total) => `Distance covered: ${Math.floor(distance)}m of ${total}m`,
        RESTART_HINT: 'Press SPACEBAR to restart'
    },

    // Win Screen
    WIN_SCREEN: {
        TITLE: '🎄 MERRY CHRISTMAS! 🎄',
        GIFT_HEADER: 'Gift Certificate for Lisa',
        TRIP_HIGHLIGHT: '✨ ALL-INCLUSIVE SKI TRIP ✨',
        TRIP_TO: 'to',
        LOCATION: '🏔️ HOCHFICHT, Austria 🏔️',
        DATE: '📅 January 6, 2026 📅',
        MEAL_HEADER: '🍽️ MEAL INCLUDED 🍽️',
        MEAL_DETAIL: '🌭 Serviervorschlag: Currywurst & Fries 🍟'
    },

    // Boost Meter
    BOOST_METER: {
        BOOSTING: '💨 BOOSTING! 💨',
        READY: 'BOOST READY!',
        COOLDOWN: '🫘 Digesting... 🫘'
    },

    // Progress Bar (Normal Mode)
    PROGRESS: {
        LABEL: 'Distance till 🎁',
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
