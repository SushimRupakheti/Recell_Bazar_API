import { UserRepository } from "../repositories/auth.repository";
import { createUserDto, LoginUserDto } from "../dtos/auth.dto";
import bycryptjs from "bcryptjs"
import { HttpError } from "../errors/http-error";
import { JWT_SECRET } from "../config";
import  jwt  from "jsonwebtoken";

let userRepository =new UserRepository();

export class AuthService{
async registerUser(data:createUserDto){
    //logic to register user,duplicate check, hash
    const emailExists =await userRepository.getUserByEmail(data.email);
    if(emailExists){
        throw new HttpError(409,"email already registered");
    }

    //donot save plain text password, hash the pass
    const hashedPassword = await bycryptjs.hash(data.password,10);   //complexity
    data.password =hashedPassword;  //replace plain text with hashed password
    const newUser = await userRepository.createUser(data);
    return newUser


    }  
    
async LoginUser(data:LoginUserDto){
    const user= await userRepository.getUserByEmail(data.email);
    if(!user){
        throw new HttpError(484,"user not found");
    }
    const validPassword = await bycryptjs.compare(data.password,user.password);
    //plain text, hased, not data.password===user.passwprd
    if(!validPassword){
        throw new HttpError(484,"Invalid password");
    }
    //generate jwt token 
    const payload={
        id: user._id,
        email: user.email
    }
    const token = jwt.sign(payload,JWT_SECRET,{expiresIn:'30d'});
    return {token,user}
} 
}
 