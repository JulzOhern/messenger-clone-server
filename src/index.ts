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
export const io = new Server(httpServer, { cors: { origin: '*' } });
io.on('connection', socketIo);
const PORT = process.env.PORT || 9091

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  credentials: true, origin: ['http://localhost:5173', 'http://localhost:4173', 'https://current-mala-noneee-8ebdc2b6.koyeb.app', 'https://scontent.fmnl17-6.fna.fbcdn.net']
}));
app.use(cookieParser());

app.use("/api/uploadthing", createRouteHandler({ router: uploadRouter, config: {} }));
app.use('/api', router);

httpServer.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});



