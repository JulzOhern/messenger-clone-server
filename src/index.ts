import express from 'express';
import cors from 'cors';
import http from 'http';
import cookieParser from 'cookie-parser';
import { config } from 'dotenv';
import { router } from './routes/route';
import { createRouteHandler } from "uploadthing/express";
import { uploadRouter } from "./uploadthing";
import { Server } from 'socket.io';
import { socketIo } from './socket/socket';

config();

const app = express();
const httpServer = http.createServer(app)
export const io = new Server(httpServer, { cors: { origin: "*" } });
io.on('connection', socketIo);
const PORT = process.env.PORT || 9091

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());

app.use("/api/uploadthing", createRouteHandler({
  router: uploadRouter,
  config: {
    token: process.env.UPLOADTHING_TOKEN
  }
}));
app.use('/api', router);

httpServer.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});



