import { Router } from "express";
import { AdminUserController } from "../../controllers/admin/user.contoller";
import { authorizedMiddleWare } from "../../middlewares/authorized.middleware";
import { Request,Response } from "express";

const router: Router = Router();
const adminUserController = new AdminUserController();

router.post('/register',authorizedMiddleWare, adminUserController.createUser);

router.get(
    '/test',
    authorizedMiddleWare    ,
    (req:Request,res:Response)=>{
        res.send("test route works");
    }
);

export default router;


