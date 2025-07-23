"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REGEX_PATTERNS = exports.TIME_CONSTANTS = exports.PRIORITY_LABELS = exports.DEFAULT_VALUES = exports.API_ENDPOINTS = void 0;
// API Endpoints
exports.API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/auth/login',
        LOGOUT: '/auth/logout',
        PROFILE: '/auth/profile',
        REFRESH: '/auth/refresh'
    },
    TASKS: {
        BASE: '/tasks',
        BY_ID: (id) => `/tasks/${id}`,
        SEARCH: '/tasks/search',
        BULK: '/tasks/bulk'
    },
    CHAT: {
        MESSAGES: '/chat/messages',
        CONVERSATIONS: '/chat/conversations',
        PROCESS: '/chat/process'
    }
};
// Default values
exports.DEFAULT_VALUES = {
    TASK_PRIORITY: 5,
    TASK_DURATION: 30, // minutes
    PAGE_SIZE: 20,
    MAX_TASK_TITLE_LENGTH: 200,
    MAX_TASK_DESCRIPTION_LENGTH: 1000,
    MIN_PASSWORD_LENGTH: 8,
    JWT_EXPIRES_IN: '7d',
    RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: 100
};
// Task priority mappings
exports.PRIORITY_LABELS = {
    1: 'Very Low',
    2: 'Low',
    3: 'Low',
    4: 'Medium',
    5: 'Medium',
    6: 'Medium',
    7: 'High',
    8: 'High',
    9: 'Urgent',
    10: 'Critical'
};
// Time-related constants
exports.TIME_CONSTANTS = {
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000
};
// Regex patterns
exports.REGEX_PATTERNS = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    TIME_FORMAT: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    DATE_FORMAT: /^\d{4}-\d{2}-\d{2}$/
};
//# sourceMappingURL=constants.js.map