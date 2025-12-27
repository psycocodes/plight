export const REVOCATION_SCHEMA_VERSION = '1.0.0';

export function getAuditInfo() {
    return {
        schema_version: REVOCATION_SCHEMA_VERSION,
        timestamp: new Date().toISOString()
    };
}
