import { NextFunction, Request, Response } from "express";
import catchAsyncError from "../middlewares/catchAsyncErrors";
import ErrorHandler from "../utils/errorHandler";
import Order, { IOrder } from "../models/order.model";
import User from "../models/user.model";
import Course from "../models/course.model";
import { getAllOrdersService, newOrder } from "../services/order.services";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/sendMail";
import Notification from "../models/notification.model";
import { redis } from "../utils/redis";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Stripe secret key is required");
}

// stripe docs
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

// create order
export const createOrder = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { payment_info, courseId } = req.body as IOrder;

      if (payment_info) {
        if ("id" in payment_info) {
          const paymentIntentId: any = payment_info.id;
          const paymentIntent = await stripe.paymentIntents.retrieve(
            paymentIntentId
          );

          if (paymentIntent.status !== "succeeded") {
            return next(new ErrorHandler("Payment failed", 400));
          }
        }
      }
      const user = await User.findById(req.user?._id);

      if (!user) return next(new ErrorHandler("User not found", 404));

      const userAlreadyHasCourse = user.courses.find(
        (course: any) => course.courseId === courseId
      );

      if (userAlreadyHasCourse)
        return next(
          new ErrorHandler("You have already purchased this course", 400)
        );

      const course = await Course.findById(courseId);

      if (!course) return next(new ErrorHandler("Course not found", 404));

      const data: any = {
        courseId: course._id,
        userId: user._id,
      };

      //   order created
      const order = await Order.create(data);

      if (!order)
        return next(
          new ErrorHandler(
            "Encountered error processing order. Please try again",
            422
          )
        );

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

      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/order-confirmation.ejs"),
        mailData
      );

      try {
        await sendMail({
          email: user.email,
          subject: "Order Confirmation",
          template: "order-confirmation.ejs",
          data: mailData,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.mesage, 400));
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
      await User.updateOne(
        { _id: user._id },
        {
          $push: {
            courses: {
              courseId: courseId,
              progress: progress,
              reviewed: false,
            },
          },
        }
      );

      const newUser = await User.findById(user._id);

      //   update user to redis
      await redis.set(
        `user - ${newUser?._id as string}`,
        JSON.stringify(newUser) as any
      );

      //   create notification
      await Notification.create({
        userId: user._id,
        title: "New Order",
        message: `You have a new order from ${course.name}`,
      });

      course.purchase += 1;

      await course.save();

      // update course redis

      await redis.set(`course - ${courseId}`, JSON.stringify(course));

      // and update all courses
      const courses = await Course.find().select(
        "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
      );

      if (!courses) return next(new ErrorHandler("Course not found", 404));

      // update all courses redis
      await redis.set("allCourses", JSON.stringify(courses));

      res.status(201).json({ success: true, order });
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

// get all orders - admin only

export const getAllOrders = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllOrdersService(res);
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

// send stripe publishable key
export const sendStripePublishableKey = catchAsyncError(
  (req: Request, res: Response) => {
    res
      .status(200)
      .json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
  }
);

// create new payment
export const newPayment = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { amount } = req.body;

      // convert amount to kobo: 1 NGN = 100 KOBO
      const amountInKobo = amount * 100;

      const myPayment = await stripe.paymentIntents.create({
        amount: amountInKobo,
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
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
