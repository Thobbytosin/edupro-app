import express from "express";
import {
  activateUser,
  deleteUser,
  getAdmins,
  getAllAdmins,
  getAllUsers,
  getAllUsersLatestInfo,
  getUserInfo,
  loginUser,
  logoutUser,
  markVideoAsViewed,
  registerUser,
  socialAuth,
  updateAccessToken,
  updateAccessTokenEveryPage,
  updatePassword,
  updateProfilePicture,
  updateUserInfo,
  updateUserRole,
} from "../controllers/user.controller";
import { authorizeRoles, isAuthenticated } from "../middlewares/auth";
import { fileParser } from "../middlewares/fileParser";

const userRouter = express.Router();

// register user
userRouter.post("/registration", registerUser);

// activate user account(verify email)
userRouter.post("/activate-user", activateUser);

// login user
userRouter.post("/login", loginUser);

// logout user
userRouter.get("/logout", isAuthenticated, logoutUser);

// refresh access token on each page (to keep user logged in)
userRouter.get("/refresh", updateAccessTokenEveryPage);

// get user profile
userRouter.get("/me", updateAccessToken, isAuthenticated, getUserInfo);

// login user with social accounts
userRouter.post("/social-auth", socialAuth);

// update user profile (name and email)
userRouter.put(
  "/update-user-info",
  updateAccessToken,
  isAuthenticated,
  updateUserInfo
);

// update user password
userRouter.put(
  "/update-user-password",
  updateAccessToken,
  isAuthenticated,
  updatePassword
);

// update user profile image
userRouter.put(
  "/update-profile-picture",
  updateAccessToken,
  isAuthenticated,
  fileParser,
  updateProfilePicture
);

// get all users (admin only)
userRouter.get(
  "/get-all-users",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  getAllUsers
);

// get all admins
userRouter.get(
  "/get-all-admins",
  updateAccessToken,
  isAuthenticated,
  getAllAdmins
);

// get all admins (without logged in)
userRouter.get("/get-admins", getAdmins);

// update user role (admin only)
userRouter.put(
  "/update-user-role",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  updateUserRole
);

// delete user account (admin only)
userRouter.delete(
  "/delete-user/:userId",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  deleteUser
);

// update userVideoViewed
userRouter.put(
  "/update-user-videos-viewed",
  updateAccessToken,
  isAuthenticated,
  markVideoAsViewed
);

userRouter.get("/get-users-latest", getAllUsersLatestInfo);

export default userRouter;
