// Shared application constants to avoid magic numbers across code and tests
export const CLOCK_TICK_MS = 1000;
export const DEFAULT_FREEZE_SECONDS = 180;
export const DEFAULT_REASK_LIMIT = 3;
export const DEFAULT_MIN_CHARACTERS = 80;
export const MIN_CHARACTERS_FLOOR = 1;
export const MIN_CHARACTERS_CEILING = 10000;

export const MAX_OUTPUT_TOKENS_SMALL = 300;
export const MAX_OUTPUT_TOKENS_DEFAULT = 1200;
export const MAX_OUTPUT_TOKENS_GENERATE = 2000;
export const MAX_RETRIES = 1;

export const OPENAI_MODELS = ['gpt-5.4-mini', 'gpt-5.5'];
export const GEMINI_MODELS = ['gemini-3.6-flash'];

// Test helpers
export const TEST_SAMPLE_LENGTH = 150;

// UI sizing (shared)
export const ICON_SIZE_LARGE = 21;
export const ICON_SIZE_MEDIUM = 20;
export const ICON_SIZE_SMALL = 16;
