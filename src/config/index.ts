import dotenv from 'dotenv';
import { createUserDto } from '../dtos/auth.dto';
import bycryptjs from "bcryptjs";

dotenv.config();

export const PORT:number=
process.env.PORT? parseInt(process.env.PORT):5050;

//ensure PORT is a number, and fallback if not found
//avoid exception if env is missing

export const MONGO_URI:string=
process.env.MONGO_URI || 'mongodb+srv://sushimrupakheti120_db_user:H1XKG2TbSGBe09nX@classcrud.dndzm1n.mongodb.net/mydb'

//fallback to local mongo db if env is missing

//application lelevel constants

export const JWT_SECRET: string = process.env.JWT_SECRET || 'defaultsecret';

// eSewa configuration
export const ESEWA_MERCHANT_ID: string = process.env.ESEWA_MERCHANT_ID || 'EPAYTEST';
export const ESEWA_VERIFY_URL: string = process.env.ESEWA_VERIFY_URL || 'https://esewa.com.np/epay/main';
export const ESEWA_SECRET: string = process.env.ESEWA_SECRET || '';
export const ESEWA_PAYMENT_URL: string = process.env.ESEWA_PAYMENT_URL || '';
export const ESEWA_PAYMENT_STATUS_CHECK_URL: string = process.env.ESEWA_PAYMENT_STATUS_CHECK_URL || '';