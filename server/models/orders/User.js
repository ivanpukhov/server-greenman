const Sequelize = require('sequelize');
const orderDB = require('../../utilities/orderDatabase');
const Order = require("./Order");
const OrderProfile = require("./OrderProfile");

const User = orderDB.define('user', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    phoneNumber: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
    },
    firstName: {
        type: Sequelize.STRING,
        allowNull: true
    },
    lastName: {
        type: Sequelize.STRING,
        allowNull: true
    },
    role: {
        type: Sequelize.STRING,
        defaultValue: 'user' // 'user' или 'admin'
    },
    confirmationCode: {
        type: Sequelize.STRING,
        allowNull: true
    },
    confirmationCodeExpires: {
        type: Sequelize.DATE,
        allowNull: true
    },
    isPhoneConfirmed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
    },
    resetPasswordCode: {
        type: Sequelize.STRING,
        allowNull: true
    },
    resetPasswordExpires: {
        type: Sequelize.DATE,
        allowNull: true
    },
    lastIncomingMessageAt: {
        type: Sequelize.DATE,
        allowNull: true
    },
    pendingWhatsAppMessages: {
        type: Sequelize.TEXT,
        allowNull: true
    },
    isWaitingForWhatsappWindowOpen: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    lastAgreeTemplateSentAt: {
        type: Sequelize.DATE,
        allowNull: true
    },
    chatwootContactIdentifier: {
        type: Sequelize.STRING,
        allowNull: true
    },
    chatwootConversationId: {
        type: Sequelize.INTEGER,
        allowNull: true
    }
});

// Отношения с другими моделями
User.hasMany(Order, { foreignKey: 'userId' });
User.hasMany(OrderProfile, { foreignKey: 'userId' });
Order.belongsTo(User, { foreignKey: 'userId' });
OrderProfile.belongsTo(User, { foreignKey: 'userId' });

module.exports = User;
