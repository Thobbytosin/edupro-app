"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markVideoAsViewed = exports.getAllUsersLatestInfo = exports.deleteUser = exports.updateUserRole = exports.getAllAdmins = exports.getAllUsers = exports.updateProfilePicture = exports.updatePassword = exports.updateUserInfo = exports.socialAuth = exports.getUserInfo = exports.updateAccessTokenEveryPage = exports.updateAccessToken = exports.logoutUser = exports.loginUser = exports.activateUser = exports.createActivationToken = exports.registerUser = void 0;
const user_model_1 = __importDefault(require("../models/user.model"));
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const catchAsyncErrors_1 = __importDefault(require("../middlewares/catchAsyncErrors"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const ejs_1 = __importDefault(require("ejs"));
const path_1 = __importDefault(require("path"));
const sendMail_1 = __importDefault(require("../utils/sendMail"));
const jwt_1 = require("../utils/jwt");
const redis_1 = require("../utils/redis");
const user_services_1 = require("../services/user.services");
const cloudinary_1 = __importStar(require("../utils/cloudinary"));
const mongoose_1 = require("mongoose");
dotenv_1.default.config();
exports.registerUser = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        const isEmailExists = await user_model_1.default.findOne({ email });
        if (isEmailExists)
            return next(new errorHandler_1.default("Email already exists", 400));
        const user = {
            name,
            email,
            password,
        };
        const activationToken = (0, exports.createActivationToken)(user);
        const activationCode = activationToken.activationCode;
        const data = { user: { name: user.name }, activationCode };
        const html = await ejs_1.default.renderFile(path_1.default.join(__dirname, "../mails/activation-mail.ejs"), data);
        try {
            await (0, sendMail_1.default)({
                email: user.email,
                subject: "Activate your account",
                template: "activation-mail.ejs",
                data,
            });
            res.status(201).json({
                success: true,
                message: `Please check your email: ${user.email} to activate your account`,
                activationToken: activationToken.token,
            });
        }
        catch (error) {
            console.log(error);
            return next(new errorHandler_1.default(error.message, 400));
        }
    }
    catch (error) {
        console.log(error);
        return next(new errorHandler_1.default(error.name, 400));
    }
});
// function to create an activation token and activation code
const createActivationToken = (user) => {
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();
    // activation token to be used for email activation
    const token = jsonwebtoken_1.default.sign({ user, activationCode }, process.env.ACTIVATION_SECRET, { expiresIn: "5m" });
    return { token, activationCode };
};
exports.createActivationToken = createActivationToken;
exports.activateUser = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const { activationCode, activationToken } = req.body;
        const newUser = jsonwebtoken_1.default.verify(activationToken, process.env.ACTIVATION_SECRET);
        if (newUser.activationCode !== activationCode)
            return next(new errorHandler_1.default("Invalid activation code", 422));
        const { name, email, password } = newUser.user;
        const userExists = await user_model_1.default.findOne({ email });
        if (userExists)
            return next(new errorHandler_1.default("Account already exists", 422));
        // const hashPassword = bcrypt.hashSync(password, 10);
        const user = await user_model_1.default.create({
            name,
            email,
            password,
            emailVerified: true,
        });
        res.status(201).json({ success: true, message: "Account created" });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
exports.loginUser = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return next(new errorHandler_1.default("Please enter your email and password", 400));
        const user = await user_model_1.default.findOne({ email }).select("+password");
        if (!user)
            return next(new errorHandler_1.default("Invalid username or password", 404));
        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch)
            return next(new errorHandler_1.default("Invalid credentials", 404));
        // to avoid sending password
        const userr = await user_model_1.default.findOne({ email });
        if (!userr)
            return next(new errorHandler_1.default("Invalid username or password", 404));
        (0, jwt_1.sendToken)(userr, 200, res);
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
////////////////////////////////////////////////////////////////////////////////////////////////
// logout user
exports.logoutUser = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        res.cookie("access_Token", "", { maxAge: 1 });
        res.cookie("refresh_Token", "", { maxAge: 1 });
        const userId = req.user._id || "";
        await redis_1.redis.del(`user - ${userId}`);
        res.status(200).json({ success: true, message: "Logout successful" });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
////////////////////////////////////////////////////////////////////////////////////////////////
// update access token : MIDDLEWARE ONLY
exports.updateAccessToken = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const { refresh_Token } = req.cookies;
        const decoded = jsonwebtoken_1.default.verify(refresh_Token, process.env.REFRESH_TOKEN_SIGN_IN);
        if (!decoded)
            return next(new errorHandler_1.default("could not refresh token", 400));
        const session = await redis_1.redis.get(`user - ${decoded.id}`);
        if (!session)
            return next(new errorHandler_1.default("session not found / has expired", 404));
        const user = JSON.parse(session);
        const accessToken = jsonwebtoken_1.default.sign({ id: user._id }, process.env.ACCESS_TOKEN_SIGN_IN, {
            expiresIn: "59m",
        });
        const refreshToken = jsonwebtoken_1.default.sign({ id: user._id }, process.env.REFRESH_TOKEN_SIGN_IN, {
            expiresIn: "4d",
        });
        // Update the user also whenever the token is updated
        req.user = user;
        res.cookie("access_Token", accessToken, jwt_1.accessTokenOptions);
        res.cookie("refresh_Token", refreshToken, jwt_1.refreshTokenOptions);
        // this will help with cache maintenance to prevent redis from overload
        await redis_1.redis.set(`user - ${user._id}`, JSON.stringify(user), "EX", 604800); // 7day expiry
        // res.status(200).json({ success: true, accessToken });
        next();
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
////////////////////////////////////////////////////////////////////////////////////////////////
// update access token
exports.updateAccessTokenEveryPage = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const { refresh_Token } = req.cookies;
        const decoded = jsonwebtoken_1.default.verify(refresh_Token, process.env.REFRESH_TOKEN_SIGN_IN);
        if (!decoded)
            return next(new errorHandler_1.default("could not refresh token", 400));
        const session = await redis_1.redis.get(`user - ${decoded.id}`);
        if (!session)
            return next(new errorHandler_1.default("session not found / has expired", 404));
        const user = JSON.parse(session);
        const accessToken = jsonwebtoken_1.default.sign({ id: user._id }, process.env.ACCESS_TOKEN_SIGN_IN, {
            expiresIn: "59m",
        });
        const refreshToken = jsonwebtoken_1.default.sign({ id: user._id }, process.env.REFRESH_TOKEN_SIGN_IN, {
            expiresIn: "4d",
        });
        // Update the user also whenever the token is updated
        req.user = user;
        res.cookie("access_Token", accessToken, jwt_1.accessTokenOptions);
        res.cookie("refresh_Token", refreshToken, jwt_1.refreshTokenOptions);
        // this will help with cache maintenance to prevent redis from overload
        await redis_1.redis.set(`user - ${user._id}`, JSON.stringify(user), "EX", 604800); // 7day expiry
        res.status(200).json({ success: true, accessToken });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
////////////////////////////////////////////////////////////////////////////////////////////////
// get user information
exports.getUserInfo = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const userId = req.user?._id;
        (0, user_services_1.getUserId)(res, userId);
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
exports.socialAuth = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const { name, email, avatar } = req.body;
        if (!name || !email)
            return next(new errorHandler_1.default("Please provide name and email", 400));
        const user = await user_model_1.default.findOne({ email });
        if (!user) {
            // generate password (password is required for login)
            const generatePassword = Math.random().toString(36).slice(-10);
            const newUser = await user_model_1.default.create({
                name,
                email,
                password: generatePassword,
                avatar,
            });
            // to remove the password from being sent to the frontend
            const user = await user_model_1.default.findOne({ email: newUser.email }).select("-password");
            if (!user)
                return next(new errorHandler_1.default("No user found", 404));
            // login user
            (0, jwt_1.sendToken)(user, 200, res);
        }
        else {
            // means user has an account already
            // so just login
            (0, jwt_1.sendToken)(user, 200, res);
        }
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
exports.updateUserInfo = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const { name, email } = req.body;
        const userId = req.user?._id;
        const user = await user_model_1.default.findById(userId);
        if (!user)
            return next(new errorHandler_1.default("User not found", 404));
        if (email) {
            const isEmailExists = await user_model_1.default.findOne({ email });
            if (isEmailExists)
                return next(new errorHandler_1.default("Email already exists", 406));
            user.email = email;
        }
        if (name) {
            user.name = name;
        }
        await user.save();
        await redis_1.redis.set(`user - ${userId}`, JSON.stringify(user));
        res.status(201).json({ success: true, user });
    }
    catch (error) {
        console.log(error.message);
        console.log(error.name);
        return next(new errorHandler_1.default(error.name, 400));
    }
});
exports.updatePassword = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const { newPassword, oldPassword } = req.body;
        if (!newPassword || !oldPassword)
            return next(new errorHandler_1.default("Please enter old and new password", 400));
        const userId = req.user?._id;
        const user = await user_model_1.default.findById(userId).select("+password");
        if (!user)
            return next(new errorHandler_1.default("Invalid user", 404));
        const isPasswordMatch = await user.comparePassword(oldPassword);
        if (!isPasswordMatch)
            return next(new errorHandler_1.default("Invalid old password", 400));
        if (newPassword === oldPassword)
            return next(new errorHandler_1.default("New password must be different from old passwprd", 422));
        user.password = newPassword;
        await user.save();
        await redis_1.redis.set(`user - ${userId}`, JSON.stringify(user));
        res.status(200).json({ success: true, user });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
exports.updateProfilePicture = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const { avatar } = req.files;
        // console.log(avatar);
        if (!avatar)
            return next(new errorHandler_1.default("Please provide an image", 422));
        const userId = req?.user._id;
        if (!userId)
            return next(new errorHandler_1.default("Please log in to upload picture.", 403));
        const user = await user_model_1.default.findById(userId);
        if (!user)
            return next(new errorHandler_1.default("User not found", 404));
        if (Array.isArray(avatar))
            return next(new errorHandler_1.default("Multiple images not allowed", 422));
        if (!avatar.mimetype?.startsWith("image"))
            return next(new errorHandler_1.default("Invalid image format. File must be an image(.jpg, .png, .jpeg)", 404));
        // delete the old avatar from the cloudinary db
        if (user.avatar.id) {
            const folderPath = `byWay/users/${user.name + " - " + user._id}`;
            await cloudinary_1.cloudApi.delete_resources_by_prefix(folderPath);
        }
        // upload the new avatar to the cloudinary db
        // create a folder and subfolder for each user
        const folderPath = `byWay/users/${user.name + " - " + user._id}`;
        // upload the new avatar to the cloudinary db
        await cloudinary_1.default.upload(avatar.filepath, {
            folder: folderPath,
            transformation: {
                width: 500,
                height: 500,
                crop: "thumb",
                gravity: "face",
            },
        }, async (error, result) => {
            if (error)
                return next(new errorHandler_1.default(error.message, 400));
            const publicId = result?.public_id;
            const imageId = publicId?.split("/").pop();
            const imageUrl = result?.secure_url;
            user.avatar.url = imageUrl || "";
            user.avatar.id = imageId || "";
            await redis_1.redis.set(`user - ${userId}`, JSON.stringify(user));
            await user.save();
        });
        res.status(201).json({ success: true, user });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
////////////////////////////////////////////////////////////////////////////////////////////////
// get all users - admin only
exports.getAllUsers = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        (0, user_services_1.getALLUsersService)(res);
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
////////////////////////////////////////////////////////////////////////////////////////////////
// get all admin - admin only
exports.getAllAdmins = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        (0, user_services_1.getAllAdminsService)(res);
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
////////////////////////////////////////////////////////////////////////////////////////////////
// update user role - admin only
exports.updateUserRole = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const { email, role } = req.body;
        if (!email || !role)
            return next(new errorHandler_1.default("Invalid entry", 422));
        // if (!isValidObjectId(userId))
        //   return next(new ErrorHandler("Invalid id", 422));
        (0, user_services_1.updateUserRoleService)(res, email, role, next);
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
////////////////////////////////////////////////////////////////////////////////////////////////
// delete user - admin only
exports.deleteUser = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const { userId } = req.params;
        console.log(userId);
        const user = await user_model_1.default.findById(userId);
        if (!user)
            return next(new errorHandler_1.default("User not found", 404));
        await user.deleteOne();
        await redis_1.redis.del(`user - ${userId}`);
        res
            .status(200)
            .json({ success: true, message: "User deleted successfully" });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
////////////////////////////////////////////////////////////////////////////////////////////////
// verify user latest role
exports.getAllUsersLatestInfo = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const users = await user_model_1.default.find().select("-courses -isVerified -createdAt -updatedAt -_v -email");
        if (!users)
            return next(new errorHandler_1.default("User not found", 404));
        res.status(200).json({ success: true, users });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
////////////////////////////////////////////////////////////////////////////////////////////////
// update mark video as viewed
exports.markVideoAsViewed = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const userId = req.user?._id;
        if (!(0, mongoose_1.isValidObjectId)(userId))
            return next(new errorHandler_1.default("Invalid user id", 422));
        const { courseId, videoId } = req.body;
        const user = await user_model_1.default.updateOne({
            _id: userId,
            "courses.courseId": courseId,
            "courses.progress.videoId": videoId,
        }, { $set: { "courses.$.progress.$[video].viewed": true } }, { arrayFilters: [{ "video.videoId": videoId }] });
        if (!user)
            return next(new errorHandler_1.default("User not found", 404));
        const newUser = await user_model_1.default.findById(userId);
        //   update user to redis
        await redis_1.redis.set(`user - ${newUser?._id}`, JSON.stringify(newUser));
        res.status(200).json({ success: true, user });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
