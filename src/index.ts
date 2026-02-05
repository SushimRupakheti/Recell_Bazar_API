import express , { Application, Request, Response } from 'express';

import { connectDB } from './database/mongodb';
import bodyParser from 'body-parser';
import { PORT } from './config';

import authRoutes from './routes/auth.route';
import adminUserRoute from './routes/admin/user.route';
import itemRoutes from './routes/item.route';

import cors from "cors";




// dotenv.config();

const app: Application = express();
// const PORT: number = 3000;
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use("/api/users", authRoutes);


app.get('/', (req: Request, res: Response) => {
    res.send('Hello, World!');
});

 
app.use('/api/auth', authRoutes);
app.use('/api/admin/users', adminUserRoute);
app.use("/uploads", express.static("uploads"));

app.use("/api/items", itemRoutes);
import path from "path";

app.use("/uploads", express.static(path.join(__dirname, "../itemPhotoUploads")));


async function startServer() {
    await connectDB();
    app.listen(
    PORT,
    () => {
        console.log(`Server on http://localhost:${PORT}`);
    }
);
}

startServer();