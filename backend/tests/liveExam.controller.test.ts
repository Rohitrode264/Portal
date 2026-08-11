import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import { liveExamController } from '../src/controllers/liveExam.controller';
import { Exam } from '../src/models/Exam.model';
import { ExamSession } from '../src/models/ExamSession.model';
import { Session } from '../src/models/Session.model';
import { sectionService } from '../src/services/section.service';

jest.mock('../src/models/Exam.model');
jest.mock('../src/models/ExamSession.model');
jest.mock('../src/models/Session.model');
jest.mock('../src/services/section.service');

describe('LiveExamController Authorization', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      user: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
    
    // Mock Session updateMany since it's used internally
    (Session.updateMany as any).mockResolvedValue({});
  });

  describe('markAttendance', () => {
    it('should deny a teacher marking attendance for an unauthorized section', async () => {
      req.body = { examId: 'exam123', studentCpId: 'CP999' };
      req.user = { userId: 'teacher1', role: 'TEACHER' };

      (Exam.findById as any).mockResolvedValue({ status: 'LIVE', classId: 'cls1', group: 'PCM' });
      // return a list that does NOT include CP999
      (sectionService.getAllowedStudentCpIds as any).mockResolvedValue(['CP111', 'CP222']);

      await liveExamController.markAttendance(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('Forbidden') }));
    });

    it('should allow a teacher marking attendance for an authorized section', async () => {
      req.body = { examId: 'exam123', studentCpId: 'CP111' };
      req.user = { userId: 'teacher1', role: 'TEACHER' };

      (Exam.findById as any).mockResolvedValue({ status: 'LIVE', classId: 'cls1', group: 'PCM' });
      // includes CP111
      (sectionService.getAllowedStudentCpIds as any).mockResolvedValue(['CP111', 'CP222']);
      (ExamSession.findOne as any).mockResolvedValue({
         status: 'ABSENT', heartbeatLastSeen: new Date(), save: jest.fn()
      });

      await liveExamController.markAttendance(req, res);

      expect(res.status).not.toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
    });

    it('should allow ADMIN to mark attendance for anyone', async () => {
      req.body = { examId: 'exam123', studentCpId: 'CP999' };
      req.user = { userId: 'admin1', role: 'ADMIN' };

      (Exam.findById as any).mockResolvedValue({ status: 'LIVE', classId: 'cls1', group: 'PCM' });
      (sectionService.getAllowedStudentCpIds as any).mockResolvedValue(null); // null means all allowed
      (ExamSession.findOne as any).mockResolvedValue({
         status: 'ABSENT', heartbeatLastSeen: new Date(), save: jest.fn()
      });

      await liveExamController.markAttendance(req, res);

      expect(res.status).not.toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
    });
  });

  describe('releaseAllPresent', () => {
    it('should scope the update query to allowed students for TEACHER', async () => {
      req.params = { id: 'exam123' };
      req.user = { userId: 'teacher1', role: 'TEACHER' };

      (Exam.findById as any).mockResolvedValue({ status: 'LIVE', classId: 'cls1', group: 'PCM' });
      (sectionService.getAllowedStudentCpIds as any).mockResolvedValue(['CP111', 'CP222']);
      
      const updateManyMock = (jest.fn() as any).mockResolvedValue({ modifiedCount: 2 });
      (ExamSession.updateMany as any) = updateManyMock;
      (ExamSession.find as any).mockResolvedValue([]);
      (Exam.findByIdAndUpdate as any).mockResolvedValue({});

      await liveExamController.releaseAllPresent(req, res);

      expect(updateManyMock).toHaveBeenCalledWith(
        expect.objectContaining({ 
           examId: 'exam123', 
           status: 'PRESENT', 
           studentCpId: { $in: ['CP111', 'CP222'] } 
        }),
        expect.any(Object)
      );
    });

    it('should not scope the update query for ADMIN', async () => {
      req.params = { id: 'exam123' };
      req.user = { userId: 'admin1', role: 'ADMIN' };

      (Exam.findById as any).mockResolvedValue({ status: 'LIVE', classId: 'cls1', group: 'PCM' });
      (sectionService.getAllowedStudentCpIds as any).mockResolvedValue(null);
      
      const updateManyMock = (jest.fn() as any).mockResolvedValue({ modifiedCount: 5 });
      (ExamSession.updateMany as any) = updateManyMock;
      (ExamSession.find as any).mockResolvedValue([]);
      (Exam.findByIdAndUpdate as any).mockResolvedValue({});

      await liveExamController.releaseAllPresent(req, res);

      expect(updateManyMock).toHaveBeenCalledWith(
        expect.objectContaining({ 
           examId: 'exam123', 
           status: 'PRESENT'
        }),
        expect.any(Object)
      );
      // Ensure studentCpId is NOT in the filter
      const callArgs: any = updateManyMock.mock.calls[0][0];
      expect(callArgs.studentCpId).toBeUndefined();
    });
  });
  describe('getLiveStatus', () => {
    it('should return only students in the coordinator\'s assigned sections', async () => {
      req.params = { id: 'exam123' };
      req.user = { userId: 'teacherA', role: 'TEACHER' };

      (Exam.findById as any).mockResolvedValue({ status: 'LIVE', classId: 'cls1', group: 'PCM' });

      // Mock sectionService to return Section A (for teacherA) and Section B (for teacherB)
      (sectionService.getSectionsData as any).mockResolvedValue({
        sections: [
          {
            sectionName: 'A',
            coordinatorCpId: 'teacherA',
            students: [
              { admissionNumber: 'CP001', firstName: 'Alice', lastName: 'A', whatsappNumber: '111' }
            ]
          },
          {
            sectionName: 'B',
            coordinatorCpId: 'teacherB', // A different teacher
            students: [
              { admissionNumber: 'CP002', firstName: 'Bob', lastName: 'B', whatsappNumber: '222' }
            ]
          }
        ]
      });

      // Mock existing sessions
      (ExamSession.find as any).mockResolvedValue([
        { studentCpId: 'CP001', status: 'PRESENT' },
        { studentCpId: 'CP002', status: 'IN_PROGRESS' }
      ]);

      await liveExamController.getLiveStatus(req, res);

      // Verify that res.json was called with a roster containing ONLY Alice from Section A
      expect(res.status).not.toHaveBeenCalledWith(403);
      
      const responseRoster = res.json.mock.calls[0][0].roster;
      expect(responseRoster).toHaveLength(1);
      expect(responseRoster[0].studentCpId).toBe('CP001');
      expect(responseRoster[0].name).toContain('Alice');
    });

    it('should forbid access if the teacher coordinates no sections', async () => {
      req.params = { id: 'exam123' };
      req.user = { userId: 'teacherUnassigned', role: 'TEACHER' };

      (Exam.findById as any).mockResolvedValue({ status: 'LIVE', classId: 'cls1', group: 'PCM' });

      (sectionService.getSectionsData as any).mockResolvedValue({
        sections: [
          { sectionName: 'A', coordinatorCpId: 'teacherA', students: [] }
        ]
      });

      await liveExamController.getLiveStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
