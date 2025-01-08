import { app } from "./app";
import dotenv from "dotenv";
import connectDB from "./utils/db";
import http from "http";
import { initSocketServer } from "./socketServer";

// create server
const server = http.createServer(app);

// to access environment variables in server
dotenv.config();

// const PORT = 8000;
const host = "192.168.100.117"; // for calling mobile

// start socket server
initSocketServer(server);

// create server
server.listen(process.env.PORT, host as any, () => {
  console.log(`Application is running on port ${process.env.PORT}`);
  connectDB();
});
