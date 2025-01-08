"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendToken = exports.refreshTokenOptions = exports.accessTokenOptions = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const redis_1 = require("./redis");
dotenv_1.default.config();
const accessTokenExpire = parseInt(process.env.ACCESS_TOKEN_EXPIRE || "60", 10);
const refreshTokenExpire = parseInt(process.env.REFRESH_TOKEN_EXPIRE || "1200", 10);
const isProduction = process.env.NODE_ENV === "production";
// console.log(isProduction);
//   options for cookies
exports.accessTokenOptions = {
    expires: new Date(Date.now() + accessTokenExpire * 60 * 1000),
    maxAge: accessTokenExpire * 60 * 1000, // expires in minutes
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
};
exports.refreshTokenOptions = {
    expires: new Date(Date.now() + refreshTokenExpire * 24 * 60 * 60 * 1000),
    maxAge: refreshTokenExpire * 24 * 60 * 60 * 1000, // expires in days
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction, // for production
};
const sendToken = async (user, statusCode, res) => {
    // login with access and refresh token
    const accessToken = user.SignAccessToken();
    const refreshToken = user.SignRefreshToken();
    //   upload session to redis
    await redis_1.redis.set(`user - ${user?._id}`, JSON.stringify(user));
    // parse environment variables to integrate fallback values
    //   only set secure to true in production
    // if (process.env.NODE_ENV === "production") {
    //   accessTokenOptions.secure = true;
    // }
    // save the tokens in the cookie
    res.cookie("access_Token", accessToken, exports.accessTokenOptions);
    res.cookie("refresh_Token", refreshToken, exports.refreshTokenOptions);
    res.status(statusCode).json({ success: true, user, accessToken });
};
exports.sendToken = sendToken;
