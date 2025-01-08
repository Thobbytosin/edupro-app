"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_controller_1 = require("../controllers/user.controller");
const auth_1 = require("../middlewares/auth");
const fileParser_1 = require("../middlewares/fileParser");
const userRouter = express_1.default.Router();
// register user
userRouter.post("/registration", user_controller_1.registerUser);
// activate user account(verify email)
userRouter.post("/activate-user", user_controller_1.activateUser);
// login user
userRouter.post("/login", user_controller_1.loginUser);
// logout user
userRouter.get("/logout", auth_1.isAuthenticated, user_controller_1.logoutUser);
// refresh access token on each page (to keep user logged in)
userRouter.get("/refresh", user_controller_1.updateAccessTokenEveryPage);
// get user profile
userRouter.get("/me", user_controller_1.updateAccessToken, auth_1.isAuthenticated, user_controller_1.getUserInfo);
// login user with social accounts
userRouter.post("/social-auth", user_controller_1.socialAuth);
// update user profile (name and email)
userRouter.put("/update-user-info", user_controller_1.updateAccessToken, auth_1.isAuthenticated, user_controller_1.updateUserInfo);
// update user password
userRouter.put("/update-user-password", user_controller_1.updateAccessToken, auth_1.isAuthenticated, user_controller_1.updatePassword);
// update user profile image
userRouter.put("/update-profile-picture", user_controller_1.updateAccessToken, auth_1.isAuthenticated, fileParser_1.fileParser, user_controller_1.updateProfilePicture);
// get all users (admin only)
userRouter.get("/get-all-users", user_controller_1.updateAccessToken, auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("admin"), user_controller_1.getAllUsers);
// get all admins
userRouter.get("/get-all-admins", user_controller_1.updateAccessToken, auth_1.isAuthenticated, user_controller_1.getAllAdmins);
// update user role (admin only)
userRouter.put("/update-user-role", user_controller_1.updateAccessToken, auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("admin"), user_controller_1.updateUserRole);
// delete user account (admin only)
userRouter.delete("/delete-user/:userId", user_controller_1.updateAccessToken, auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("admin"), user_controller_1.deleteUser);
// update userVideoViewed
userRouter.put("/update-user-videos-viewed", user_controller_1.updateAccessToken, auth_1.isAuthenticated, user_controller_1.markVideoAsViewed);
userRouter.get("/get-users-latest", user_controller_1.getAllUsersLatestInfo);
exports.default = userRouter;
