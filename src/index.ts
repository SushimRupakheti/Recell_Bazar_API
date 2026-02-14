import { connectDB } from "./database/mongodb";
import app from "./app";
import { PORT } from './config';


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