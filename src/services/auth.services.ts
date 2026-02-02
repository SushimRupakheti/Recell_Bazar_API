import { UserRepository } from "../repositories/auth.repository";
import { createUserDto, LoginUserDto } from "../dtos/auth.dto";
import bycryptjs from "bcryptjs"
import { HttpError } from "../errors/http-error";
import { JWT_SECRET } from "../config";
import  jwt  from "jsonwebtoken";
import { IUser } from "../models/user.model";
import { UserModel } from "../models/user.model";


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

async updateUser(userId:string, data:Partial<createUserDto>){
    const updatedUser = await userRepository.updateUserById(userId,data);   
    if(!updatedUser){
        throw new HttpError(404,"User not found");
    }
    return updatedUser;
}


async updateProfileImage(userId: string, imagePath: string) {
  const user = await UserModel.findByIdAndUpdate(
    userId,
    { profileImage: imagePath },
    { new: true }
  );

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

async getUserById(userId: string) {
    const user = await userRepository.getUserById(userId);
    if (!user) {
        throw new HttpError(404, "User not found");
    }
    return user;
}
}