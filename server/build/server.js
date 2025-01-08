"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("./utils/db"));
const http_1 = __importDefault(require("http"));
const socketServer_1 = require("./socketServer");
// create server
const server = http_1.default.createServer(app_1.app);
// to access environment variables in server
dotenv_1.default.config();
// const PORT = 8000;
// const HOST = "192.168.45.227"; // for calling mobile
// start socket server
(0, socketServer_1.initSocketServer)(server);
// create server
server.listen(process.env.PORT, () => {
    console.log(`Application is running on port ${process.env.PORT}`);
    (0, db_1.default)();
});
