const greenApiService = require('../utilities/greenApiService');

module.exports = {
    async getConnectionStatus(_req, res) {
        try {
            const [stateInstance, settings, qr] = await Promise.all([
                greenApiService.getStateInstance(),
                greenApiService.getSettings(),
                greenApiService.getQr().catch(() => null)
            ]);

            return res.json({
                data: {
                    connection: String(stateInstance?.stateInstance || '').trim() || 'unknown',
                    stateInstance,
                    settings,
                    qr,
                    updatedAt: new Date().toISOString()
                }
            });
        } catch (error) {
            return res.status(500).json({
                message: 'Не удалось получить состояние Green API',
                error: error.message
            });
        }
    },

    async getQr(_req, res) {
        try {
            const qr = await greenApiService.getQr();
            return res.json({
                data: qr
            });
        } catch (error) {
            return res.status(500).json({
                message: 'Не удалось получить QR Green API',
                error: error.message
            });
        }
    },

    async reboot(_req, res) {
        try {
            const data = await greenApiService.reboot();
            return res.json({
                data
            });
        } catch (error) {
            return res.status(500).json({
                message: 'Не удалось перезапустить Green API instance',
                error: error.message
            });
        }
    },

    async logout(_req, res) {
        try {
            const data = await greenApiService.logout();
            return res.json({
                data
            });
        } catch (error) {
            return res.status(500).json({
                message: 'Не удалось разлогинить Green API instance',
                error: error.message
            });
        }
    },

    async setWebhook(req, res) {
        try {
            const webhookUrl = String(req.body?.webhookUrl || '').trim();
            if (!webhookUrl) {
                return res.status(400).json({
                    message: 'Укажите webhookUrl'
                });
            }

            const data = await greenApiService.setSettings({
                webhookUrl
            });

            return res.json({
                data
            });
        } catch (error) {
            return res.status(500).json({
                message: 'Не удалось сохранить webhook Green API',
                error: error.message
            });
        }
    }
};
