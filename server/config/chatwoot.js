const CHATWOOT_BASE_URL = String(process.env.CHATWOOT_BASE_URL || '').trim();
const CHATWOOT_API_INBOX_IDENTIFIER = String(process.env.CHATWOOT_API_INBOX_IDENTIFIER || '').trim();
const CHATWOOT_ENABLED = String(process.env.CHATWOOT_ENABLED || '').trim().toLowerCase() !== 'false';
const CHATWOOT_WEBHOOK_SECRET = String(process.env.CHATWOOT_WEBHOOK_SECRET || '').trim();

module.exports = {
    CHATWOOT_BASE_URL,
    CHATWOOT_API_INBOX_IDENTIFIER,
    CHATWOOT_ENABLED,
    CHATWOOT_WEBHOOK_SECRET
};
