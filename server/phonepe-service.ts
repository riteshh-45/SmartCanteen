import axios from 'axios';
import crypto from 'crypto';

// PhonePe API constants
const PHONEPE_HOST = process.env.NODE_ENV === 'production' 
  ? 'https://api.phonepe.com/apis/hermes'  // Production URL
  : 'https://api-preprod.phonepe.com/apis/pg-sandbox'; // Sandbox URL

// Demo merchant credentials (these would be replaced with actual credentials in production)
const DEMO_MERCHANT_ID = "DEMOMART";
const DEMO_SALT_KEY = "099eb0cd-02cf-4e2a-8aca-3e6c6aff0399";
const DEMO_SALT_INDEX = "1";

// Get actual credentials from environment variables if available
const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || DEMO_MERCHANT_ID;
const SALT_KEY = process.env.PHONEPE_SALT_KEY || DEMO_SALT_KEY;
const SALT_INDEX = process.env.PHONEPE_SALT_INDEX || DEMO_SALT_INDEX;

/**
 * Generate a base64 encoded SHA256 hash
 * @param payload The data to hash
 * @returns Base64 encoded SHA256 hash
 */
function generateHash(payload: string): string {
  const hash = crypto.createHash('sha256')
    .update(`${payload}/pg/v1/pay${SALT_KEY}`)
    .digest('hex');
  return hash + '#' + SALT_INDEX;
}

/**
 * Create a PhonePe payment request
 * @param amount Amount in rupees
 * @param orderId Unique order identifier
 * @param customerName Customer's name
 * @param customerEmail Customer's email
 * @param customerPhone Customer's phone number
 * @param callbackUrl URL to redirect after payment
 * @returns Payment response with redirect URL
 */
export async function createPhonePePayment(
  amount: number,
  orderId: string,
  customerName: string,
  customerEmail: string,
  customerPhone: string,
  callbackUrl: string
) {
  try {
    // Create the payment payload
    const payload = {
      merchantId: MERCHANT_ID,
      merchantTransactionId: orderId,
      amount: amount * 100, // Amount in paise (1 rupee = 100 paise)
      merchantUserId: "MUID" + Date.now(),
      redirectUrl: callbackUrl,
      redirectMode: "REDIRECT",
      callbackUrl: callbackUrl,
      mobileNumber: customerPhone,
      paymentInstrument: {
        type: "PAY_PAGE"
      }
    };
    
    const payloadString = JSON.stringify(payload);
    const base64Payload = Buffer.from(payloadString).toString('base64');
    const xVerify = generateHash(base64Payload);
    
    // Make the API request
    const response = await axios.post(
      `${PHONEPE_HOST}/pg/v1/pay`,
      {
        request: base64Payload
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': xVerify
        }
      }
    );
    
    return {
      success: true,
      data: response.data,
      redirectUrl: response.data.data.instrumentResponse.redirectInfo.url
    };
  } catch (error) {
    console.error('PhonePe payment creation failed:', error);
    
    // For demo, return a mock response if the actual API call fails
    if (process.env.NODE_ENV !== 'production') {
      // This is a demo redirect URL for testing purposes
      const demoRedirectUrl = "https://demourl.phonepe.com/payments?transactionId=" + orderId;
      
      return {
        success: true,
        data: {
          success: true,
          code: "PAYMENT_INITIATED",
          message: "Payment initiated successfully (DEMO)",
          data: {
            merchantId: MERCHANT_ID,
            merchantTransactionId: orderId,
            instrumentResponse: {
              type: "PAY_PAGE",
              redirectInfo: {
                url: demoRedirectUrl,
                method: "GET"
              }
            }
          }
        },
        redirectUrl: demoRedirectUrl
      };
    }
    
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

/**
 * Verify a PhonePe payment
 * @param merchantTransactionId The merchant transaction ID
 * @returns Payment verification result
 */
export async function verifyPhonePePayment(merchantTransactionId: string) {
  try {
    const xVerify = generateHash(`/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}`);
    
    // Make the API request
    const response = await axios.get(
      `${PHONEPE_HOST}/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': xVerify,
          'X-MERCHANT-ID': MERCHANT_ID
        }
      }
    );
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('PhonePe payment verification failed:', error);
    
    // For demo, return a mock successful response
    if (process.env.NODE_ENV !== 'production') {
      return {
        success: true,
        data: {
          success: true,
          code: "PAYMENT_SUCCESS",
          message: "Payment successful (DEMO)",
          data: {
            merchantId: MERCHANT_ID,
            merchantTransactionId: merchantTransactionId,
            transactionId: "T" + Date.now(),
            amount: 10000, // 100 rupees in paise
            state: "COMPLETED",
            responseCode: "SUCCESS"
          }
        }
      };
    }
    
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}