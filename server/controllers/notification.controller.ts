import { NextFunction, Request, Response } from "express";
import catchAsyncError from "../middlewares/catchAsyncErrors";
import ErrorHandler from "../utils/errorHandler";
import Notification from "../models/notification.model";
import cron from "node-cron";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
// get all notifications - only admin
export const getAllNotifications = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notifications = await Notification.find().sort({ createdAt: -1 });

      res.status(201).json({ success: true, notifications });
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
// update notification status - only admin

export const updateNotificationStatus = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notificationId = req.params.id;

      console.log(notificationId);

      const notification = await Notification.findById(notificationId);

      if (!notification) {
        return next(new ErrorHandler("Notification not found", 404));
      } else {
        notification.status
          ? (notification.status = "read")
          : notification.status;
      }

      await notification.save();

      const notifications = await Notification.find().sort({ createdAt: -1 });

      res.status(200).json({ success: true, notifications });
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

////////////////////////////////////////////////////////////////////////////////////////////////////////////
// delete notification after 30 days - only admin

cron.schedule("0 0 0 * * *", async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await Notification.deleteMany({
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
