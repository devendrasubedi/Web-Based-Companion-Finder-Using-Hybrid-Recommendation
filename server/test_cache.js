import mongoose from "mongoose";

async function run() {
    await mongoose.connect("mongodb://localhost:27017/auth_db");
    const user = await mongoose.connection.db.collection('users').findOne({});
    if (!user) {
        console.log("No users found");
        process.exit(1);
    }
    console.log("Found user:", user._id);
    const cache = await mongoose.connection.db.collection('Recommendation_Cache').find({ userId: user._id }).toArray();
    console.log(`Found ${cache.length} records in cache for user.`);
    cache.forEach(c => {
        console.log(`Type: ${c.type}, Total Recs: ${c.recommendations?.length || 0}`);
        if(c.recommendations?.length > 0) {
           console.log("Sample Item ID:", c.recommendations[0].itemId, "Type:", typeof(c.recommendations[0].itemId));
        }
    });

    process.exit(0);
}
run().catch(console.error);
