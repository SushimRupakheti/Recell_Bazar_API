import {createUserDto} from "../../dtos/auth.dto"
import z from "zod";
import {Request,Response} from "express";
import { AuthService } from "../../services/auth.services";

let authservice= new AuthService();

export class AdminUserController{
    async createUser(req: Request,res:Response){

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
                { success: false, message: error.message || "Internal Server Error"}
            )
        }

    }
}
