/**
 * UPI Payment Utilities for 100% Free UPI Collection
 */

export interface UPIPaymentParams {
  upiId?: string; // VPA e.g. merchant@upi
  payeeName?: string; // e.g. Easy Records
  amount: number; // e.g. 499
  transactionNote?: string; // e.g. Pro Subscription Upgrade
  transactionId?: string; // Unique ref id
}

/**
 * Default Merchant / Receipient UPI ID for Easy Records
 */
export const DEFAULT_UPI_ID = "yogeshrp2003@okaxis"; // Default UPI VPA
export const DEFAULT_PAYEE_NAME = "Easy Records";

/**
 * Generate standard upi://pay URI string
 */
export const generateUPILink = (params: UPIPaymentParams): string => {
  const {
    upiId = DEFAULT_UPI_ID,
    payeeName = DEFAULT_PAYEE_NAME,
    amount,
    transactionNote = "Easy Records Subscription",
    transactionId = `ER${Date.now()}`
  } = params;

  const encodedName = encodeURIComponent(payeeName);
  const encodedNote = encodeURIComponent(transactionNote);
  
  return `upi://pay?pa=${upiId}&pn=${encodedName}&am=${amount.toFixed(2)}&cu=INR&tn=${encodedNote}&tr=${transactionId}`;
};

/**
 * Specific App Deep Links for Google Pay, PhonePe, Paytm
 */
export const getSpecificUPIAppLinks = (params: UPIPaymentParams) => {
  const baseUpi = generateUPILink(params);
  const query = baseUpi.replace('upi://pay?', '');
  
  return {
    gpay: `intent://pay?${query}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`,
    phonepe: `intent://pay?${query}#Intent;scheme=upi;package=com.phonepe.app;end`,
    paytm: `intent://pay?${query}#Intent;scheme=upi;package=net.one97.paytm;end`,
    generic: baseUpi
  };
};

/**
 * Generate QR Code Image URL using free QR server API
 */
export const getQRCodeURL = (upiLink: string, size = 250): string => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(upiLink)}`;
};

/**
 * Validate 12-Digit UTR / Transaction Reference Number
 */
export const validateUTR = (utr: string): boolean => {
  const cleaned = utr.trim();
  return /^\d{12}$/.test(cleaned);
};
