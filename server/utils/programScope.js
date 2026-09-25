const PROGRAM_FAMILIES = {
  IT: {
    family: 'IT',
    primaryProgram: 'ITP',
    aliases: ['ITP', 'BSIT', 'BSCS', 'IT', 'INFORMATION TECHNOLOGY', 'COMPUTER SCIENCE', 'COMPUTER'],
    name: 'Information Technology Program',
  },
  BUS: {
    family: 'BUS',
    primaryProgram: 'BAP',
    aliases: ['BAP', 'BSA', 'BSBA', 'BA', 'ACT', 'ACCOUNTANCY', 'BUSINESS ADMINISTRATION', 'BUSINESS'],
    name: 'Business Administration Program',
  },
  CRIM: {
    family: 'CRIM',
    primaryProgram: 'CJEP',
    aliases: ['CJEP', 'BSCRIM', 'CRIM', 'CRIMINOLOGY', 'CRIMINAL JUSTICE', 'LAW ENFORCEMENT'],
    name: 'Criminal Justice Education Program',
  },
  HM: {
    family: 'HM',
    primaryProgram: 'HMP',
    aliases: ['HMP', 'BSHM', 'HM', 'HOSPITALITY MANAGEMENT', 'HOSPITALITY', 'HOTEL AND RESTAURANT', 'HOTEL', 'TOURISM'],
    name: 'Hospitality Management Program',
  },
  EDUC: {
    family: 'EDUC',
    primaryProgram: 'TEP',
    aliases: ['TEP', 'BSED', 'BEED', 'EDUC', 'EDUCATION', 'TEACHER EDUCATION', 'TEACHER'],
    name: 'Teacher Education Program',
  },
};

function getProgramFamily(progStr) {
  if (!progStr) return '';
  const s = String(progStr).toUpperCase().trim();
  if (['ALL', 'GEN', 'GENED', 'GENERAL EDUCATION', 'UNIVERSAL'].includes(s)) return 'GENED';

  // 1. Exact alias match
  for (const fam of Object.values(PROGRAM_FAMILIES)) {
    if (fam.aliases.includes(s)) {
      return fam.family;
    }
  }

  // 2. Multi-word or prefixed description matching
  for (const fam of Object.values(PROGRAM_FAMILIES)) {
    for (const alias of fam.aliases) {
      if (alias.length >= 3 && (s === alias || s.startsWith(alias) || (s.length >= 3 && alias.startsWith(s)))) {
        return fam.family;
      }
      if (alias.length >= 4 && s.includes(alias)) {
        return fam.family;
      }
    }
  }
  return s;
}

function isProgramMatch(progA, progB) {
  if (!progA || !progB) return false;
  const a = String(progA).toUpperCase().trim();
  const b = String(progB).toUpperCase().trim();
  if (!a || !b) return false;
  if (a === 'ALL' || b === 'ALL') return false;
  if (a === b) return true;
  const famA = getProgramFamily(a);
  const famB = getProgramFamily(b);
  if (!famA || !famB || famA === 'GENED' || famB === 'GENED') return false;
  return famA === famB;
}

function resolveUserProgramScope(user) {
  const role = String(user?.role || '').toLowerCase();
  if (role !== 'program_head') {
    return {
      isProgramHead: false,
      assignedProgram: null,
      primaryProgram: null,
      allowedProgramCodes: [],
      programFamily: null,
    };
  }

  let assignedProg = user?.program || user?.programCode || (Array.isArray(user?.programs) ? user.programs[0] : null) || null;
  const cleanProg = String(assignedProg || 'ITP').trim();
  const familyKey = getProgramFamily(cleanProg);
  const familyObj = PROGRAM_FAMILIES[familyKey];

  let allowedCodes = [cleanProg];
  let primaryProg = cleanProg;

  if (familyObj) {
    primaryProg = familyObj.primaryProgram;
    allowedCodes = [...new Set([cleanProg, primaryProg, ...familyObj.aliases])];
  }

  return {
    isProgramHead: true,
    assignedProgram: cleanProg,
    primaryProgram: primaryProg,
    allowedProgramCodes: allowedCodes,
    programFamily: familyKey,
  };
}

const GENED_SUBJECT_CODES = new Set([
  'GE1', 'GE2', 'GE3', 'GE4', 'GE5', 'GE6', 'GE7', 'GE8', 'GE9',
  'NSTP1', 'NSTP2', 'PATHFIT1', 'PATHFIT2', 'PATHFIT3', 'PATHFIT4',
  'RELED1', 'RELED2', 'RELED3', 'RELED4', 'ETHICS', 'PURPCOM', 'UTS', 'MMW', 'ARTAPP', 'TCW', 'RPH', 'STS', 'LWR'
]);

function isGeneralEducationSubject(code, programCode) {
  if (!code) return false;
  const cleanCode = String(code).toUpperCase().replace(/[\s-_]/g, '');
  const cleanProg = String(programCode || '').toUpperCase().trim();
  if (['ALL', 'GEN', 'GENED', 'GENERAL EDUCATION', 'UNIVERSAL'].includes(cleanProg)) return true;
  return GENED_SUBJECT_CODES.has(cleanCode) || /^GE\d+/i.test(cleanCode) || /^PATHFIT/i.test(cleanCode) || /^NSTP/i.test(cleanCode) || /^RELED/i.test(cleanCode);
}

module.exports = {
  PROGRAM_FAMILIES,
  getProgramFamily,
  isProgramMatch,
  isGeneralEducationSubject,
  resolveUserProgramScope,
};
