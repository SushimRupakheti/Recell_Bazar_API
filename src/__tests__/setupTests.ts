import { connectDB } from "../database/mongodb";
import mongoose from 'mongoose';

beforeAll(async () => {
    await connectDB();
});

afterAll(async () => {
    await mongoose.connection.close();
});
