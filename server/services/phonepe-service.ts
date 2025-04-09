import crypto from 'crypto';

interface PhonePePaymentRequest {
  merchantId: string;
  merchantTransactionId: string;
  amount: number;
  merchantUserId: string;
  redirectUrl: string;
  callbackUrl: string;
  paymentInstrument?: {
    type: string;
    [key: string]: any;
  };
}

interface PhonePeResponse {
  success: boolean;
  code: string;
  message: string;
  data?: {
    merchantId: string;
    merchantTransactionId: string;
    instrumentResponse?: {
      type: string;
      redirectInfo?: {
        url: string;
      };
    };
  };
}

/**
 * PhonePe Service for handling payment operations
 * Note: This is a demo service for simulation purposes only
 */
export class PhonePeService {
  private merchantId: string;
  private saltKey: string;
  private saltIndex: string;
  private apiEndpoint: string;
  private isProduction: boolean;

  constructor(isProduction = false) {
    // In a real implementation, these would come from environment variables
    this.merchantId = process.env.PHONEPE_MERCHANT_ID || 'DEMO_MERCHANT';
    this.saltKey = process.env.PHONEPE_SALT_KEY || 'DEMO_SALT_KEY';
    this.saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
    this.isProduction = isProduction;
    
    // PhonePe API endpoints
    this.apiEndpoint = isProduction 
      ? 'https://api.phonepe.com/apis/hermes/pg/v1/pay'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay';
  }

  /**
   * Generate a signature for PhonePe requests
   */
  private generateSignature(payload: string): string {
    const data = payload + '/pg/v1/pay' + this.saltKey;
    return crypto.createHash('sha256').update(data).digest('hex') + '###' + this.saltIndex;
  }

  /**
   * Create a payment request to PhonePe
   */
  async initiatePayment(params: {
    transactionId: string;
    amount: number;
    userId: string;
    redirectUrl: string;
    callbackUrl: string;
  }): Promise<{ paymentUrl: string; transactionId: string }> {
    const { transactionId, amount, userId, redirectUrl, callbackUrl } = params;
    
    // Prepare payment request
    const paymentRequest: PhonePePaymentRequest = {
      merchantId: this.merchantId,
      merchantTransactionId: transactionId,
      amount: amount * 100, // PhonePe expects amount in paise
      merchantUserId: userId,
      redirectUrl,
      callbackUrl,
      paymentInstrument: {
        type: 'PAY_PAGE'
      }
    };
    
    // For the demo mode, we'll simulate a successful response
    if (!this.isProduction && (!this.merchantId || this.merchantId === 'DEMO_MERCHANT')) {
      console.log('[DEMO MODE] PhonePe payment initiated:', paymentRequest);
      
      // Create a simulated payment URL
      const paymentUrl = `/demo-payment?amount=${amount}&transactionId=${transactionId}`;
      
      return {
        paymentUrl,
        transactionId
      };
    }
    
    // In production mode with actual API keys
    try {
      // Convert request to base64
      const base64Payload = Buffer.from(JSON.stringify(paymentRequest)).toString('base64');
      
      // Generate X-VERIFY header
      const signature = this.generateSignature(base64Payload);
      
      // Make API request to PhonePe
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': signature
        },
        body: JSON.stringify({
          request: base64Payload
        })
      });
      
      const responseData: PhonePeResponse = await response.json();
      
      if (!responseData.success) {
        throw new Error(`PhonePe payment failed: ${responseData.message}`);
      }
      
      // Extract payment URL
      const paymentUrl = responseData.data?.instrumentResponse?.redirectInfo?.url || '';
      
      return {
        paymentUrl,
        transactionId
      };
    } catch (error) {
      console.error('PhonePe payment initiation error:', error);
      throw new Error('Failed to initiate PhonePe payment');
    }
  }
  
  /**
   * Verify a payment callback from PhonePe
   */
  verifyPaymentCallback(requestBody: any, xVerifyHeader: string): boolean {
    // For demo mode, always return success
    if (!this.isProduction && (!this.merchantId || this.merchantId === 'DEMO_MERCHANT')) {
      console.log('[DEMO MODE] PhonePe payment callback verified');
      return true;
    }
    
    // In production, verify the signature
    try {
      // Extract base64 payload from request
      const { response } = requestBody;
      
      // Verify X-VERIFY header
      const calculatedSignature = this.generateSignature(response);
      
      // Check if signatures match
      return calculatedSignature === xVerifyHeader;
    } catch (error) {
      console.error('PhonePe callback verification error:', error);
      return false;
    }
  }
  
  /**
   * Check the status of a payment
   */
  async checkPaymentStatus(merchantTransactionId: string): Promise<any> {
    // For demo mode, simulate a successful payment
    if (!this.isProduction && (!this.merchantId || this.merchantId === 'DEMO_MERCHANT')) {
      console.log('[DEMO MODE] PhonePe payment status checked');
      
      return {
        success: true,
        code: 'PAYMENT_SUCCESS',
        message: 'Payment successful',
        data: {
          merchantId: this.merchantId,
          merchantTransactionId,
          transactionId: `DEMO_TX_${merchantTransactionId}`,
          amount: 100, // Amount in paise
          state: 'COMPLETED',
          responseCode: 'SUCCESS'
        }
      };
    }
    
    // In production, check with the actual API
    try {
      const statusEndpoint = `https://${this.isProduction ? 'api' : 'api-preprod'}.phonepe.com/apis/hermes/pg/v1/status/${this.merchantId}/${merchantTransactionId}`;
      
      // Generate signature for status check
      const payload = `/pg/v1/status/${this.merchantId}/${merchantTransactionId}` + this.saltKey;
      const signature = crypto.createHash('sha256').update(payload).digest('hex') + '###' + this.saltIndex;
      
      const response = await fetch(statusEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': signature,
          'X-MERCHANT-ID': this.merchantId
        }
      });
      
      return await response.json();
    } catch (error) {
      console.error('PhonePe payment status check error:', error);
      throw new Error('Failed to check payment status');
    }
  }
}

// Export a singleton instance
export const phonePeService = new PhonePeService();