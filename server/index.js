import express from 'express';
import dotenv from "dotenv";
import cookieParser from 'cookie-parser';
// const mongoose = require('mongoose');

import { connectDB }  from "./db/connectDB.js"


import  authRoutes from './routes/auth.route.js'
import userRoutes from './routes/userRoutes.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json()); //allows to parse incoming request :req.body
app.use(cookieParser()); //to parse cookies from request
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes);  //userprofile


app.listen(PORT, () => {
    connectDB()
  console.log(`Example app listening on port ${PORT}`)
})
