const baileysService = require('../services/baileysNotificationService');

module.exports = {
    async getBaileysStatus(_req, res) {
        return res.json({
            data: baileysService.getStatus()
        });
    },

    async requestBaileysQr(_req, res) {
        try {
            await baileysService.startSession();
            await baileysService.waitForQr();
            return res.json({
                data: baileysService.getStatus()
            });
        } catch (error) {
            return res.status(500).json({
                message: 'Не удалось запустить WhatsApp Baileys',
                error: error.message
            });
        }
    },

    async restartBaileysSession(_req, res) {
        try {
            await baileysService.stopSession();
            await baileysService.startSession();
            await baileysService.waitForQr(7000);
            return res.json({
                data: baileysService.getStatus()
            });
        } catch (error) {
            return res.status(500).json({
                message: 'Не удалось перезапустить WhatsApp Baileys',
                error: error.message
            });
        }
    },

    async logoutBaileysSession(_req, res) {
        try {
            await baileysService.logoutSession();
            return res.json({
                data: baileysService.getStatus()
            });
        } catch (error) {
            return res.status(500).json({
                message: 'Не удалось разлогинить WhatsApp Baileys',
                error: error.message
            });
        }
    },

    async getBaileysEvents(req, res) {
        const sinceId = Number(req.query?.sinceId || 0);
        const limit = Number(req.query?.limit || 100);
        return res.json({
            data: baileysService.getEvents({ sinceId, limit })
        });
    }
};
