import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { FacultySchedulesPage } from '../FacultySchedulesPage';
import { ProgramProvider } from '../../contexts/ProgramContext';
import { ToastProvider } from '../../components/common/Toast';
import { api } from '../../data/apiClient';

vi.mock('../../data/apiClient', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../utils/alerts', () => ({
  showSuccessAlert: vi.fn(),
  showErrorAlert: vi.fn(),
  showWarningAlert: vi.fn(),
  showConfirmDialog: vi.fn().mockResolvedValue(true),
  alerts: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    confirm: vi.fn().mockResolvedValue(true),
  },
}));

describe('FacultySchedulesPage Component Suite', () => {
  const mockFacultyData = [
    {
      faculty: {
        id: 'T-ED-001',
        name: 'Mr. Oclarit',
        employeeNumber: 'EMP-TEP-101',
        email: 'oclarit@srcb.edu.ph',
        schoolEmail: 'oclarit@srcb.edu.ph',
        facultyType: 'Full-Time',
        status: 'Full-Time',
        department: 'Teacher Education Program',
        programCode: 'TEP',
        hasValidEmail: true,
        emailStatus: 'READY',
      },
      schedules: [
        {
          id: '101',
          subjectCode: 'LIT 1',
          subjectName: 'Children and Adolescent Literature',
          units: 3,
          lectureHours: 3,
          labHours: 0,
          section: 'BSED 2-A',
          programCode: 'TEP',
          yearLevel: '2nd Year',
          day: 'Monday',
          startTime: '09:00:00',
          endTime: '10:30:00',
          time: '09:00 - 10:30',
          room: 'Room 303',
          mode: 'Face-to-Face',
          status: 'PUBLISHED',
          durationHours: '1.5',
        },
      ],
      summary: {
        totalClasses: 1,
        totalUnits: 3,
        totalWeeklyHours: 1.5,
        dispatchStatus: 'READY',
        lastSentAt: null,
        resendCount: 0,
        errorMessage: null,
      },
      academicTerm: 'AY 2026-2027 · 1st Semester',
      academicYear: '2026-2027',
      semester: '1st Semester',
    },
    {
      faculty: {
        id: 'T-HM-001',
        name: 'Chef Gordon Ramsay',
        employeeNumber: 'EMP-HM-101',
        email: '',
        schoolEmail: '',
        facultyType: 'Part-Time',
        status: 'Part-Time',
        department: 'Hospitality Management Program',
        programCode: 'HMP',
        hasValidEmail: false,
        emailStatus: 'MISSING_EMAIL',
      },
      schedules: [],
      summary: {
        totalClasses: 0,
        totalUnits: 0,
        totalWeeklyHours: 0,
        dispatchStatus: 'MISSING_EMAIL',
        lastSentAt: null,
        resendCount: 0,
        errorMessage: 'Faculty member does not have an official school email.',
      },
      academicTerm: 'AY 2026-2027 · 1st Semester',
      academicYear: '2026-2027',
      semester: '1st Semester',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('userRole', 'admin');
    localStorage.setItem('userName', 'Dean of Student Affairs');

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.startsWith('/faculty-dispatch')) {
        return Promise.resolve({ data: { success: true, data: mockFacultyData } });
      }
      if (url.startsWith('/programs')) {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              { id: 1, code: 'TEP', name: 'Teacher Education Program' },
              { id: 2, code: 'HMP', name: 'Hospitality Management Program' },
            ],
          },
        });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    vi.mocked(api.post).mockResolvedValue({
      data: { success: true, data: { sentCount: 1, failedCount: 0, missingEmailCount: 1 } },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('1. Renders the Faculty Schedules page with stats cards and table', async () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <ProgramProvider>
            <FacultySchedulesPage />
          </ProgramProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    expect(screen.getByText(/Faculty Schedules & Workload Loading/i)).toBeInTheDocument();

    expect(await screen.findByText('Mr. Oclarit')).toBeInTheDocument();
    expect(screen.getByText('Chef Gordon Ramsay')).toBeInTheDocument();
    expect(screen.getByText('oclarit@srcb.edu.ph')).toBeInTheDocument();

    // Check stats
    expect(screen.getByText('Assigned Faculty')).toBeInTheDocument();
    expect(screen.getAllByText(/Missing School Email/i).length).toBeGreaterThan(0);
  });

  it('2. Displays missing official email warning banner', async () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <ProgramProvider>
            <FacultySchedulesPage />
          </ProgramProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/faculty member\(s\) do not have an official school email address/i)).toBeInTheDocument();
  });

  it('3. Opens Review Schedule modal on clicking Review button', async () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <ProgramProvider>
            <FacultySchedulesPage />
          </ProgramProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    expect(await screen.findByText('Mr. Oclarit')).toBeInTheDocument();

    const reviewButtons = await screen.findAllByRole('button', { name: /Review/i });
    fireEvent.click(reviewButtons[0]);

    expect(await screen.findByTestId('faculty-review-modal')).toBeInTheDocument();
    expect(screen.getByText(/Official Faculty Teaching Schedule/i)).toBeInTheDocument();
    expect(screen.getByText('Children and Adolescent Literature')).toBeInTheDocument();
    expect(screen.getByText('Room 303')).toBeInTheDocument();
  });

  it('4. Renders Publish & Send to Faculty button for Admin role', async () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <ProgramProvider>
            <FacultySchedulesPage />
          </ProgramProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('publish-and-send-btn')).toBeInTheDocument();
    });

    const publishBtn = screen.getByTestId('publish-and-send-btn');
    expect(publishBtn).toBeInTheDocument();
    expect(publishBtn).toHaveTextContent(/Publish & Send to Faculty/i);
  });
});
