"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserRoleService = exports.getAllAdminsService = exports.getALLUsersService = exports.getUserId = void 0;
const user_model_1 = __importDefault(require("../models/user.model"));
const redis_1 = require("../utils/redis");
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
// get user by id
const getUserId = async (res, id) => {
    const userJson = await redis_1.redis.get(`user - ${id}`);
    if (userJson) {
        const user = JSON.parse(userJson);
        res.status(200).json({ success: true, user });
    }
};
exports.getUserId = getUserId;
// get all users
const getALLUsersService = async (res) => {
    const users = await user_model_1.default.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, users });
};
exports.getALLUsersService = getALLUsersService;
// get all admins
const getAllAdminsService = async (res) => {
    const admins = await user_model_1.default.find({ role: "admin" })
        .select("-password")
        .sort({ createdAt: -1 });
    res.status(200).json({ success: true, admins });
};
exports.getAllAdminsService = getAllAdminsService;
// update user role - admin only
const updateUserRoleService = async (res, email, role, next) => {
    const user = await user_model_1.default.findOneAndUpdate({ email }, {
        role,
    }, { new: true });
    if (!user)
        return next(new errorHandler_1.default("User not found", 404));
    await redis_1.redis.set(`user - ${user.id}`, JSON.stringify(user));
    res.status(200).json({ success: true, user });
};
exports.updateUserRoleService = updateUserRoleService;
