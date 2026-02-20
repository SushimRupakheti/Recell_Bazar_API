import mongoose from "mongoose";
import {MONGO_URI}from "../config"

export const connectDB =async()=>{
    try{
        await mongoose.connect(MONGO_URI);
        console.log("MongoDB connected");
        // Ensure older non-sparse unique indexes on `sessionId` do not
        // prevent inserting PaymentIntent-only records. This attempts to
        // drop the legacy index and recreate a sparse index so documents
        // without `sessionId` are not indexed (avoids null collisions).
        try {
            const coll = mongoose.connection.collection('stripepayments');
            try {
                await coll.dropIndex('sessionId_1');
                console.log('Dropped legacy sessionId index');
            } catch (e) {
                // ignore if index does not exist
            }

            try {
                await coll.createIndex({ sessionId: 1 }, { sparse: true });
                console.log('Ensured sparse index on sessionId');
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