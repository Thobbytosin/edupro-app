import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import ErrorMiddleware from "./middlewares/error";
import userRouter from "./routes/user.route";
import courseRouter from "./routes/course.route";
import orderRouter from "./routes/order.route";
import notificationRouter from "./routes/notification.route";
import analyticsRouter from "./routes/analytics.route";
import layoutRouter from "./routes/layout.route";
import { rateLimit } from "express-rate-limit";

export const app = express();
dotenv.config();

// limit for the json data / body parser
app.use(express.json({ limit: "50mb" }));

// cookie parser (sending cookies to frontend from server)
app.use(cookieParser());

// to send form data to server
app.use(express.urlencoded({ extended: false }));

//CORS - cross-origin resource sharing

// app.use(
//   cors({
//     // origin: process.env.ORIGIN,
//     // origin: "http://localhost:3000",
//     origin: "http://192.168.100.210:8081",
//     // origin: "https://by-way.onrender.com",
//     // origin: ["http://localhost:3000", "http://192.168.45.227:3000"],
//     // origin: "http://192.168.45.227:3000", // FOR MOBILE
//     methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
//     credentials: true,
//   })
// );

app.use(cors());

// rateLimit middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: "draft-7", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  // store: ... , // Redis, Memcached, etc. See below.
});

// ROUTES
app.use("/api/v1", userRouter);
app.use("/api/v1", courseRouter);
app.use("/api/v1", orderRouter);
app.use("/api/v1", notificationRouter);
app.use("/api/v1", analyticsRouter);
app.use("/api/v1", layoutRouter);

// testing api
app.get("/test", (req, res, next) => {
  res.status(200).json({ message: "Api is up" });
});

// uknown route
app.all("*", (req, res, next) => {
  const err = new Error(`Route ${req.originalUrl} not found`) as any;
  err.statusCode = 400;
  next(err);
});

// middleware calls
// Apply the rate limiting middleware to all requests.
app.use(limiter);

// error middleware on all requests
app.use(ErrorMiddleware);

///////////////////////////////////////////////////////////////////
