"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllCoursesService = exports.createCourse = void 0;
const catchAsyncErrors_1 = __importDefault(require("../middlewares/catchAsyncErrors"));
const course_model_1 = __importDefault(require("../models/course.model"));
const redis_1 = require("../utils/redis");
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
// create course
exports.createCourse = (0, catchAsyncErrors_1.default)(async (data, res, next) => {
    const course = await course_model_1.default.create(data);
    // for redis update single course
    if (!course)
        return next(new errorHandler_1.default("Course not found", 404));
    // update redis
    await redis_1.redis.set(`course - ${course._id}`, JSON.stringify(course));
    // for redis update all courses
    const courses = await course_model_1.default.find().select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");
    if (!courses)
        return next(new errorHandler_1.default("Course not found", 404));
    // update all courses in redis too
    await redis_1.redis.set("allCourses", JSON.stringify(courses));
    res.status(201).json({ success: true, message: "Course created", course });
});
// get all courses
const getAllCoursesService = async (res) => {
    const courses = await course_model_1.default.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, courses });
};
exports.getAllCoursesService = getAllCoursesService;
