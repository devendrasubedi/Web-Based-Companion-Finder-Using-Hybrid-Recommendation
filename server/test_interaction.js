import mongoose from 'mongoose';
import { UserTrailInteraction } from './models/user_trail_interaction.js';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log("Connected");
        const userId = new mongoose.Types.ObjectId(); // dummy
        const trailId = "60f6b8b0e6b0f02c485c5c31"; // dummy string
        
        try {
            let interaction = await UserTrailInteraction.findOne({ userId, trailId });
            if (!interaction) interaction = new UserTrailInteraction({ userId, trailId });
            interaction.rating = 5;
            interaction.implicitScore = 5;
            await interaction.save();
            console.log("Saved successfully:", interaction);
        } catch(e) {
            console.error("Error:", e);
        }
        process.exit();
    });
