import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface TokenPayload {
    userId: string;
    role: string;
    sessionId: string;
}

// OTP resend backoff windows in milliseconds
const RESEND_BACKOFF_MS = [
    0,           // 1st send: immediate
    60_000,      // 1st resend: 60 seconds
    5 * 60_000,  // 2nd resend: 5 minutes
    30 * 60_000, // 3rd resend: 30 minutes
];
const OTP_RATE_LIMIT_MS = 10 * 60_000; // 10 minutes between fresh sends

export class AuthService {
    private accessSecret: string;
    private refreshSecret: string;
    private accessExpiresIn: string;
    private refreshExpiresIn: string;

    constructor() {
        this.accessSecret = process.env.JWT_SECRET || 'portal-access-secret';
        this.refreshSecret = process.env.JWT_REFRESH_SECRET || 'portal-refresh-secret';
        this.accessExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
        this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
    }

    generateSessionId(): string {
        return crypto.randomUUID();
    }

    generateAccessToken(payload: TokenPayload): string {
        return jwt.sign(payload, this.accessSecret, { expiresIn: this.accessExpiresIn as any });
    }

    generateRefreshToken(payload: Pick<TokenPayload, 'userId' | 'role'>): string {
        return jwt.sign(payload, this.refreshSecret, { expiresIn: this.refreshExpiresIn as any });
    }

    verifyAccessToken(token: string): TokenPayload {
        return jwt.verify(token, this.accessSecret) as TokenPayload;
    }

    verifyRefreshToken(token: string): Pick<TokenPayload, 'userId' | 'role'> {
        return jwt.verify(token, this.refreshSecret) as Pick<TokenPayload, 'userId' | 'role'>;
    }

    generateOtp(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    hashPassword(password: string): string {
        return crypto.createHash('sha256').update(password).digest('hex');
    }

    verifyPassword(password: string, hash: string): boolean {
        return this.hashPassword(password) === hash;
    }

    /**
     * Checks if a new OTP can be sent.
     * Returns { canSend: true } or { canSend: false, waitMs: number, waitLabel: string }
     */
    checkOtpRateLimit(lastSentAt: Date | null, resendCount: number): 
        { canSend: true } | { canSend: false; waitMs: number; waitLabel: string } {
        
        if (!lastSentAt) return { canSend: true };

        const elapsed = Date.now() - lastSentAt.getTime();

        // For fresh (first) sends after rate limit window
        if (resendCount === 0 && elapsed < OTP_RATE_LIMIT_MS) {
            const waitMs = OTP_RATE_LIMIT_MS - elapsed;
            return { canSend: false, waitMs, waitLabel: this.formatWait(waitMs) };
        }

        // Progressive backoff for resends
        const backoffIndex = Math.min(resendCount, RESEND_BACKOFF_MS.length - 1);
        const required = RESEND_BACKOFF_MS[backoffIndex];

        if (elapsed < required) {
            const waitMs = required - elapsed;
            return { canSend: false, waitMs, waitLabel: this.formatWait(waitMs) };
        }

        return { canSend: true };
    }

    private formatWait(ms: number): string {
        const secs = Math.ceil(ms / 1000);
        if (secs < 60) return `${secs} seconds`;
        const mins = Math.ceil(secs / 60);
        return `${mins} minute${mins > 1 ? 's' : ''}`;
    }
}

export const authService = new AuthService();
