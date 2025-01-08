"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middlewares/auth");
const course_controller_1 = require("../controllers/course.controller");
const user_controller_1 = require("../controllers/user.controller");
const courseRouter = express_1.default.Router();
// create course (admin only)
courseRouter.post("/create-course", user_controller_1.updateAccessToken, auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("admin"), course_controller_1.uploadCourse);
// update course (admin)
courseRouter.put("/edit-course/:course_id", user_controller_1.updateAccessToken, auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("admin"), course_controller_1.editCourse);
// get a course
courseRouter.get("/get-course/:course_id", course_controller_1.getSingleCourse);
// get all courses
courseRouter.get("/get-courses", course_controller_1.getAllCourses);
// get course content (only paid users)
courseRouter.get("/get-course-content/:course_id", user_controller_1.updateAccessToken, auth_1.isAuthenticated, course_controller_1.getCourseByUser);
// ask a question about course (only paid users)
courseRouter.put("/add-question", user_controller_1.updateAccessToken, auth_1.isAuthenticated, course_controller_1.addQuestion);
// add answer to course question (only paid users)
courseRouter.put("/add-answer", user_controller_1.updateAccessToken, auth_1.isAuthenticated, course_controller_1.addAnswer);
// add a review (only paid us2ers)
courseRouter.put("/add-review/:course_id", user_controller_1.updateAccessToken, auth_1.isAuthenticated, course_controller_1.addReview);
// reply to a review (only admin)
courseRouter.put("/add-reply-review", user_controller_1.updateAccessToken, auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("admin"), course_controller_1.addReplyToReview);
// get all courses (only admin)
courseRouter.get("/get-all-courses", user_controller_1.updateAccessToken, auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("admin"), course_controller_1.getAdminAllCourses);
// delete a course (only admin)
courseRouter.delete("/delete-course/:courseId", user_controller_1.updateAccessToken, auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("admin"), course_controller_1.deleteCourse);
// generate a course video url (only admin)
courseRouter.post("/generate-video-url", course_controller_1.generateVideoUrl);
exports.default = courseRouter;
