import { Request, Response } from 'express';
import { User } from '../models/User.model';
import { authService } from '../services/auth.service';
import { emailService } from '../services/email.service';

export class AssistantController {
    
    // Generate sequential CP ID for assistants
    private async generateAssistantId(): Promise<string> {
        // Find the highest existing CPA ID
        const lastAssistant = await User.findOne({ cpId: /^CPA/ }).sort({ cpId: -1 });
        
        let nextNumber = 1;
        if (lastAssistant && lastAssistant.cpId) {
            const numPart = parseInt(lastAssistant.cpId.replace('CPA', ''), 10);
            if (!isNaN(numPart)) {
                nextNumber = numPart + 1;
            }
        }
        
        // Format as CPA00001
        return `CPA${String(nextNumber).padStart(5, '0')}`;
    }

    async createAssistant(req: Request, res: Response): Promise<void> {
        try {
            const { name, email, phone, designation, password } = req.body;

            if (!name || !email || !password) {
                res.status(400).json({ error: 'Name, email, and password are required.' });
                return;
            }

            // Check email
            const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
            if (existingEmail) {
                res.status(400).json({ error: 'Email already exists.' });
                return;
            }

            const cpId = await this.generateAssistantId();
            const hashedPassword = authService.hashPassword(password);

            const assistant = await User.create({
                cpId,
                email: email.trim().toLowerCase(),
                password: hashedPassword,
                role: 'ASSISTANT',
                name: name.trim(),
                phone: phone?.trim(),
                designation: designation?.trim()
            });

            // Send welcome email with credentials
            const emailSent = await emailService.sendAccountCreationEmail({
                email: email.trim().toLowerCase(),
                name: name.trim(),
                cpId: cpId,
                role: 'ASSISTANT',
                designationOrSubject: designation?.trim(),
                passwordPlain: password
            });

            res.status(201).json({
                message: emailSent 
                    ? 'Assistant created successfully and login credentials sent via email' 
                    : 'Assistant created successfully (Note: Email notification could not be sent)',
                assistant: {
                    cpId: assistant.cpId,
                    name: assistant.name,
                    email: assistant.email,
                    designation: assistant.designation,
                    isActive: assistant.isActive
                },
                emailSent
            });

        } catch (error: any) {
            console.error('Create Assistant Error:', error);
            res.status(500).json({ error: 'Failed to create assistant' });
        }
    }

    async getAssistants(req: Request, res: Response): Promise<void> {
        try {
            const assistants = await User.find({ role: 'ASSISTANT' })
                .select('-password -refreshToken')
                .sort({ createdAt: -1 });
            
            res.json({ assistants });
        } catch (error: any) {
            console.error('Get Assistants Error:', error);
            res.status(500).json({ error: 'Failed to fetch assistants' });
        }
    }

    async updateAssistant(req: Request, res: Response): Promise<void> {
        try {
            const { cpId } = req.params;
            const updates = req.body;
            
            // Prevent changing important fields directly
            delete updates.password;
            delete updates.role;
            delete updates.cpId;
            delete updates.isActive;

            const assistant = await User.findOneAndUpdate(
                { cpId, role: 'ASSISTANT' },
                { $set: updates },
                { new: true, runValidators: true }
            ).select('-password -refreshToken');

            if (!assistant) {
                res.status(404).json({ error: 'Assistant not found' });
                return;
            }

            res.json({ message: 'Assistant updated successfully', assistant });
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to update assistant' });
        }
    }

    async toggleAssistantStatus(req: Request, res: Response): Promise<void> {
        try {
            const { cpId } = req.params;
            
            const assistant = await User.findOne({ cpId, role: 'ASSISTANT' });
            if (!assistant) {
                res.status(404).json({ error: 'Assistant not found' });
                return;
            }

            assistant.isActive = !assistant.isActive;
            await assistant.save();

            res.json({ 
                message: `Assistant ${assistant.isActive ? 'activated' : 'deactivated'} successfully`,
                isActive: assistant.isActive
            });
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to toggle status' });
        }
    }
}

export const assistantController = new AssistantController();
