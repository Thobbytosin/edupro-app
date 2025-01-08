"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.newPayment = exports.sendStripePublishableKey = exports.getAllOrders = exports.createOrder = void 0;
const catchAsyncErrors_1 = __importDefault(require("../middlewares/catchAsyncErrors"));
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const order_model_1 = __importDefault(require("../models/order.model"));
const user_model_1 = __importDefault(require("../models/user.model"));
const course_model_1 = __importDefault(require("../models/course.model"));
const order_services_1 = require("../services/order.services");
const ejs_1 = __importDefault(require("ejs"));
const path_1 = __importDefault(require("path"));
const sendMail_1 = __importDefault(require("../utils/sendMail"));
const notification_model_1 = __importDefault(require("../models/notification.model"));
const redis_1 = require("../utils/redis");
const stripe_1 = __importDefault(require("stripe"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe secret key is required");
}
// stripe docs
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
// create order
exports.createOrder = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const { payment_info, courseId } = req.body;
        if (payment_info) {
            if ("id" in payment_info) {
                const paymentIntentId = payment_info.id;
                const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
                if (paymentIntent.status !== "succeeded") {
                    return next(new errorHandler_1.default("Payment failed", 400));
                }
            }
        }
        const user = await user_model_1.default.findById(req.user?._id);
        if (!user)
            return next(new errorHandler_1.default("User not found", 404));
        const userAlreadyHasCourse = user.courses.find((course) => course.courseId === courseId);
        if (userAlreadyHasCourse)
            return next(new errorHandler_1.default("You have already purchased this course", 400));
        const course = await course_model_1.default.findById(courseId);
        if (!course)
            return next(new errorHandler_1.default("Course not found", 404));
        const data = {
            courseId: course._id,
            userId: user._id,
        };
        //   order created
        const order = await order_model_1.default.create(data);
        if (!order)
            return next(new errorHandler_1.default("Encountered error processing order. Please try again", 422));
        //   send email notification to user
        const mailData = {
            order: {
                _id: order._id,
                courseName: course.name,
                user: user.name,
                price: course.price.toLocaleString(),
                date: new Date().toLocaleDateString("en-Ud", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                }),
            },
        };
        const html = await ejs_1.default.renderFile(path_1.default.join(__dirname, "../mails/order-confirmation.ejs"), mailData);
        try {
            await (0, sendMail_1.default)({
                email: user.email,
                subject: "Order Confirmation",
                template: "order-confirmation.ejs",
                data: mailData,
            });
        }
        catch (error) {
            return next(new errorHandler_1.default(error.mesage, 400));
        }
        // //
        // user.courses.push({ courseId });
        // await user.save();
        // 2. Initialize the progress array with videoId and viewed: false
        const progress = course.courseData.map((video) => ({
            videoId: video._id,
            viewed: false,
        }));
        // this will push the course into the courses array as well as the progress for each videos
        await user_model_1.default.updateOne({ _id: user._id }, {
            $push: {
                courses: {
                    courseId: courseId,
                    progress: progress,
                    reviewed: false,
                },
            },
        });
        const newUser = await user_model_1.default.findById(user._id);
        //   update user to redis
        await redis_1.redis.set(`user - ${newUser?._id}`, JSON.stringify(newUser));
        //   create notification
        await notification_model_1.default.create({
            userId: user._id,
            title: "New Order",
            message: `You have a new order from ${course.name}`,
        });
        course.purchase += 1;
        await course.save();
        // update course redis
        await redis_1.redis.set(`course - ${courseId}`, JSON.stringify(course));
        // and update all courses
        const courses = await course_model_1.default.find().select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");
        if (!courses)
            return next(new errorHandler_1.default("Course not found", 404));
        // update all courses redis
        await redis_1.redis.set("allCourses", JSON.stringify(courses));
        res.status(201).json({ success: true, order });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
// get all orders - admin only
exports.getAllOrders = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        (0, order_services_1.getAllOrdersService)(res);
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
// send stripe publishable key
exports.sendStripePublishableKey = (0, catchAsyncErrors_1.default)((req, res) => {
    res
        .status(200)
        .json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});
// create new payment
exports.newPayment = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const { amount } = req.body;
        const myPayment = await stripe.paymentIntents.create({
            amount: amount,
            currency: "NGN",
            metadata: {
                company: "ByWay E-Learning Management System",
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });
        res.status(201).json({
            success: true,
            client_secret: myPayment.client_secret,
        });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.message, 500));
    }
});
