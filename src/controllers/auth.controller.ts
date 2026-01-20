import { AuthService} from "../services/auth.services";
import { createUserDto, LoginUserDto } from "../dtos/auth.dto";
import z from "zod";
import { Request, Response } from "express";


let authservice = new AuthService();
export class AuthController{
    async registerUser(req: Request, res: Response){
        try{
            const parsedData = createUserDto.safeParse(req.body);
            if(!parsedData.success){
                return res.status(400).json(
                    {success: false, message: z.prettifyError(parsedData.error)}
                )
            }

            const newUser = await authservice.registerUser(parsedData.data);
            return res.status(201).json(
                {success: true, data: newUser, message: "Registered Success"}
            )
        }catch(error: Error | any){
            return res.status(500).json(
                { success: false, message: error.message || "Inernal Server Error"}
            )
        }
    }
   async loginUser(req: Request, res: Response) {
    try {
      const parsedData = LoginUserDto.safeParse(req.body);
      if (!parsedData.success) {
        return res.status(400).json({
          success: false,
          message: z.formatError(parsedData.error),
        });
      }

      const { token, user } = await authservice.LoginUser(parsedData.data);
      return res.status(200).json({
        success: true,
        data: user,
        token,
        message: "Login success",
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }
}