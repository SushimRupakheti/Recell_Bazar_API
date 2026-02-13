import { Request, Response } from "express";
import paymentService from "../services/payment.service";
import { PaymentModel } from "../models/payment.model";

export class PaymentController {
  async verifyEsewaCallback(req: Request, res: Response) {
    try {
      const {
        oid,
        amt,
        refId,
        fullName,
        phoneNo,
        email,
        phoneModel,
        price,
        location,
        date,
        time,
        sellerId,
      } = req.body;

      if (!oid || !amt || !refId || !fullName || !phoneNo || !email || !phoneModel || price == null || !location || !date || !time || !sellerId) {
        return res.status(400).json({ success: false, message: "Missing required parameters" });
      }

      const result = await paymentService.verifyEsewa(refId, amt.toString());

      if (result.success) {
        // Persist payment record (idempotent by refId)
        try {
          const existing = await PaymentModel.findOne({ refId });
          if (!existing) {
            await PaymentModel.create({
              fullName,
              phoneNo,
              email,
              phoneModel,
              sellerId,
              price: Number(price),
              location,
              date,
              time,
              oid,
              refId,
              amt: amt.toString(),
              status: "Success",
              raw: result.raw,
            });
          }
        } catch (saveErr: any) {
          // Log and continue — verification succeeded but saving failed
          console.error("Failed to save payment record:", saveErr);
        }

        return res.status(200).json({ success: true, message: "Payment verified", raw: result.raw });
      }

      return res.status(400).json({ success: false, message: "Payment not verified", raw: result.raw });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ success: false, message: err.message || "Verification failed" });
    }
  }
}

export default new PaymentController();
