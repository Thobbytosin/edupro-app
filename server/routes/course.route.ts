import express from "express";
import { authorizeRoles, isAuthenticated } from "../middlewares/auth";
import {
  addAnswer,
  addQuestion,
  addReplyToReview,
  addReview,
  deleteCourse,
  editCourse,
  generateVideoUrl,
  getAdminAllCourses,
  getAllCourses,
  getCourseByUser,
  getSingleCourse,
  uploadCourse,
} from "../controllers/course.controller";
import { updateAccessToken } from "../controllers/user.controller";

const courseRouter = express.Router();

// create course (admin only)
courseRouter.post(
  "/create-course",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  uploadCourse
);

// update course (admin)
courseRouter.put(
  "/edit-course/:course_id",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  editCourse
);

// get a course
courseRouter.get("/get-course/:course_id", getSingleCourse);

// get all courses
courseRouter.get("/get-courses", getAllCourses);

// get course content (only paid users)
courseRouter.get(
  "/get-course-content/:course_id",
  updateAccessToken,
  isAuthenticated,
  getCourseByUser
);

// ask a question about course (only paid users)
courseRouter.put(
  "/add-question",
  updateAccessToken,
  isAuthenticated,
  addQuestion
);

// add answer to course question (only paid users)
courseRouter.put("/add-answer", updateAccessToken, isAuthenticated, addAnswer);

// add a review (only paid us2ers)
courseRouter.put(
  "/add-review/:course_id",
  updateAccessToken,
  isAuthenticated,
  addReview
);

// reply to a review (only admin)
courseRouter.put(
  "/add-reply-review",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  addReplyToReview
);

// get all courses (only admin)
courseRouter.get(
  "/get-all-courses",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  getAdminAllCourses
);

// delete a course (only admin)
courseRouter.delete(
  "/delete-course/:courseId",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  deleteCourse
);

// generate a course video url (only admin)
courseRouter.post("/generate-video-url", generateVideoUrl);

export default courseRouter;
