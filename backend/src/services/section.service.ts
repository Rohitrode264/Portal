import { Types } from "mongoose";
import { ClassConfig } from "../models/ClassConfig.model";
import { Enrollment } from "../models/Enrollment.model";
import { Student } from "../models/Student.model";

export interface SectionData {
    sectionName: string;
    coordinatorCpId: string | null;
    students: any[];
}

export class SectionService {
    async getSectionsData(classId: string | Types.ObjectId, group: 'PCM' | 'PCB') {
        const enrollments = await Enrollment.find({
            academicClassId: classId,
            status: 'ONGOING'
        });

        const studentIds = enrollments.map(e => e.studentId);

        const students = await Student.find({
            _id: { $in: studentIds },
            status: 'ACTIVE',
            cetBucket: group,
            whatsappNumber: { $exists: true, $nin: [null, ''] }
        });

        students.sort((a, b) => a.admissionNumber.localeCompare(b.admissionNumber));

        const config = await ClassConfig.findOne({ classId, group });
        const strength = config?.classStrength || 40;
        const configSections = config?.sections || [];

        const partitionedSections: SectionData[] = [];
        
        for (let i = 0; i < students.length; i += strength) {
            const sectionName = String.fromCharCode(65 + Math.floor(i / strength)); // A, B, C...
            const sectionStudents = students.slice(i, i + strength);

            const coordinatorCpId = configSections.find(s => s.sectionName === sectionName)?.coordinatorCpId || null;

            partitionedSections.push({
                sectionName,
                coordinatorCpId,
                students: sectionStudents
            });
        }
        
        return {
            sections: partitionedSections,
            classStrength: strength,
            configSections
        };
    }

    async getAllowedStudentCpIds(classId: string | Types.ObjectId, group: 'PCM' | 'PCB', userRole: string, userCpId: string): Promise<string[] | null> {
        if (userRole === "ADMIN") {
            return null; // All allowed
        }

        const data = await this.getSectionsData(classId, group);
        const allowedStudentCpIds: string[] = [];

        for (const section of data.sections) {
            if (section.coordinatorCpId === userCpId) {
                allowedStudentCpIds.push(...section.students.map(s => s.admissionNumber));
            }
        }
        
        return allowedStudentCpIds;
    }
}

export const sectionService = new SectionService();
