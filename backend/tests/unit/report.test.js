const mongoService = require('../../services/mongoService');

const base = { attendance: [], agendas: [], minutes: [], qhls: [] };

describe('generateReport', () => {
  test('splits present and leave attendees, with leave reasons', () => {
    const report = mongoService.generateReport({
      ...base,
      attendance: [
        { name: 'A', status: 'present' },
        { name: 'B', status: 'leave', reason: 'Sick' },
        { name: 'C', status: 'leave', leaveNotInformed: true },
        { name: 'D', status: 'absent' },
      ],
    });
    expect(report.attendees).toBe('A');
    expect(report.leaveAayavar).toBe('1. B (Sick)\n2. C (ലീവ് അറിയിച്ചിട്ടില്ല)');
  });

  test('numbers agendas and minutes, with fallbacks when empty', () => {
    const report = mongoService.generateReport({ ...base, agendas: ['X', 'Y'], minutes: ['M'] });
    expect(report.agenda).toBe('1. X\n2. Y');
    expect(report.minutes).toBe('1. M');

    const empty = mongoService.generateReport(base);
    expect(empty.agenda).toBe('അജണ്ടകളില്ല');
    expect(empty.minutes).toBe('തീരുമാനങ്ങളില്ല');
  });

  test('status rows print unit and status, leaving out QHLS ഇല്ല units', () => {
    const report = mongoService.generateReport({
      ...base,
      qhls: [
        { unit: 'Unit A', status: 'nadannu' },
        { unit: 'Unit B', status: 'nadannittilla' },
        { unit: 'Unit C', status: 'illa' },
      ],
    });
    expect(report.qhlsStatus).toBe('യൂണിറ്റ്, സ്റ്റാറ്റസ്\nUnit A, നടന്നു\nUnit B, നടന്നിട്ടില്ല');
  });

  test('older rows without status print the full detail line, skipping empty counts', () => {
    const report = mongoService.generateReport({
      ...base,
      qhls: [
        { unit: 'Unit A', day: 'Mon', faculty: 'F', facultyMobile: '1', syllabus: 'S', location: 'L', afterRamadhan: 'yes', male: 3, female: 2 },
        { unit: 'Unit B', male: 0, female: 0 },
      ],
    });
    const lines = report.qhlsStatus.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('Unit A, Mon, F, 1, S, L, ഉണ്ട്, 3, 2');
  });

  test('no QHLS rows gives an empty section', () => {
    expect(mongoService.generateReport(base).qhlsStatus).toBe('');
  });
});
