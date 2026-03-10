import mongoose from 'mongoose';
import { UserRelationship } from './models/userRelationship.model.js';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log("Connected");
        const userId = "60f6b8b0e6b0f02c485c5c31"; // dummy string
        
        try {
            const friends = await UserRelationship.getFriends(userId);
            console.log("Friends:", friends);
        } catch(e) {
            console.error("FAIL:", e);
        }
        process.exit();
    });
