import { Request, Response } from 'express';
import { User } from '../models/User.model';
import { Counter } from '../models/Counter.model';
import { authService } from '../services/auth.service';

export class SetupController {
    async createFirstAdmin(req: Request, res: Response): Promise<void> {
        try {
            // Check if any admin exists
            const adminCount = await User.countDocuments({ role: 'ADMIN' });
            if (adminCount > 0) {
                res.status(403).json({ error: 'Admin already exists. Setup route is disabled.' });
                return;
            }

            const { password, name, phone, email } = req.body;

            if (!password || !name) {
                res.status(400).json({ error: 'Password and Name are required.' });
                return;
            }

            // Generate Sequential CPA ID
            const counter = await Counter.findByIdAndUpdate(
                'portal_admin',
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            const cpId = `CPA${String(counter.seq).padStart(5, '0')}`;

            const admin = await User.create({
                cpId,
                email,
                name,
                phone,
                role: 'ADMIN',
                password: authService.hashPassword(password)
            });

            res.status(201).json({
                message: 'First admin created successfully',
                data: {
                    cpId: admin.cpId,
                    name: admin.name,
                    role: admin.role
                }
            });
        } catch (error: any) {
            console.error('Setup Error:', error);
            res.status(500).json({ error: error.message || 'Internal server error' });
        }
    }
}

export const setupController = new SetupController();
