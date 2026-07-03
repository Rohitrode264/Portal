import { Request, Response } from 'express';
import { User, UserRole, SubjectType } from '../models/User.model';
import { authService } from '../services/auth.service';
import { emailService } from '../services/email.service';

export class TeacherController {
    
    // Generate sequential CP ID for teachers
    private async generateTeacherId(): Promise<string> {
        // Find the highest existing CPT ID
        const lastTeacher = await User.findOne({ cpId: /^CPT/ }).sort({ cpId: -1 });
        
        let nextNumber = 1;
        if (lastTeacher && lastTeacher.cpId) {
            const numPart = parseInt(lastTeacher.cpId.replace('CPT', ''), 10);
            if (!isNaN(numPart)) {
                nextNumber = numPart + 1;
            }
        }
        
        // Format as CPT00001
        return `CPT${String(nextNumber).padStart(5, '0')}`;
    }

    async createTeacher(req: Request, res: Response): Promise<void> {
        try {
            const { name, email, phone, subject, designation, password } = req.body;

            if (!name || !email || !password || !subject) {
                res.status(400).json({ error: 'Name, email, password, and subject are required.' });
                return;
            }

            // Check email
            const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
            if (existingEmail) {
                res.status(400).json({ error: 'Email already exists.' });
                return;
            }

            const cpId = await this.generateTeacherId();
            const hashedPassword = authService.hashPassword(password);

            const teacher = await User.create({
                cpId,
                email: email.trim().toLowerCase(),
                password: hashedPassword,
                role: 'TEACHER',
                name: name.trim(),
                phone: phone?.trim(),
                subject,
                designation: designation?.trim()
            });

            // Send welcome email with credentials
            const emailSent = await emailService.sendAccountCreationEmail({
                email: email.trim().toLowerCase(),
                name: name.trim(),
                cpId: cpId,
                role: 'TEACHER',
                designationOrSubject: subject || designation?.trim(),
                passwordPlain: password
            });

            res.status(201).json({
                message: emailSent 
                    ? 'Teacher created successfully and login credentials sent via email' 
                    : 'Teacher created successfully (Note: Email notification could not be sent)',
                teacher: {
                    cpId: teacher.cpId,
                    name: teacher.name,
                    email: teacher.email,
                    subject: teacher.subject,
                    designation: teacher.designation,
                    isActive: teacher.isActive
                },
                emailSent
            });

        } catch (error: any) {
            console.error('Create Teacher Error:', error);
            res.status(500).json({ error: 'Failed to create teacher' });
        }
    }

    async getTeachers(req: Request, res: Response): Promise<void> {
        try {
            const teachers = await User.find({ role: 'TEACHER' })
                .select('-password -refreshToken')
                .sort({ createdAt: -1 });
            
            res.json({ teachers });
        } catch (error: any) {
            console.error('Get Teachers Error:', error);
            res.status(500).json({ error: 'Failed to fetch teachers' });
        }
    }

    async updateTeacher(req: Request, res: Response): Promise<void> {
        try {
            const { cpId } = req.params;
            const updates = req.body;
            
            // Prevent changing important fields directly
            delete updates.password;
            delete updates.role;
            delete updates.cpId;

            const teacher = await User.findOneAndUpdate(
                { cpId, role: 'TEACHER' },
                { $set: updates },
                { new: true, runValidators: true }
            ).select('-password -refreshToken');

            if (!teacher) {
                res.status(404).json({ error: 'Teacher not found' });
                return;
            }

            res.json({ message: 'Teacher updated successfully', teacher });
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to update teacher' });
        }
    }

    async toggleTeacherStatus(req: Request, res: Response): Promise<void> {
        try {
            const { cpId } = req.params;
            
            const teacher = await User.findOne({ cpId, role: 'TEACHER' });
            if (!teacher) {
                res.status(404).json({ error: 'Teacher not found' });
                return;
            }

            teacher.isActive = !teacher.isActive;
            await teacher.save();

            res.json({ 
                message: `Teacher ${teacher.isActive ? 'activated' : 'deactivated'} successfully`,
                isActive: teacher.isActive
            });
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to toggle status' });
        }
    }

    async getStaff(req: Request, res: Response): Promise<void> {
        try {
            const staff = await User.find({ 
                role: { $in: ['ADMIN', 'TEACHER', 'ASSISTANT'] },
                isActive: true
            })
            .select('cpId name role subject designation')
            .sort({ name: 1 });
            
            res.json({ staff });
        } catch (error: any) {
            console.error('Get Staff Error:', error);
            res.status(500).json({ error: 'Failed to fetch staff' });
        }
    }
}

export const teacherController = new TeacherController();
