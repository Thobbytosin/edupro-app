"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const error_1 = __importDefault(require("./middlewares/error"));
const user_route_1 = __importDefault(require("./routes/user.route"));
const course_route_1 = __importDefault(require("./routes/course.route"));
const order_route_1 = __importDefault(require("./routes/order.route"));
const notification_route_1 = __importDefault(require("./routes/notification.route"));
const analytics_route_1 = __importDefault(require("./routes/analytics.route"));
const layout_route_1 = __importDefault(require("./routes/layout.route"));
const express_rate_limit_1 = require("express-rate-limit");
exports.app = (0, express_1.default)();
dotenv_1.default.config();
// limit for the json data / body parser
exports.app.use(express_1.default.json({ limit: "50mb" }));
// cookie parser (sending cookies to frontend from server)
exports.app.use((0, cookie_parser_1.default)());
// to send form data to server
exports.app.use(express_1.default.urlencoded({ extended: false }));
//CORS - cross-origin resource sharing
exports.app.use((0, cors_1.default)({
    // origin: process.env.ORIGIN,
    // origin: ["http://localhost:3000"],
    origin: "https://by-way.onrender.com",
    // origin: ["http://localhost:3000", "http://192.168.45.227:3000"],
    // origin: "http://192.168.45.227:3000", // FOR MOBILE
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    credentials: true,
}));
// app.use(cors());
// rateLimit middleware
const limiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
    standardHeaders: "draft-7", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
    // store: ... , // Redis, Memcached, etc. See below.
});
// ROUTES
exports.app.use("/api/v1", user_route_1.default);
exports.app.use("/api/v1", course_route_1.default);
exports.app.use("/api/v1", order_route_1.default);
exports.app.use("/api/v1", notification_route_1.default);
exports.app.use("/api/v1", analytics_route_1.default);
exports.app.use("/api/v1", layout_route_1.default);
// testing api
exports.app.get("/test", (req, res, next) => {
    res.status(200).json({ message: "Api is up" });
});
// uknown route
exports.app.all("*", (req, res, next) => {
    const err = new Error(`Route ${req.originalUrl} not found`);
    err.statusCode = 400;
    next(err);
});
// middleware calls
// Apply the rate limiting middleware to all requests.
exports.app.use(limiter);
// error middleware on all requests
exports.app.use(error_1.default);
///////////////////////////////////////////////////////////////////
