import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

function resolveMongoUri() {
    const nodeEnv = (process.env.NODE_ENV || "").toLowerCase();
    if (nodeEnv === "test") {
        return (process.env.MONGO_URI_TEST || process.env.MONGO_URI || "").trim();
    }
    return (process.env.MONGO_URI || "").trim();
}

export const connectDB =async()=>{
    try{
        const uri = resolveMongoUri();
        if (!uri) {
            throw new Error("MongoDB URI missing. Set MONGO_URI (or MONGO_URI_TEST when NODE_ENV=test).");
        }

        await mongoose.connect(uri);

        // Keep test output clean
        if ((process.env.NODE_ENV || "").toLowerCase() !== "test") {
            console.log("MongoDB connected");
        }
        try {
            const coll = mongoose.connection.collection('stripepayments');
            try {
                await coll.dropIndex('sessionId_1');
            } catch (e) {
                // ignore if index does not exist
            }

            try {
                await coll.createIndex({ sessionId: 1 }, { sparse: true });
            } catch (e: any) {
                console.warn('Could not ensure sparse index on sessionId:', e.message || e);
            }
        } catch (idxErr: any) {
            console.warn('Index migration for stripepayments skipped:', idxErr.message || idxErr);
        }
    }catch(error){
        console.error("db error",error);
        process.exit(1);
    }
}