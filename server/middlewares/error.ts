import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/errorHandler";

const ErrorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal Server Error";
  err.name = err.name || "Server Error";

  // wrong mongodb id error
  if (err.message === "CastError") {
    const message = `Invalid data format. Database could not process your request. `;
    err = new ErrorHandler(message, 400);
  }

  // invalid password entered
  if (err.message === "ValidationError") {
    const message = `Password must at least be 6 characters and alphanumeric(contain letter & number)`;
    err = new ErrorHandler(message, 422);
  }

  // duplicate key error
  if (err.code === 11000) {
    const message = `Duplicate ${Object.keys(err.keyValue)}} entered`;
    err = new ErrorHandler(message, 400);
  }

  //   wrong jwt error
  if (err.message === "JsonWebTokenError") {
    const message = `Token is invalid, try again.`;
    err = new ErrorHandler(message, 400);
  }

  //   jwt token expired error
  if (err.name === "TokenExpiredError" || err.message === "TokenExpiredError") {
    const message = `Token has expired, try again.`;
    err = new ErrorHandler(message, 400);
  }

  console.log(err.message);
  res.status(err.statusCode).json({ success: false, message: err.message });
};

export default ErrorMiddleware;
