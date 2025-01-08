"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocketServer = void 0;
const socket_io_1 = require("socket.io");
const initSocketServer = (server) => {
    const io = new socket_io_1.Server(server);
    io.on("connection", (socket) => {
        console.log("A connection has been established");
        // listen for incoming connections from the frontend
        socket.on("notification", (data) => {
            // send the notifications to all connected clients (admin dashboard)
            io.emit("newNotification", data);
        });
        // when the connection is disconnected
        socket.on("disconnect", () => {
            console.log("connection disconnected");
        });
    });
};
exports.initSocketServer = initSocketServer;
