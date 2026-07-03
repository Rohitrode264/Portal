import { Request, Response, NextFunction } from 'express';
import { authService, TokenPayload } from '../services/auth.service';
import { Session } from '../models/Session.model';

export interface AuthRequest extends Request {
    user?: TokenPayload;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({ error: 'Token missing' });
        return;
    }

    try {
        const decoded = authService.verifyAccessToken(token);

        // Enforce single active session
        if (decoded.sessionId) {
            const activeSession = await Session.findOne({
                userId: decoded.userId,
                sessionId: decoded.sessionId
            });
            if (!activeSession) {
                res.status(401).json({
                    error: 'SESSION_TERMINATED',
                    message: 'Your account was accessed from another device. You have been logged out.'
                });
                return;
            }
            // Update lastSeen asynchronously
            Session.updateOne({ _id: activeSession._id }, { lastSeen: new Date() }).catch(() => {});
        }

        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired access token' });
        return;
    }
};

export const requireRole = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
            return;
        }

        next();
    };
};
