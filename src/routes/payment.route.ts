import { Router } from "express";
import paymentController from "../controllers/payment.controller";

const router = Router();

// Endpoint for client to POST verification data received from eSewa
router.post("/esewa/verify", (req, res) => paymentController.verifyEsewaCallback(req, res));

export default router;
