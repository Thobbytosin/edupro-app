"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = exports.isAuthenticated = void 0;
const catchAsyncErrors_1 = __importDefault(require("./catchAsyncErrors"));
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const redis_1 = require("../utils/redis");
dotenv_1.default.config();
exports.isAuthenticated = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const { access_Token } = req.cookies;
        if (!access_Token)
            return next(new errorHandler_1.default("Please login to proceed", 401));
        const decoded = jsonwebtoken_1.default.verify(access_Token, process.env.ACCESS_TOKEN_SIGN_IN || "");
        if (!decoded)
            return next(new errorHandler_1.default("Invalid access token", 400));
        const user = await redis_1.redis.get(`user - ${decoded.id}`);
        if (!user)
            return next(new errorHandler_1.default("Please login to access this", 404));
        req.user = JSON.parse(user);
        return next();
    }
    catch (error) {
        return next(new errorHandler_1.default("Session has expired. Kindly refresh your page.", 404));
        // console.log("LOGIN ERROR", error);
        // console.log("LOGIN ERROR", error.name);
        // console.log("LOGIN ERROR", error.message);
    }
});
// authorize user role
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user?.role || "")) {
            return next(new errorHandler_1.default(`Role: ${req.user?.role} is restricted to access this`, 403));
        }
        next();
    };
};
exports.authorizeRoles = authorizeRoles;
