import { NextFunction, Request, Response } from "express";
import catchAsyncError from "../middlewares/catchAsyncErrors";
import ErrorHandler from "../utils/errorHandler";
import cloudUploader, { cloudApi } from "../utils/cloudinary";
import User, { IUser } from "../models/user.model";
import {
  createCourse,
  getAllCoursesService,
} from "../services/course.services";
import Course from "../models/course.model";
import { redis } from "../utils/redis";
import { isValidObjectId } from "mongoose";
import path from "path";
import ejs from "ejs";
import sendMail from "../utils/sendMail";
import Notification from "../models/notification.model";
import axios from "axios";

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// upload course

export const uploadCourse = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;

      if (!data) return next(new ErrorHandler("Fields are missing", 422));

      const userId = req.user?._id;

      const user = await User.findById(userId);

      if (!user) return next(new ErrorHandler("Error finding user", 404));

      // check if course exist
      const isCourseExist = await Course.findOne({ name: data.name });

      if (isCourseExist)
        return next(new ErrorHandler("Course already exists", 422));

      const thumbnail = data.thumbnail;

      if (thumbnail) {
        const folderPath = `byWay/courses/${data.category}`;
        //
        await cloudUploader.upload(
          thumbnail,
          {
            folder: folderPath,
            transformation: {
              gravity: "face",
            },
          },
          async (error: any, result) => {
            if (error) return next(new ErrorHandler(error.message, 400));

            const publicId = result?.public_id;

            const thumbnailId = publicId?.split("/").pop();

            const thumbnailUrl = result?.secure_url;

            data.thumbnail = {
              id: thumbnailId,
              url: thumbnailUrl,
            };
          }
        );
      }

      createCourse(data, res, next);
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// edit course

export const editCourse = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      // console.log(data);

      if (!data) return next(new ErrorHandler("Fields cannot be empty", 422));

      const thumbnail = data.thumbnail;

      if (thumbnail) {
        if (!thumbnail.id || !thumbnail.url) {
          const folderPath = `byWay/users/${data.name}`;
          // delete old thumbnail
          await cloudApi.delete_resources_by_prefix(folderPath);
          // upload new thumbnail
          await cloudUploader.upload(
            thumbnail,
            {
              folder: folderPath,
              transformation: {
                gravity: "face",
              },
            },
            async (error: any, result) => {
              if (error) return next(new ErrorHandler(error.message, 400));

              const publicId = result?.public_id;

              const thumbnailId = publicId?.split("/").pop();

              const thumbnailUrl = result?.secure_url;

              data.thumbnail = {
                id: thumbnailId,
                url: thumbnailUrl,
              };
            }
          );
        }
      }

      const courseId = req.params.course_id;

      const course = await Course.findByIdAndUpdate(
        courseId,
        {
          $set: data,
        },
        { new: true }
      );

      if (!course) return next(new ErrorHandler("Course not found", 404));

      // update redis
      await redis.set(`course - ${courseId}`, JSON.stringify(course));

      // for redis update
      const courses = await Course.find().select(
        "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
      );

      if (!courses) return next(new ErrorHandler("Course not found", 404));

      // update all courses in redis too
      await redis.set("allCourses", JSON.stringify(courses));

      res.status(201).json({
        success: true,
        message: "Course updated successfully",
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// get single course * without purchasing

export const getSingleCourse = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.course_id;

      const isCacheExists = await redis.get(`course - ${courseId}`);

      if (isCacheExists) {
        const course = JSON.parse(isCacheExists);

        res.status(200).json({ success: true, course });
      } else {
        const course = await Course.findById(courseId).select(
          "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
        );

        if (!course) return next(new ErrorHandler("Course not found", 404));

        await redis.set(`course - ${courseId}`, JSON.stringify(course));

        res.status(200).json({ success: true, course });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// get all courses * without purchasing

export const getAllCourses = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isCacheExists = await redis.get("allCourses");

      if (isCacheExists) {
        const courses = JSON.parse(isCacheExists);

        res.status(200).json({ success: true, courses });
      } else {
        const courses = await Course.find().select(
          "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
        );

        if (!courses) return next(new ErrorHandler("Course not found", 404));

        await redis.set("allCourses", JSON.stringify(courses));

        res.status(200).json({ success: true, courses });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// get course content * only for subscribed user

export const getCourseByUser = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userCourseList = req.user?.courses;

      const courseId = req.params.course_id;

      const courseExists = userCourseList.find(
        (course: any) => course.courseId === courseId
      );

      if (!courseExists)
        return next(
          new ErrorHandler("You are not eligible to access this course", 403)
        );

      const course = await Course.findById(courseId);

      if (!course) return next(new ErrorHandler("Course not found", 404));

      const content = course.courseData;

      res.status(200).json({ success: true, content });
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// add question to course content

interface IAddQuestion {
  question: string;
  courseId: string;
  contentId: string;
}

export const addQuestion = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { question, contentId, courseId } = req.body as IAddQuestion;

      if (!question || !contentId || !courseId)
        return next(new ErrorHandler("Invalid entry", 422));

      const course = await Course.findById(courseId);

      if (!course) return next(new ErrorHandler("Course not found", 404));

      // console.log(isValidObjectId(contentId));

      if (!isValidObjectId(contentId))
        return next(new ErrorHandler("Invalid content id", 400));

      const courseContent = course.courseData.find((item: any) =>
        item._id.equals(contentId)
      );

      if (!courseContent)
        return next(new ErrorHandler("Content not found", 404));

      // create question object
      const newQuestion: any = {
        user: req.user,
        question,
        questionReplies: [],
      };

      courseContent.questions.push(newQuestion);

      //   create notification
      await Notification.create({
        userId: req.user._id,
        title: "New Question Recieved",
        message: `You have a new question from ${course?.name} course in the ${courseContent.title} section`,
      });

      // save the updated course
      await course.save();

      // REDIS UPDATE
      const newCourse = await Course.findById(courseId);

      // update redis
      await redis.set(`course - ${courseId}`, JSON.stringify(newCourse));

      // for redis update
      const courses = await Course.find().select(
        "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
      );

      if (!courses) return next(new ErrorHandler("Course not found", 404));

      // update all courses in redis too
      await redis.set("allCourses", JSON.stringify(courses));

      res.status(200).json({ success: true, course });
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// add answer to  course content

interface IAddAnswerData {
  answer: string;
  courseId: string;
  contentId: string;
  questionId: string;
}

export const addAnswer = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { answer, contentId, courseId, questionId } =
        req.body as IAddAnswerData;

      const course = await Course.findById(courseId);

      if (!course) return next(new ErrorHandler("Course not found", 404));

      if (!isValidObjectId(contentId))
        return next(new ErrorHandler("Invalid content id", 400));

      const courseContent = course.courseData.find((item: any) =>
        item._id.equals(contentId)
      );

      if (!courseContent)
        return next(new ErrorHandler("Content not found", 404));

      const question = courseContent.questions?.find((question: any) =>
        question._id.equals(questionId)
      );

      if (!question) return next(new ErrorHandler("Question not found", 404));

      // create a new answer object
      const newAnswer: any = {
        user: req.user,
        answer,
      };

      // push answer to the question replies array
      question.questionReplies.push(newAnswer);

      await course.save();

      // REDIS

      const newCourse = await Course.findById(courseId);

      // update redis
      await redis.set(`course - ${courseId}`, JSON.stringify(newCourse));

      // for redis update  courses
      const courses = await Course.find().select(
        "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
      );

      if (!courses) return next(new ErrorHandler("Course not found", 404));

      // update all courses in redis too
      await redis.set("allCourses", JSON.stringify(courses));

      // send email notification to user
      if (req.user?._id === question.user._id) {
        // create a notification (because you answered the question yourself)

        await Notification.create({
          userId: req.user._id,
          title: "New Reply Received",
          message: `You have a new question reply from ${course.name} course in the ${courseContent.title} section`,
        });
      } else {
        // create notification as well
        await Notification.create({
          userId: req.user._id,
          title: "New  Reply Received",
          message: `You have a new question reply from ${course.name} course in the ${courseContent.title} section`,
        });
        // you answered someone else's question
        const data: any = {
          name: question.user.name,
          title: courseContent.title,
          question: question.question,
        };

        const html = await ejs.renderFile(
          path.join(__dirname, "../mails/question-reply.ejs"),
          data
        );

        // to send email notification
        try {
          await sendMail({
            email: question.user.email,
            subject: "Question Reply",
            template: "question-reply.ejs",
            data,
          });
        } catch (error: any) {
          return next(new ErrorHandler(error.message, 400));
        }
      }

      res.status(200).json({ success: true, course });
    } catch (error: any) {
      console.log(error);
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

/////////////////////////////////////////////////////////////////////////////////////////////////////
// add review to course

interface IAddReviewData {
  review: string;
  courseId: string;
  rating: number;
}

export const addReview = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user._id;

      console.log(userId);

      // const userCourseList = req.user?.courses;

      const userCourseList = await User.findById(userId);

      if (!userCourseList) return next(new ErrorHandler("User not found", 404));

      const courseId = req.params.course_id;

      const courseExists = userCourseList.courses.find(
        (course: any) => course.courseId === courseId
      );

      if (!courseExists)
        return next(
          new ErrorHandler("You are not allowed access to this course", 403)
        );

      const course = await Course.findById(courseId);

      if (!course) return next(new ErrorHandler("Course not found", 404));

      const { rating, review } = req.body as IAddReviewData;

      const reviewData: any = {
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
      await Notification.create({
        userId: req.user._id,
        title: "New Review Recieved",
        message: `You have a new review from ${course.name} course.`,
      });

      // REDIS UPDATE
      const newCourse = await Course.findById(courseId);

      // update redis
      await redis.set(`course - ${courseId}`, JSON.stringify(newCourse));

      // for redis update
      const courses = await Course.find().select(
        "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
      );

      if (!courses) return next(new ErrorHandler("Course not found", 404));

      // update all courses in redis too
      await redis.set("allCourses", JSON.stringify(courses));

      // update user reviewed course
      const user = await User.updateOne(
        {
          _id: userId,
          "courses.courseId": courseId,
        },
        { $set: { "courses.$.reviewed": true } },
        { arrayFilters: [{ "course.courseId": courseId }] }
      );

      if (!user) return next(new ErrorHandler("User not found", 404));

      const newUser = await User.findById(userId);

      //   update user to redis
      await redis.set(
        `user - ${newUser?._id as string}`,
        JSON.stringify(newUser) as any
      );

      res.status(200).json({ success: true, course });
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

/////////////////////////////////////////////////////////////////////////////////////////////////////
// add reply to review

interface IAddReplyReviewData {
  reply: string;
  courseId: string;
  reviewId: string;
}

export const addReplyToReview = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId, reply, reviewId } = req.body as IAddReplyReviewData;

      const course = await Course.findById(courseId);

      if (!course) return next(new ErrorHandler("Course not found", 404));

      const review = course.reviews.find(
        (review: any) => review._id.toString() === reviewId
      );

      if (!review) return next(new ErrorHandler("Review not found", 404));

      const newReply: any = {
        user: req.user,
        reply,
      };

      if (!review.commentReplies) {
        review.commentReplies = [];
      }

      review.commentReplies?.push(newReply);

      await course.save();

      const newCourse = await Course.findById(courseId);

      // update redis
      await redis.set(`course - ${courseId}`, JSON.stringify(newCourse));

      // for redis update
      const courses = await Course.find().select(
        "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
      );

      if (!courses) return next(new ErrorHandler("Course not found", 404));

      // update all courses in redis too
      await redis.set("allCourses", JSON.stringify(courses));

      res.status(200).json({ success: true, course });
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

/////////////////////////////////////////////////////////////////////////////////////////////////////
// get all courses - admin only

export const getAdminAllCourses = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllCoursesService(res);
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

////////////////////////////////////////////////////////////////////////////////////////////////
// delete course - admin only

export const deleteCourse = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId } = req.params;

      const course = await Course.findById(courseId);

      if (!course) return next(new ErrorHandler("Course not found", 404));

      await course.deleteOne();

      await redis.del(`course - ${courseId}`);

      // for redis update
      const courses = await Course.find().select(
        "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
      );

      if (!courses) return next(new ErrorHandler("Course not found", 404));

      // update all courses in redis too
      await redis.set("allCourses", JSON.stringify(courses));

      res
        .status(200)
        .json({ success: true, message: "Course deleted successfully" });
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

////////////////////////////////////////////////////////////////////////////////////////////////
// generate video url

export const generateVideoUrl = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { videoId } = req.body;

      const response = await axios.post(
        `https://dev.vdocipher.com/api/videos/${videoId}/otp`,
        { ttl: 300 },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Apisecret ${process.env.VDOCIPHER_API_SECRET}`,
          },
        }
      );

      res.json(response.data);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
