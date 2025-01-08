"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderAnalytics = exports.getCourseAnalytics = exports.getUserAnalytics = void 0;
const catchAsyncErrors_1 = __importDefault(require("../middlewares/catchAsyncErrors"));
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const analytics_generator_1 = require("../utils/analytics.generator");
const user_model_1 = __importDefault(require("../models/user.model"));
const course_model_1 = __importDefault(require("../models/course.model"));
const order_model_1 = __importDefault(require("../models/order.model"));
// get user analytics
exports.getUserAnalytics = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const users = await (0, analytics_generator_1.generateLast12MonthsData)(user_model_1.default);
        res.status(200).json({ success: true, users });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
// get courses analytics
exports.getCourseAnalytics = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const courses = await (0, analytics_generator_1.generateLast12MonthsData)(course_model_1.default);
        res.status(200).json({ success: true, courses });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
// get orders analytics
exports.getOrderAnalytics = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const orders = await (0, analytics_generator_1.generateLast12MonthsData)(order_model_1.default);
        res.status(200).json({ success: true, orders });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
