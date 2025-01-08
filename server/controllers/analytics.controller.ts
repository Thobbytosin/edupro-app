import { Request, Response } from "express";
import catchAsyncError from "../middlewares/catchAsyncErrors";
import ErrorHandler from "../utils/errorHandler";
import { generateLast12MonthsData } from "../utils/analytics.generator";
import User from "../models/user.model";
import Course from "../models/course.model";
import Order from "../models/order.model";

// get user analytics
export const getUserAnalytics = catchAsyncError(
  async (req: Request, res: Response, next: NewableFunction) => {
    try {
      const users = await generateLast12MonthsData(User);

      res.status(200).json({ success: true, users });
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

// get courses analytics
export const getCourseAnalytics = catchAsyncError(
  async (req: Request, res: Response, next: NewableFunction) => {
    try {
      const courses = await generateLast12MonthsData(Course);

      res.status(200).json({ success: true, courses });
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

// get orders analytics
export const getOrderAnalytics = catchAsyncError(
  async (req: Request, res: Response, next: NewableFunction) => {
    try {
      const orders = await generateLast12MonthsData(Order);

      res.status(200).json({ success: true, orders });
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);
