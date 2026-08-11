import { Request, Response } from 'express';
import * as ExcelJS from 'exceljs';
import { AcademicClass } from '../models/AcademicClass.model';
import { ClassTemplate } from '../models/ClassTemplate.model';
import { ClassConfig } from '../models/ClassConfig.model';
import { Student } from '../models/Student.model';
import { Enrollment } from '../models/Enrollment.model';
import { sectionService } from '../services/section.service';

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

            const data = await sectionService.getSectionsData(classId as string, group as 'PCM' | 'PCB');
            
            const partitionedSections = data.sections.map(sec => ({
                sectionName: sec.sectionName,
                coordinatorCpId: sec.coordinatorCpId,
                students: sec.students.map(student => ({
                    id: student._id,
                    admissionNumber: student.admissionNumber,
                    name: `${student.firstName} ${student.lastName}`,
                    phone: student.phone,
                    whatsappNumber: student.whatsappNumber
                }))
            }));
            const strength = data.classStrength;

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

    async exportClassExcel(req: Request, res: Response): Promise<void> {
        try {
            const { classId } = req.params;

            const academicClass = await AcademicClass.findById(classId).populate('templateId');
            if (!academicClass) {
                res.status(404).json({ error: 'Class not found' });
                return;
            }

            let className = 'Class';
            const template = academicClass.templateId as any;
            if (template) {
                className = `${template.grade}${template.stream ? `_${template.stream}` : ''}_${template.board}`;
            }

            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Admin Portal';
            workbook.created = new Date();

            const { group, sectionName } = req.query;

            let groups: ('PCM' | 'PCB')[] = ['PCM', 'PCB'];
            if (group === 'PCM' || group === 'PCB') {
                groups = [group];
            }

            for (const grp of groups) {
                const data = await sectionService.getSectionsData(classId as string, grp);
                
                let filteredSections = data.sections;
                if (sectionName) {
                    filteredSections = filteredSections.filter(s => s.sectionName === sectionName);
                }
                
                if (filteredSections.length === 0) continue;

                const worksheet = workbook.addWorksheet(
                    sectionName ? `${grp} Sec ${sectionName}` : `${grp} Group`
                );
                worksheet.columns = [
                    { header: 'Admission Number (CPID)', key: 'cpid', width: 25 },
                    { header: 'Student Name', key: 'name', width: 30 },
                    { header: 'WhatsApp', key: 'whatsapp', width: 15 }
                ];

                worksheet.getRow(1).font = { bold: true };
                worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

                for (const section of filteredSections) {
                    for (const student of section.students) {
                        worksheet.addRow({
                            cpid: student.admissionNumber,
                            name: `${student.firstName} ${student.lastName}`,
                            whatsapp: student.whatsappNumber || ''
                        });
                    }
                }
            }

            if (workbook.worksheets.length === 0) {
                workbook.addWorksheet('Empty');
            }

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${className}_Students.xlsx"`);

            await workbook.xlsx.write(res);
            res.end();

        } catch (error: any) {
            console.error('exportClassExcel error:', error);
            res.status(500).json({ error: 'Failed to export class excel' });
        }
    }
}

export const classController = new ClassController();
