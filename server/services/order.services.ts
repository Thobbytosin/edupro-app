import { NextFunction, Response } from "express";
import catchAsyncError from "../middlewares/catchAsyncErrors";
import Order from "../models/order.model";

export const newOrder = catchAsyncError(
  async (data: any, next: NextFunction, res: Response) => {
    const order = await Order.create(data);

    return order;
  }
);

// get all orders
export const getAllOrdersService = async (res: Response) => {
  const orders = await Order.find().sort({ createdAt: -1 });

  res.status(200).json({ success: true, orders });
};
