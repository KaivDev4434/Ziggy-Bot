export declare const API_ENDPOINTS: {
    readonly AUTH: {
        readonly LOGIN: "/auth/login";
        readonly LOGOUT: "/auth/logout";
        readonly PROFILE: "/auth/profile";
        readonly REFRESH: "/auth/refresh";
    };
    readonly TASKS: {
        readonly BASE: "/tasks";
        readonly BY_ID: (id: string) => string;
        readonly SEARCH: "/tasks/search";
        readonly BULK: "/tasks/bulk";
    };
    readonly CHAT: {
        readonly MESSAGES: "/chat/messages";
        readonly CONVERSATIONS: "/chat/conversations";
        readonly PROCESS: "/chat/process";
    };
};
export declare const DEFAULT_VALUES: {
    readonly TASK_PRIORITY: 5;
    readonly TASK_DURATION: 30;
    readonly PAGE_SIZE: 20;
    readonly MAX_TASK_TITLE_LENGTH: 200;
    readonly MAX_TASK_DESCRIPTION_LENGTH: 1000;
    readonly MIN_PASSWORD_LENGTH: 8;
    readonly JWT_EXPIRES_IN: "7d";
    readonly RATE_LIMIT_WINDOW: number;
    readonly RATE_LIMIT_MAX_REQUESTS: 100;
};
export declare const PRIORITY_LABELS: {
    readonly 1: "Very Low";
    readonly 2: "Low";
    readonly 3: "Low";
    readonly 4: "Medium";
    readonly 5: "Medium";
    readonly 6: "Medium";
    readonly 7: "High";
    readonly 8: "High";
    readonly 9: "Urgent";
    readonly 10: "Critical";
};
export declare const TIME_CONSTANTS: {
    readonly MINUTE: number;
    readonly HOUR: number;
    readonly DAY: number;
    readonly WEEK: number;
};
export declare const REGEX_PATTERNS: {
    readonly EMAIL: RegExp;
    readonly TIME_FORMAT: RegExp;
    readonly DATE_FORMAT: RegExp;
};
//# sourceMappingURL=constants.d.ts.map