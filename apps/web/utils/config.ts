
// Fallback configuration since .env.local is gitignored in this environment
// In production, these should be environment variables.

export const PROTOCOL_ADDRESS = process.env.NEXT_PUBLIC_PROTOCOL_ADDRESS || "0x0e401767d60c9A055A97cF5667A94dDc1A0527C7";
export const DEBUG_MODE = true;
