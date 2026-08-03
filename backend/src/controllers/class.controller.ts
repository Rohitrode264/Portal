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
                        classStrength: pcmConfig?.classStrength || 40,
                        sections: pcmConfig?.sections || []
                    },
                    pcb: {
                        classStrength: pcbConfig?.classStrength || 40,
                        sections: pcbConfig?.sections || []
                    }
                };
            });

            res.json({ classes: result });

        } catch (error: any) {
            console.error('Get Classes Error:', error);
            res.status(500).json({ error: 'Failed to fetch classes' });
        }
    }

    async updateClassConfig(req: Request, res: Response): Promise<void> {
        try {
            const { classId } = req.params;
            const { group, classStrength, sectionName, coordinatorCpId } = req.body;

            if (!group || !['PCM', 'PCB'].includes(group)) {
                res.status(400).json({ error: 'Valid group (PCM or PCB) is required' });
                return;
            }

            let config = await ClassConfig.findOne({ classId, group });
            
            if (!config) {
                config = new ClassConfig({ classId, group, classStrength: classStrength || 40, sections: [] });
            }

            if (classStrength !== undefined) {
                config.classStrength = classStrength;
            }

            if (sectionName) {
                const existingSectionIndex = config.sections.findIndex(s => s.sectionName === sectionName);
                if (existingSectionIndex !== -1) {
                    if (coordinatorCpId) {
                        config.sections[existingSectionIndex].coordinatorCpId = coordinatorCpId;
                    } else {
                        // If coordinator is null/empty, we can remove or set it to null. 
                        // Mongoose handles undefined/null well, but let's just clear it.
                        (config.sections[existingSectionIndex] as any).coordinatorCpId = undefined;
                    }
                } else if (coordinatorCpId) {
                    config.sections.push({ sectionName, coordinatorCpId });
                }
            }

            await config.save();

            res.json({ message: 'Configuration updated successfully', config });

        } catch (error: any) {
            console.error('updateClassConfig error:', error);
            res.status(500).json({ error: 'Failed to update class configuration' });
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

            // 3. Sort students deterministically (e.g., by admissionNumber)
            students.sort((a, b) => a.admissionNumber.localeCompare(b.admissionNumber));

            // 4. Partition based on ClassStrength
            const config = await ClassConfig.findOne({ classId, group: group as 'PCM' | 'PCB' });
            const strength = config?.classStrength || 40;
            const configSections = config?.sections || [];

            const partitionedSections: any[] = [];
            
            for (let i = 0; i < students.length; i += strength) {
                const sectionName = String.fromCharCode(65 + Math.floor(i / strength)); // A, B, C...
                const sectionStudents = students.slice(i, i + strength).map(student => ({
                    id: student._id,
                    admissionNumber: student.admissionNumber,
                    name: `${student.firstName} ${student.lastName}`,
                    phone: student.phone,
                    whatsappNumber: student.whatsappNumber
                }));

                const coordinatorCpId = configSections.find(s => s.sectionName === sectionName)?.coordinatorCpId || null;

                partitionedSections.push({
                    sectionName,
                    coordinatorCpId,
                    students: sectionStudents
                });
            }

            const academicClass = await AcademicClass.findById(classId).populate('templateId');
            let className = 'Unknown Class';
            let academicYear = '';
            if (academicClass) {
                const template = academicClass.templateId;
                className = template ? `${template.grade}${template.stream ? ` (${template.stream})` : ''} — ${template.board}` : 'Unknown Class';
                academicYear = academicClass.academicYear || '';
            }

            res.json({ 
                sections: partitionedSections, 
                classStrength: strength,
                className,
                academicYear
            });

        } catch (error: any) {
            console.error('getClassStudents error:', error);
            res.status(500).json({ error: 'Failed to fetch class students' });
        }
    }
}

export const classController = new ClassController();
