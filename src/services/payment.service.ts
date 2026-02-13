"use strict";
import axios from "axios";
import { HttpError } from "../errors/http-error";
import {
  ESEWA_VERIFY_URL,
  ESEWA_MERCHANT_ID,
  ESEWA_PAYMENT_STATUS_CHECK_URL,
  ESEWA_SECRET,
} from "../config";

const MOCK_PAYMENT = process.env.MOCK_PAYMENT === "true";

export class PaymentService {
  async verifyEsewa(txnId: string, amount: string) {
    try {
      if (MOCK_PAYMENT) {
        return { success: true, raw: "<status>Success</status> (mock)" };
      }
      // If a newer status-check URL is configured (developer sandbox), use JSON POST with secret
      if (ESEWA_PAYMENT_STATUS_CHECK_URL) {
        const payload = {
          merchantId: ESEWA_MERCHANT_ID,
          refId: txnId,
          amt: amount,
          secret: ESEWA_SECRET,
        };

        const res = await axios.post(ESEWA_PAYMENT_STATUS_CHECK_URL, payload, {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        });

        const data = res.data;
        let ok = false;
        if (typeof data === "string") {
          ok = /<status>Success<\/status>/.test(data) || /Success/i.test(data);
        } else if (data && (data.status === "SUCCESS" || data.status === "Success" || data.transactionStatus === "SUCCESS")) {
          ok = true;
        }

        return { success: ok, raw: data };
      }

      // Fallback to legacy form-post verification
      const params = new URLSearchParams();
      params.append("amt", amount);
      params.append("scd", ESEWA_MERCHANT_ID);
      params.append("rid", txnId);
      params.append("pid", txnId);

      const res = await axios.post(ESEWA_VERIFY_URL, params.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 10000,
      });

      const data: string = res.data;
      // eSewa returns XML like: <response>...<status>Success</status>...</response>
      const ok = /<status>Success<\/status>/.test(data);

      return { success: ok, raw: data };
    } catch (err: any) {
      throw new HttpError(502, "Failed to verify payment with eSewa");
    }
  }
}

export default new PaymentService();
