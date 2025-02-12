import { Socket } from "socket.io";
import { io } from '../index';

type UsersType = { userId: string, socketId: string };

let users: UsersType[] = [];

const addUser = (userId: string, socketId: string) => {
  const isAlreadyAdded = users.some((user) => user.userId === userId);
  if (!userId || isAlreadyAdded) return;
  users.push({ userId, socketId });
};

const removeUser = (socketId: string) => {
  users = users.filter((user) => user.socketId !== socketId);
};

export const socketIo = (socket: Socket) => {
  socket.on("user", (userId) => {
    addUser(userId, socket.id);
    socket.join(userId);
    io.emit("user", users);
  });

  socket.on("chat", (data) => {
    socket.broadcast.emit("chat", data);
  });

  socket.on('seen-message', (data) => {
    socket.broadcast.emit('seen-message', data);
  });

  socket.on("leave-gc", ({ data, userId }) => {
    socket.broadcast.emit('leave-gc', { data, userId });
  });

  socket.on("disconnect", () => {
    removeUser(socket.id);
    io.emit("user", users);
  });
};