import { NextFunction, Response } from "express";
import catchAsyncError from "../middlewares/catchAsyncErrors";
import Course from "../models/course.model";
import { redis } from "../utils/redis";
import ErrorHandler from "../utils/errorHandler";

// create course
export const createCourse = catchAsyncError(
  async (data: any, res: Response, next: NextFunction) => {
    const course = await Course.create(data);

    // for redis update single course
    if (!course) return next(new ErrorHandler("Course not found", 404));

    // update redis
    await redis.set(`course - ${course._id}`, JSON.stringify(course));

    // for redis update all courses
    const courses = await Course.find().select(
      "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
    );

    if (!courses) return next(new ErrorHandler("Course not found", 404));

    // update all courses in redis too
    await redis.set("allCourses", JSON.stringify(courses));

    res.status(201).json({ success: true, message: "Course created", course });
  }
);

// get all courses
export const getAllCoursesService = async (res: Response) => {
  const courses = await Course.find().sort({ createdAt: -1 });

  res.status(200).json({ success: true, courses });
};
