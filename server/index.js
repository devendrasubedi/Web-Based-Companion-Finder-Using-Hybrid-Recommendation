import express from 'express';
import dotenv from "dotenv";
import cookieParser from 'cookie-parser';
// const mongoose = require('mongoose');

<<<<<<< HEAD
import { connectDB }  from "./db/connectDB.js"


import  authRoutes from './routes/auth.route.js'
import userRoutes from './routes/userRoutes.js';
=======
import cors from "cors";

import { connectDB } from "./db/connectDB.js"
import authRoutes from './routes/auth.route.js'
import userRoutes from './routes/user.route.js'
import trailRoute from './routes/trail.route.js'
>>>>>>> e9f3635f32dd9aa80be7a98b1fea157047c1087d

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));

app.use(express.json()); //allows to parse incoming request :req.body
app.use(cookieParser()); //to parse cookies from request
<<<<<<< HEAD
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes);  //userprofile

=======
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/trails", trailRoute);
>>>>>>> e9f3635f32dd9aa80be7a98b1fea157047c1087d

app.listen(PORT, () => {
  connectDB()
  console.log(`Example app listening on port ${PORT}`)
})
