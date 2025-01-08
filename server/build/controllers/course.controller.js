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
exports.generateVideoUrl = exports.deleteCourse = exports.getAdminAllCourses = exports.addReplyToReview = exports.addReview = exports.addAnswer = exports.addQuestion = exports.getCourseByUser = exports.getAllCourses = exports.getSingleCourse = exports.editCourse = exports.uploadCourse = void 0;
const catchAsyncErrors_1 = __importDefault(require("../middlewares/catchAsyncErrors"));
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const cloudinary_1 = __importStar(require("../utils/cloudinary"));
const user_model_1 = __importDefault(require("../models/user.model"));
const course_services_1 = require("../services/course.services");
const course_model_1 = __importDefault(require("../models/course.model"));
const redis_1 = require("../utils/redis");
const mongoose_1 = require("mongoose");
const path_1 = __importDefault(require("path"));
const ejs_1 = __importDefault(require("ejs"));
const sendMail_1 = __importDefault(require("../utils/sendMail"));
const notification_model_1 = __importDefault(require("../models/notification.model"));
const axios_1 = __importDefault(require("axios"));
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// upload course
exports.uploadCourse = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const data = req.body;
        if (!data)
            return next(new errorHandler_1.default("Fields are missing", 422));
        const userId = req.user?._id;
        const user = await user_model_1.default.findById(userId);
        if (!user)
            return next(new errorHandler_1.default("Error finding user", 404));
        // check if course exist
        const isCourseExist = await course_model_1.default.findOne({ name: data.name });
        if (isCourseExist)
            return next(new errorHandler_1.default("Course already exists", 422));
        const thumbnail = data.thumbnail;
        if (thumbnail) {
            const folderPath = `byWay/courses/${data.category}`;
            //
            await cloudinary_1.default.upload(thumbnail, {
                folder: folderPath,
                transformation: {
                    gravity: "face",
                },
            }, async (error, result) => {
                if (error)
                    return next(new errorHandler_1.default(error.message, 400));
                const publicId = result?.public_id;
                const thumbnailId = publicId?.split("/").pop();
                const thumbnailUrl = result?.secure_url;
                data.thumbnail = {
                    id: thumbnailId,
                    url: thumbnailUrl,
                };
            });
        }
        (0, course_services_1.createCourse)(data, res, next);
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// edit course
exports.editCourse = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const data = req.body;
        // console.log(data);
        if (!data)
            return next(new errorHandler_1.default("Fields cannot be empty", 422));
        const thumbnail = data.thumbnail;
        if (thumbnail) {
            if (!thumbnail.id || !thumbnail.url) {
                const folderPath = `byWay/users/${data.name}`;
                // delete old thumbnail
                await cloudinary_1.cloudApi.delete_resources_by_prefix(folderPath);
                // upload new thumbnail
                await cloudinary_1.default.upload(thumbnail, {
                    folder: folderPath,
                    transformation: {
                        gravity: "face",
                    },
                }, async (error, result) => {
                    if (error)
                        return next(new errorHandler_1.default(error.message, 400));
                    const publicId = result?.public_id;
                    const thumbnailId = publicId?.split("/").pop();
                    const thumbnailUrl = result?.secure_url;
                    data.thumbnail = {
                        id: thumbnailId,
                        url: thumbnailUrl,
                    };
                });
            }
        }
        const courseId = req.params.course_id;
        const course = await course_model_1.default.findByIdAndUpdate(courseId, {
            $set: data,
        }, { new: true });
        if (!course)
            return next(new errorHandler_1.default("Course not found", 404));
        // update redis
        await redis_1.redis.set(`course - ${courseId}`, JSON.stringify(course));
        // for redis update
        const courses = await course_model_1.default.find().select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");
        if (!courses)
            return next(new errorHandler_1.default("Course not found", 404));
        // update all courses in redis too
        await redis_1.redis.set("allCourses", JSON.stringify(courses));
        res.status(201).json({
            success: true,
            message: "Course updated successfully",
            course,
        });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// get single course * without purchasing
exports.getSingleCourse = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const courseId = req.params.course_id;
        const isCacheExists = await redis_1.redis.get(`course - ${courseId}`);
        if (isCacheExists) {
            const course = JSON.parse(isCacheExists);
            res.status(200).json({ success: true, course });
        }
        else {
            const course = await course_model_1.default.findById(courseId).select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");
            if (!course)
                return next(new errorHandler_1.default("Course not found", 404));
            await redis_1.redis.set(`course - ${courseId}`, JSON.stringify(course));
            res.status(200).json({ success: true, course });
        }
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// get all courses * without purchasing
exports.getAllCourses = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const isCacheExists = await redis_1.redis.get("allCourses");
        if (isCacheExists) {
            const courses = JSON.parse(isCacheExists);
            res.status(200).json({ success: true, courses });
        }
        else {
            const courses = await course_model_1.default.find().select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");
            if (!courses)
                return next(new errorHandler_1.default("Course not found", 404));
            await redis_1.redis.set("allCourses", JSON.stringify(courses));
            res.status(200).json({ success: true, courses });
        }
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// get course content * only for subscribed user
exports.getCourseByUser = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const userCourseList = req.user?.courses;
        const courseId = req.params.course_id;
        const courseExists = userCourseList.find((course) => course.courseId === courseId);
        if (!courseExists)
            return next(new errorHandler_1.default("You are not eligible to access this course", 403));
        const course = await course_model_1.default.findById(courseId);
        if (!course)
            return next(new errorHandler_1.default("Course not found", 404));
        const content = course.courseData;
        res.status(200).json({ success: true, content });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
exports.addQuestion = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const { question, contentId, courseId } = req.body;
        if (!question || !contentId || !courseId)
            return next(new errorHandler_1.default("Invalid entry", 422));
        const course = await course_model_1.default.findById(courseId);
        if (!course)
            return next(new errorHandler_1.default("Course not found", 404));
        // console.log(isValidObjectId(contentId));
        if (!(0, mongoose_1.isValidObjectId)(contentId))
            return next(new errorHandler_1.default("Invalid content id", 400));
        const courseContent = course.courseData.find((item) => item._id.equals(contentId));
        if (!courseContent)
            return next(new errorHandler_1.default("Content not found", 404));
        // create question object
        const newQuestion = {
            user: req.user,
            question,
            questionReplies: [],
        };
        courseContent.questions.push(newQuestion);
        //   create notification
        await notification_model_1.default.create({
            userId: req.user._id,
            title: "New Question Recieved",
            message: `You have a new question from ${course?.name} course in the ${courseContent.title} section`,
        });
        // save the updated course
        await course.save();
        // REDIS UPDATE
        const newCourse = await course_model_1.default.findById(courseId);
        // update redis
        await redis_1.redis.set(`course - ${courseId}`, JSON.stringify(newCourse));
        // for redis update
        const courses = await course_model_1.default.find().select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");
        if (!courses)
            return next(new errorHandler_1.default("Course not found", 404));
        // update all courses in redis too
        await redis_1.redis.set("allCourses", JSON.stringify(courses));
        res.status(200).json({ success: true, course });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
exports.addAnswer = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const { answer, contentId, courseId, questionId } = req.body;
        const course = await course_model_1.default.findById(courseId);
        if (!course)
            return next(new errorHandler_1.default("Course not found", 404));
        if (!(0, mongoose_1.isValidObjectId)(contentId))
            return next(new errorHandler_1.default("Invalid content id", 400));
        const courseContent = course.courseData.find((item) => item._id.equals(contentId));
        if (!courseContent)
            return next(new errorHandler_1.default("Content not found", 404));
        const question = courseContent.questions?.find((question) => question._id.equals(questionId));
        if (!question)
            return next(new errorHandler_1.default("Question not found", 404));
        // create a new answer object
        const newAnswer = {
            user: req.user,
            answer,
        };
        // push answer to the question replies array
        question.questionReplies.push(newAnswer);
        await course.save();
        // REDIS
        const newCourse = await course_model_1.default.findById(courseId);
        // update redis
        await redis_1.redis.set(`course - ${courseId}`, JSON.stringify(newCourse));
        // for redis update  courses
        const courses = await course_model_1.default.find().select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");
        if (!courses)
            return next(new errorHandler_1.default("Course not found", 404));
        // update all courses in redis too
        await redis_1.redis.set("allCourses", JSON.stringify(courses));
        // send email notification to user
        if (req.user?._id === question.user._id) {
            // create a notification (because you answered the question yourself)
            await notification_model_1.default.create({
                userId: req.user._id,
                title: "New Reply Received",
                message: `You have a new question reply from ${course.name} course in the ${courseContent.title} section`,
            });
        }
        else {
            // create notification as well
            await notification_model_1.default.create({
                userId: req.user._id,
                title: "New  Reply Received",
                message: `You have a new question reply from ${course.name} course in the ${courseContent.title} section`,
            });
            // you answered someone else's question
            const data = {
                name: question.user.name,
                title: courseContent.title,
                question: question.question,
            };
            const html = await ejs_1.default.renderFile(path_1.default.join(__dirname, "../mails/question-reply.ejs"), data);
            // to send email notification
            try {
                await (0, sendMail_1.default)({
                    email: question.user.email,
                    subject: "Question Reply",
                    template: "question-reply.ejs",
                    data,
                });
            }
            catch (error) {
                return next(new errorHandler_1.default(error.message, 400));
            }
        }
        res.status(200).json({ success: true, course });
    }
    catch (error) {
        console.log(error);
        return next(new errorHandler_1.default(error.name, 400));
    }
});
exports.addReview = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const userId = req.user._id;
        console.log(userId);
        // const userCourseList = req.user?.courses;
        const userCourseList = await user_model_1.default.findById(userId);
        if (!userCourseList)
            return next(new errorHandler_1.default("User not found", 404));
        const courseId = req.params.course_id;
        const courseExists = userCourseList.courses.find((course) => course.courseId === courseId);
        if (!courseExists)
            return next(new errorHandler_1.default("You are not allowed access to this course", 403));
        const course = await course_model_1.default.findById(courseId);
        if (!course)
            return next(new errorHandler_1.default("Course not found", 404));
        const { rating, review } = req.body;
        const reviewData = {
            user: req.user,
            comment: review,
            rating,
        };
        course.reviews.push(reviewData);
        // to set the course ratings
        let avg = 0;
        course.reviews.forEach((review) => {
            avg += review.rating;
        });
        const averageCourseRatings = (avg / course.reviews?.length).toFixed(2);
        course.ratings = +averageCourseRatings;
        await course.save();
        //   create notification
        await notification_model_1.default.create({
            userId: req.user._id,
            title: "New Review Recieved",
            message: `You have a new review from ${course.name} course.`,
        });
        // REDIS UPDATE
        const newCourse = await course_model_1.default.findById(courseId);
        // update redis
        await redis_1.redis.set(`course - ${courseId}`, JSON.stringify(newCourse));
        // for redis update
        const courses = await course_model_1.default.find().select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");
        if (!courses)
            return next(new errorHandler_1.default("Course not found", 404));
        // update all courses in redis too
        await redis_1.redis.set("allCourses", JSON.stringify(courses));
        // update user reviewed course
        const user = await user_model_1.default.updateOne({
            _id: userId,
            "courses.courseId": courseId,
        }, { $set: { "courses.$.reviewed": true } }, { arrayFilters: [{ "course.courseId": courseId }] });
        if (!user)
            return next(new errorHandler_1.default("User not found", 404));
        const newUser = await user_model_1.default.findById(userId);
        //   update user to redis
        await redis_1.redis.set(`user - ${newUser?._id}`, JSON.stringify(newUser));
        res.status(200).json({ success: true, course });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
exports.addReplyToReview = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const { courseId, reply, reviewId } = req.body;
        const course = await course_model_1.default.findById(courseId);
        if (!course)
            return next(new errorHandler_1.default("Course not found", 404));
        const review = course.reviews.find((review) => review._id.toString() === reviewId);
        if (!review)
            return next(new errorHandler_1.default("Review not found", 404));
        const newReply = {
            user: req.user,
            reply,
        };
        if (!review.commentReplies) {
            review.commentReplies = [];
        }
        review.commentReplies?.push(newReply);
        await course.save();
        const newCourse = await course_model_1.default.findById(courseId);
        // update redis
        await redis_1.redis.set(`course - ${courseId}`, JSON.stringify(newCourse));
        // for redis update
        const courses = await course_model_1.default.find().select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");
        if (!courses)
            return next(new errorHandler_1.default("Course not found", 404));
        // update all courses in redis too
        await redis_1.redis.set("allCourses", JSON.stringify(courses));
        res.status(200).json({ success: true, course });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////
// get all courses - admin only
exports.getAdminAllCourses = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        (0, course_services_1.getAllCoursesService)(res);
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
////////////////////////////////////////////////////////////////////////////////////////////////
// delete course - admin only
exports.deleteCourse = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const course = await course_model_1.default.findById(courseId);
        if (!course)
            return next(new errorHandler_1.default("Course not found", 404));
        await course.deleteOne();
        await redis_1.redis.del(`course - ${courseId}`);
        // for redis update
        const courses = await course_model_1.default.find().select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");
        if (!courses)
            return next(new errorHandler_1.default("Course not found", 404));
        // update all courses in redis too
        await redis_1.redis.set("allCourses", JSON.stringify(courses));
        res
            .status(200)
            .json({ success: true, message: "Course deleted successfully" });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
////////////////////////////////////////////////////////////////////////////////////////////////
// generate video url
exports.generateVideoUrl = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const { videoId } = req.body;
        const response = await axios_1.default.post(`https://dev.vdocipher.com/api/videos/${videoId}/otp`, { ttl: 300 }, {
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Apisecret ${process.env.VDOCIPHER_API_SECRET}`,
            },
        });
        res.json(response.data);
    }
    catch (error) {
        return next(new errorHandler_1.default(error.message, 400));
    }
});
