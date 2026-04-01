const notificationRepository = require("../../repositories/mobile/notificationRepository");

async function getNotificationSummary(userId, { limit, status } = {}) {
  const [notifications, unreadCount] = await Promise.all([
    notificationRepository.getNotificationsByUserId(userId, { limit, status }),
    notificationRepository.getUnreadNotificationCountByUserId(userId),
  ]);

  return {
    notifications,
    unreadCount,
  };
}

module.exports = {
  getNotificationSummary,
};
