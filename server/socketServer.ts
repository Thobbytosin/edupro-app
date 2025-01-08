import { Server as SocketIOServer } from "socket.io";
import http from "http";

export const initSocketServer = (server: http.Server) => {
  const io = new SocketIOServer(server);

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
