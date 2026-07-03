import { Request, Response } from 'express';
import { AcademicClass } from '../models/AcademicClass.model';
import { ClassTemplate } from '../models/ClassTemplate.model';
import { ClassConfig } from '../models/ClassConfig.model';
import { Student } from '../models/Student.model';
import { Enrollment } from '../models/Enrollment.model';

export class ClassController {
    
    async getClasses(req: Request, res: Response): Promise<void> {
        try {
            // Ensure ClassTemplate schema is registered
            void ClassTemplate;

            // Fetch all active classes
            const allClasses = await AcademicClass.find({
                isActive: true
            }).populate('templateId');

            // Filter to only CET classes right now
            const classes = allClasses.filter(cls => {
                const template = cls.templateId as any;
                if (!template) return false;
                const fullString = `${template.grade || ''} ${template.stream || ''} ${template.board || ''}`;
                return /CET/i.test(fullString);
            });

            // Fetch configs for these classes
            const classIds = classes.map(c => c._id);
            const configs = await ClassConfig.find({ classId: { $in: classIds } });

            // Format response
            const result = classes.map(cls => {
                const template = cls.templateId as any;
                const streamPart = template.stream ? ` ${template.stream}` : '';
                const className = `${template.grade}${streamPart} - ${cls.section}`;
                
                const pcmConfig = configs.find(c => c.classId.equals(cls._id) && c.group === 'PCM');
                const pcbConfig = configs.find(c => c.classId.equals(cls._id) && c.group === 'PCB');

                return {
                    id: cls._id,
                    name: className,
                    academicYear: cls.academicYear,
                    pcm: {
                        examCoordinatorCpId: pcmConfig?.examCoordinatorCpId || null
                    },
                    pcb: {
                        examCoordinatorCpId: pcbConfig?.examCoordinatorCpId || null
                    }
                };
            });

            res.json({ classes: result });

        } catch (error: any) {
            console.error('Get Classes Error:', error);
            res.status(500).json({ error: 'Failed to fetch classes' });
        }
    }

    async assignCoordinator(req: Request, res: Response): Promise<void> {
        try {
            const { classId } = req.params;
            const { group, teacherCpId } = req.body;

            if (!group || !['PCM', 'PCB'].includes(group)) {
                res.status(400).json({ error: 'Valid group (PCM or PCB) is required' });
                return;
            }

            const config = await ClassConfig.findOneAndUpdate(
                { classId, group },
                { examCoordinatorCpId: teacherCpId },
                { new: true, upsert: true }
            );

            res.json({ message: 'Coordinator assigned successfully', config });

        } catch (error: any) {
            res.status(500).json({ error: 'Failed to assign coordinator' });
        }
    }

    async getClassStudents(req: Request, res: Response): Promise<void> {
        try {
            const { classId } = req.params;
            const { group } = req.query;

            if (!group || !['PCM', 'PCB'].includes(group as string)) {
                res.status(400).json({ error: 'Valid group (PCM or PCB) is required as a query parameter' });
                return;
            }

            // 1. Fetch ongoing enrollments in this class
            const enrollments = await Enrollment.find({
                academicClassId: classId,
                status: 'ONGOING'
            });

            const studentIds = enrollments.map(e => e.studentId);

            // 2. Fetch eligible CET students belonging to the target bucket
            const students = await Student.find({
                _id: { $in: studentIds },
                status: 'ACTIVE',
                cetBucket: group as 'PCM' | 'PCB',
                whatsappNumber: { $exists: true, $nin: [null, ''] }
            });

            // Return simple student list
            const formattedStudents = students.map(student => ({
                id: student._id,
                admissionNumber: student.admissionNumber,
                name: `${student.firstName} ${student.lastName}`,
                phone: student.phone,
                whatsappNumber: student.whatsappNumber
            }));

            res.json({ students: formattedStudents });

        } catch (error: any) {
            console.error('getClassStudents error:', error);
            res.status(500).json({ error: 'Failed to fetch class students' });
        }
    }
}

export const classController = new ClassController();
