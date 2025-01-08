"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateNotificationStatus = exports.getAllNotifications = void 0;
const catchAsyncErrors_1 = __importDefault(require("../middlewares/catchAsyncErrors"));
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const notification_model_1 = __importDefault(require("../models/notification.model"));
const node_cron_1 = __importDefault(require("node-cron"));
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
// get all notifications - only admin
exports.getAllNotifications = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const notifications = await notification_model_1.default.find().sort({ createdAt: -1 });
        res.status(201).json({ success: true, notifications });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
// update notification status - only admin
exports.updateNotificationStatus = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const notificationId = req.params.id;
        console.log(notificationId);
        const notification = await notification_model_1.default.findById(notificationId);
        if (!notification) {
            return next(new errorHandler_1.default("Notification not found", 404));
        }
        else {
            notification.status
                ? (notification.status = "read")
                : notification.status;
        }
        await notification.save();
        const notifications = await notification_model_1.default.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, notifications });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////
// delete notification after 30 days - only admin
node_cron_1.default.schedule("0 0 0 * * *", async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await notification_model_1.default.deleteMany({
        status: "read",
        createdAt: { $lt: thirtyDaysAgo },
    });
});
// 1 assume the created date is 1
// and i want to delete after 30 days
//  ------------
// 20 - 30 = -10 from  day 20
// 21 - 30 = -9 day 21 day
// 22 - 30 = -8
// 23 - 30 = -7
// 24 - 30 = -6
// 25 - 30 = -5
// 26 - 30 = -4
// 27 - 30 = -3
// 28 - 30 = -2
// 29  - 30 = -1
// 30 - 30 = 0  the function will be called here since 1 < 0
// 31 - 30 = 1
