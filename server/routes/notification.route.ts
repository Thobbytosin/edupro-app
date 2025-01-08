import { Router } from "express";
import {
  getAllNotifications,
  updateNotificationStatus,
} from "../controllers/notification.controller";
import { authorizeRoles, isAuthenticated } from "../middlewares/auth";
import { updateAccessToken } from "../controllers/user.controller";

const notificationRouter = Router();

notificationRouter.get(
  "/get-all-notifications",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  getAllNotifications
);

notificationRouter.put(
  "/update-notification-status/:id",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  updateNotificationStatus
);

export default notificationRouter;
