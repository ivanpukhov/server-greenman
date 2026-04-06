const dialog360Service = require('../utilities/dialog360Service');
const whatsappWebhookRoutes = require('../routes/whatsappWebhookRoutes');

module.exports = {
    async getConnectionStatus(_req, res) {
        try {
            const settings = await dialog360Service.getWebhook().catch((error) => ({
                error: error.message
            }));
            const webhookUrl = String(settings?.url || '').trim() || null;

            return res.json({
                data: {
                    connection: webhookUrl ? 'configured' : 'missing_webhook',
                    provider: '360dialog Cloud API',
                    supportsQr: false,
                    supportsReboot: false,
                    supportsLogout: false,
                    settings,
                    qr: null,
                    updatedAt: new Date().toISOString()
                }
            });
        } catch (error) {
            return res.status(500).json({
                message: 'Не удалось получить состояние 360dialog',
                error: error.message
            });
        }
    },

    async getQr(_req, res) {
        return res.status(400).json({
            message: 'QR для 360dialog Cloud API не используется'
        });
    },

    async reboot(_req, res) {
        return res.status(400).json({
            message: 'Перезапуск instance не поддерживается в 360dialog Cloud API'
        });
    },

    async logout(_req, res) {
        return res.status(400).json({
            message: 'Logout instance не поддерживается в 360dialog Cloud API'
        });
    },

    async setWebhook(req, res) {
        try {
            const webhookUrl = String(req.body?.webhookUrl || '').trim();
            if (!webhookUrl) {
                return res.status(400).json({
                    message: 'Укажите webhookUrl'
                });
            }

            const headers = req.body?.headers && typeof req.body.headers === 'object'
                ? req.body.headers
                : null;

            const data = await dialog360Service.setWebhook({
                url: webhookUrl,
                headers
            });

            return res.json({
                data
            });
        } catch (error) {
            return res.status(500).json({
                message: 'Не удалось сохранить webhook 360dialog',
                error: error.message
            });
        }
    },

    async getWebhookEvents(req, res) {
        const limit = Number(req.query?.limit || 15);
        return res.json({
            data: typeof whatsappWebhookRoutes.getWebhookEvents === 'function'
                ? whatsappWebhookRoutes.getWebhookEvents(limit)
                : []
        });
    }
};
