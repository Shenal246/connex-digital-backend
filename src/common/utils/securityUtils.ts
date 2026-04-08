import crypto from 'node:crypto';

/**
 * Generates an HMAC signature for a given payload using a secret.
 * @param payload The data to be signed (object, string, or null)
 * @param secret The shared secret key
 * @returns HEX string of the HMAC-SHA256 signature
 */
export function generateSignature(payload: any, secret: string): string {
    const data = typeof payload === 'string' 
        ? payload 
        : (payload ? JSON.stringify(payload) : '');
    
    return crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('hex');
}

/**
 * Validates a signature against a payload.
 * @param payload The data to validate
 * @param signature The signature provided in headers
 * @param secret The shared secret key
 * @returns boolean
 */
export function validateSignature(payload: any, signature: string, secret: string): boolean {
    if (!signature) return false;
    const computed = generateSignature(payload, secret);
    
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
        Buffer.from(computed),
        Buffer.from(signature)
    );
}
