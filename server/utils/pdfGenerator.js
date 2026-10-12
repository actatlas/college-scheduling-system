/**
 * Pure zero-dependency PDF 1.4 Document Generator for SCSMS Faculty Schedules
 * Generates official institutional faculty loading documents matching SRCB Higher Education Dept layout.
 */

function sanitizeText(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' '); // Standard ASCII printable
}

function sanitizeFilename(str) {
  if (!str) return 'Faculty';
  return String(str)
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
}

/**
 * Builds a valid PDF 1.4 document buffer from faculty schedule details
 */
function buildFacultySchedulePdf(data) {
  const d = data || {};
  const fac = d.faculty || {};
  const facultyName = d.facultyName || fac.name || `${fac.firstName || ''} ${fac.lastName || ''}`.trim() || 'Faculty Member';
  const employeeNumber = d.employeeNumber || fac.employeeNumber || fac.employee_number || '';
  const facultyType = d.facultyType || fac.facultyType || fac.faculty_type || fac.status || 'Full-Time';
  const department = d.department || fac.department || fac.departmentCode || fac.programCode || 'Academic Department';
  const schoolEmail = d.schoolEmail || d.facultyEmail || fac.schoolEmail || fac.email || '';
  const academicYear = d.academicYear || '2026-2027';
  const semester = d.semester || '1st Semester';
  const schedules = d.schedules || [];
  const totalWeeklyHours = d.totalWeeklyHours !== undefined ? d.totalWeeklyHours : (d.summary?.totalWeeklyHours || 0);
  const totalUnits = d.totalUnits !== undefined ? d.totalUnits : (d.summary?.totalUnits || schedules.reduce((acc, s) => acc + (Number(s.units) || 0), 0));
  const customNotes = d.customNotes || '';
  const isUpdated = Boolean(d.isUpdated);

  const width = 612;  // Standard US Letter width (pts)
  const height = 792; // Standard US Letter height (pts)
  const margin = 36;
  const contentWidth = width - (margin * 2);

  // Stream content instructions
  const ops = [];

  // Helper draw functions
  function setFillColor(r, g, b) {
    ops.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
  }

  function setStrokeColor(r, g, b) {
    ops.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`);
  }

  function setLineWidth(w) {
    ops.push(`${w} w`);
  }

  function drawRect(x, y, w, h, fill = true, stroke = false) {
    ops.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
    if (fill && stroke) ops.push('B');
    else if (fill) ops.push('f');
    else if (stroke) ops.push('S');
  }

  function drawLine(x1, y1, x2, y2) {
    ops.push(`${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  }

  function drawText(text, x, y, font = 'F1', size = 10, align = 'left') {
    const clean = sanitizeText(text);
    ops.push('BT');
    ops.push(`/${font} ${size} Tf`);
    if (align === 'center') {
      // Rough center estimation (approx 0.5 * size per char)
      const approxLen = clean.length * size * 0.5;
      ops.push(`${(x - approxLen / 2).toFixed(2)} ${y.toFixed(2)} Td`);
    } else if (align === 'right') {
      const approxLen = clean.length * size * 0.5;
      ops.push(`${(x - approxLen).toFixed(2)} ${y.toFixed(2)} Td`);
    } else {
      ops.push(`${x.toFixed(2)} ${y.toFixed(2)} Td`);
    }
    ops.push(`(${clean}) Tj`);
    ops.push('ET');
  }

  // --- PAGE BACKGROUND & TOP HEADER BANNER ---
  // Navy Header Banner
  setFillColor(0.086, 0.196, 0.412); // SRCB Marian Navy #163269
  drawRect(margin, height - margin - 54, contentWidth, 54, true, false);

  // Gold Accent Strip
  setFillColor(0.855, 0.647, 0.125); // SRCB Gold #daa520
  drawRect(margin, height - margin - 57, contentWidth, 3, true, false);

  // Institution Headers (White Text on Navy)
  setFillColor(1, 1, 1);
  drawText("ST. RITA'S COLLEGE OF BALINGASAG", margin + (contentWidth / 2), height - margin - 20, 'F2', 13, 'center');
  drawText("HIGHER EDUCATION DEPARTMENT  *  BALINGASAG, MISAMIS ORIENTAL", margin + (contentWidth / 2), height - margin - 33, 'F1', 8, 'center');
  drawText("CLASS SCHEDULING MANAGEMENT SYSTEM (SCSMS)", margin + (contentWidth / 2), height - margin - 45, 'F3', 7.5, 'center');

  // Document Title Banner
  const titleY = height - margin - 75;
  setFillColor(0.95, 0.96, 0.98);
  drawRect(margin, titleY - 14, contentWidth, 20, true, false);
  setStrokeColor(0.8, 0.85, 0.9);
  setLineWidth(0.75);
  drawRect(margin, titleY - 14, contentWidth, 20, false, true);

  setFillColor(0.086, 0.196, 0.412);
  const docTitle = isUpdated ? "OFFICIAL FACULTY TEACHING SCHEDULE (UPDATED)" : "OFFICIAL FACULTY TEACHING SCHEDULE";
  drawText(docTitle, margin + 10, titleY - 9, 'F2', 9.5);
  
  setFillColor(0.4, 0.45, 0.5);
  drawText(`ACADEMIC YEAR ${academicYear.toUpperCase()}  *  ${semester.toUpperCase()}`, width - margin - 10, titleY - 9, 'F2', 8.5, 'right');

  // --- FACULTY INFORMATION METADATA CARD ---
  const metaY = titleY - 24;
  const metaH = 48;
  setFillColor(1, 1, 1);
  setStrokeColor(0.82, 0.86, 0.9);
  setLineWidth(0.75);
  drawRect(margin, metaY - metaH, contentWidth, metaH, true, true);

  // Left Column
  setFillColor(0.35, 0.4, 0.48);
  drawText("INSTRUCTOR NAME:", margin + 12, metaY - 15, 'F2', 8);
  setFillColor(0.086, 0.196, 0.412);
  drawText(facultyName.toUpperCase(), margin + 105, metaY - 15, 'F2', 8.5);

  setFillColor(0.35, 0.4, 0.48);
  drawText("EMPLOYEE / ID NO:", margin + 12, metaY - 28, 'F2', 8);
  setFillColor(0.15, 0.2, 0.28);
  drawText(employeeNumber || 'FACULTY-DIR', margin + 105, metaY - 28, 'F1', 8);

  setFillColor(0.35, 0.4, 0.48);
  drawText("FACULTY TYPE:", margin + 12, metaY - 41, 'F2', 8);
  setFillColor(0.05, 0.5, 0.3); // Greenish
  drawText(facultyType.toUpperCase(), margin + 105, metaY - 41, 'F2', 8);

  // Right Column
  const rightColX = margin + (contentWidth / 2) + 10;
  setFillColor(0.35, 0.4, 0.48);
  drawText("PROGRAM / DEPT:", rightColX, metaY - 15, 'F2', 8);
  setFillColor(0.15, 0.2, 0.28);
  drawText(department.toUpperCase(), rightColX + 85, metaY - 15, 'F2', 8);

  setFillColor(0.35, 0.4, 0.48);
  drawText("OFFICIAL EMAIL:", rightColX, metaY - 28, 'F2', 8);
  setFillColor(0.086, 0.35, 0.7);
  drawText(schoolEmail || 'N/A', rightColX + 85, metaY - 28, 'F1', 8);

  setFillColor(0.35, 0.4, 0.48);
  drawText("DISPATCH DATE:", rightColX, metaY - 41, 'F2', 8);
  setFillColor(0.15, 0.2, 0.28);
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  drawText(dateStr, rightColX + 85, metaY - 41, 'F1', 8);

  // --- SCHEDULE TABLE ---
  const tableY = metaY - metaH - 12;
  const headerH = 20;

  // Table Column Definitions
  // Total contentWidth = 540
  const cols = [
    { key: 'num', label: '#', w: 22, align: 'center' },
    { key: 'code', label: 'CODE', w: 60, align: 'left' },
    { key: 'title', label: 'SUBJECT DESCRIPTION', w: 145, align: 'left' },
    { key: 'units', label: 'UNITS', w: 32, align: 'center' },
    { key: 'section', label: 'SECTION', w: 62, align: 'left' },
    { key: 'day', label: 'DAY', w: 60, align: 'left' },
    { key: 'time', label: 'TIME', w: 75, align: 'left' },
    { key: 'room', label: 'ROOM', w: 46, align: 'left' },
    { key: 'mode', label: 'MODE', w: 38, align: 'center' },
  ];

  // Draw Table Header
  setFillColor(0.086, 0.196, 0.412); // Navy
  drawRect(margin, tableY - headerH, contentWidth, headerH, true, false);

  let curX = margin;
  setFillColor(1, 1, 1);
  cols.forEach((col) => {
    const textX = col.align === 'center' ? curX + (col.w / 2) : curX + 4;
    drawText(col.label, textX, tableY - 14, 'F2', 7.5, col.align);
    curX += col.w;
  });

  // Draw Schedule Rows
  let curY = tableY - headerH;
  const rowH = 20;

  if (!schedules || schedules.length === 0) {
    setFillColor(0.98, 0.98, 0.99);
    drawRect(margin, curY - 32, contentWidth, 32, true, true);
    setFillColor(0.5, 0.55, 0.6);
    drawText("No officially scheduled classes found for this faculty member.", margin + (contentWidth / 2), curY - 20, 'F3', 8.5, 'center');
    curY -= 32;
  } else {
    schedules.forEach((item, idx) => {
      const isEven = idx % 2 === 0;
      setFillColor(isEven ? 1 : 0.97, isEven ? 1 : 0.98, isEven ? 1 : 0.99);
      drawRect(margin, curY - rowH, contentWidth, rowH, true, false);

      setStrokeColor(0.88, 0.9, 0.94);
      setLineWidth(0.5);
      drawLine(margin, curY - rowH, margin + contentWidth, curY - rowH);

      let colX = margin;
      const textY = curY - 13.5;

      // 1. Number
      setFillColor(0.45, 0.5, 0.55);
      drawText(String(idx + 1), colX + (cols[0].w / 2), textY, 'F1', 7.5, 'center');
      colX += cols[0].w;

      // 2. Subject Code
      setFillColor(0.086, 0.196, 0.412);
      drawText(item.subject_code || item.subjectCode || 'N/A', colX + 4, textY, 'F2', 7.5);
      colX += cols[1].w;

      // 3. Subject Title (truncated if long)
      let titleStr = String(item.subject_name || item.subject || item.subject_code || '').trim();
      if (titleStr.length > 32) titleStr = titleStr.substring(0, 30) + '...';
      setFillColor(0.15, 0.2, 0.28);
      drawText(titleStr, colX + 4, textY, 'F1', 7.5);
      colX += cols[2].w;

      // 4. Units
      const u = item.units !== undefined ? item.units : 3;
      setFillColor(0.15, 0.2, 0.28);
      drawText(String(u), colX + (cols[3].w / 2), textY, 'F2', 7.5, 'center');
      colX += cols[3].w;

      // 5. Section
      let secStr = String(item.section_name || item.section || item.program_code || '').trim();
      if (secStr.length > 14) secStr = secStr.substring(0, 13) + '..';
      setFillColor(0.15, 0.2, 0.28);
      drawText(secStr, colX + 4, textY, 'F1', 7.5);
      colX += cols[4].w;

      // 6. Day
      setFillColor(0.15, 0.2, 0.28);
      drawText(item.day || 'Monday', colX + 4, textY, 'F2', 7.5);
      colX += cols[5].w;

      // 7. Time
      const timeStr = item.time || `${String(item.start_time || '08:00').slice(0, 5)} - ${String(item.end_time || '09:30').slice(0, 5)}`;
      setFillColor(0.15, 0.2, 0.28);
      drawText(timeStr, colX + 4, textY, 'F1', 7);
      colX += cols[6].w;

      // 8. Room
      let roomStr = String(item.room_number || item.room || 'Room 101').trim();
      if (roomStr.toLowerCase().includes('virtual')) roomStr = 'Online';
      setFillColor(0.15, 0.2, 0.28);
      drawText(roomStr, colX + 4, textY, 'F2', 7.5);
      colX += cols[7].w;

      // 9. Mode (F2F / Online)
      const modeStr = (item.class_mode || item.modality || '').toLowerCase().includes('online') || roomStr === 'Online' ? 'ONL' : 'F2F';
      setFillColor(modeStr === 'ONL' ? 0.05 : 0.086, modeStr === 'ONL' ? 0.5 : 0.196, modeStr === 'ONL' ? 0.3 : 0.412);
      drawText(modeStr, colX + (cols[8].w / 2), textY, 'F2', 7, 'center');

      curY -= rowH;
    });

    // Outer table border
    setStrokeColor(0.75, 0.8, 0.88);
    setLineWidth(0.75);
    drawRect(margin, curY, contentWidth, tableY - curY, false, true);
  }

  // --- TOTALS & WORKLOAD SUMMARY BOX ---
  curY -= 12;
  const sumH = 34;
  setFillColor(0.94, 0.96, 0.99);
  setStrokeColor(0.8, 0.86, 0.94);
  setLineWidth(0.75);
  drawRect(margin, curY - sumH, contentWidth, sumH, true, true);

  setFillColor(0.086, 0.196, 0.412);
  drawText("OFFICIAL WORKLOAD SUMMARY:", margin + 12, curY - 14, 'F2', 8);

  setFillColor(0.2, 0.25, 0.35);
  drawText(`TOTAL ASSIGNED CLASSES: ${schedules.length}`, margin + 12, curY - 26, 'F1', 8);
  drawText(`TOTAL ACADEMIC UNITS: ${totalUnits}`, margin + 175, curY - 26, 'F2', 8);
  drawText(`WEEKLY TEACHING LOAD: ${Number(totalWeeklyHours).toFixed(1)} HOURS / WEEK`, margin + 335, curY - 26, 'F2', 8);

  // Custom Notes if any
  if (customNotes) {
    curY -= sumH + 10;
    setFillColor(0.99, 0.98, 0.95);
    setStrokeColor(0.9, 0.85, 0.7);
    drawRect(margin, curY - 24, contentWidth, 24, true, true);
    setFillColor(0.6, 0.4, 0.1);
    drawText(`SPECIAL ADMINISTRATIVE REMARKS: ${customNotes}`, margin + 8, curY - 15, 'F3', 7.5);
    curY -= 24;
  } else {
    curY -= sumH;
  }

  // --- OFFICIAL CUBICLE ADVISORY FOOTER NOTE ---
  curY -= 14;
  setFillColor(0.96, 0.97, 0.98);
  setStrokeColor(0.85, 0.88, 0.92);
  drawRect(margin, curY - 20, contentWidth, 20, true, true);
  setFillColor(0.35, 0.4, 0.48);
  drawText("NOTE: A physical printed copy of this finalized teaching schedule has been placed in your departmental faculty cubicle for daily classroom reference.", margin + (contentWidth / 2), curY - 13, 'F3', 7, 'center');

  // --- SIGNATURES & INSTITUTIONAL ATTESTATION ---
  const sigY = margin + 50;
  const sigColW = (contentWidth - 40) / 3;

  // Signatory 1: Prepared By
  setStrokeColor(0.3, 0.35, 0.45);
  setLineWidth(0.75);
  drawLine(margin, sigY, margin + sigColW, sigY);
  setFillColor(0.1, 0.15, 0.25);
  drawText("DEAN OF STUDENT AFFAIRS", margin + (sigColW / 2), sigY - 11, 'F2', 7.5, 'center');
  setFillColor(0.4, 0.45, 0.55);
  drawText("Academic Scheduling Authority", margin + (sigColW / 2), sigY - 20, 'F1', 6.5, 'center');

  // Signatory 2: Verified By
  const sig2X = margin + sigColW + 20;
  drawLine(sig2X, sigY, sig2X + sigColW, sigY);
  setFillColor(0.1, 0.15, 0.25);
  drawText("ACADEMIC PROGRAM HEAD", sig2X + (sigColW / 2), sigY - 11, 'F2', 7.5, 'center');
  setFillColor(0.4, 0.45, 0.55);
  drawText("Departmental Verification", sig2X + (sigColW / 2), sigY - 20, 'F1', 6.5, 'center');

  // Signatory 3: Received By
  const sig3X = sig2X + sigColW + 20;
  drawLine(sig3X, sigY, sig3X + sigColW, sigY);
  setFillColor(0.1, 0.15, 0.25);
  drawText(facultyName.toUpperCase(), sig3X + (sigColW / 2), sigY - 11, 'F2', 7.5, 'center');
  setFillColor(0.4, 0.45, 0.55);
  drawText("Faculty Instructor Signature / Date", sig3X + (sigColW / 2), sigY - 20, 'F1', 6.5, 'center');

  // Page Footer Timestamp
  setFillColor(0.6, 0.65, 0.7);
  drawText(`Document ID: SCSMS-FS-${sanitizeFilename(facultyName)}-${Date.now()}  *  St. Rita's College of Balingasag`, margin, margin + 8, 'F1', 6.5);
  drawText("Page 1 of 1", width - margin, margin + 8, 'F1', 6.5, 'right');

  // --- ASSEMBLE PDF STREAM AND OBJECTS ---
  const streamContent = ops.join('\n');
  const streamLength = Buffer.byteLength(streamContent, 'utf-8');

  const objects = [];

  // Obj 1: Catalog
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Obj 2: Pages
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  // Obj 3: Page
  objects.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents 7 0 R >>\nendobj\n'
  );

  // Obj 4: Font F1 (Helvetica Regular)
  objects.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n');

  // Obj 5: Font F2 (Helvetica-Bold)
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n');

  // Obj 6: Font F3 (Helvetica-Oblique)
  objects.push('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>\nendobj\n');

  // Obj 7: Content Stream
  objects.push(`7 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`);

  // Build complete PDF Buffer with XRef
  let header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  let offset = Buffer.byteLength(header, 'binary');
  const xrefOffsets = [0];

  let body = '';
  for (const obj of objects) {
    xrefOffsets.push(offset);
    body += obj;
    offset += Buffer.byteLength(obj, 'binary');
  }

  const startXref = offset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    const o = String(xrefOffsets[i]).padStart(10, '0');
    xref += `${o} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  const finalPdfBuffer = Buffer.from(header + body + xref + trailer, 'binary');
  const filename = `Faculty_Schedule_${sanitizeFilename(facultyName)}_${sanitizeFilename(academicYear)}_${sanitizeFilename(semester)}.pdf`;

  return {
    buffer: finalPdfBuffer,
    filename,
    contentType: 'application/pdf',
    sizeBytes: finalPdfBuffer.length,
  };
}

module.exports = {
  buildFacultySchedulePdf,
  sanitizeFilename,
};
