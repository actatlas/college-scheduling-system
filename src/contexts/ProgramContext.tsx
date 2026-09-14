import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { storage } from "../data/storage";
import { api } from "../data/apiClient";

export type ProgramKey = string;

export type ProgramOption = {
  key: ProgramKey;
  label: string;
  shortLabel: string;
};

type ProgramContextValue = {
  selectedProgramKey: ProgramKey;
  selectedProgram: ProgramOption;
  setSelectedProgramKey: (value: ProgramKey) => void;
  programOptions: ProgramOption[];
  matchesProgram: (programs?: string[] | string | null) => boolean;
};

const ProgramContext = createContext<ProgramContextValue | undefined>(
  undefined,
);

export const allProgramsOption: ProgramOption = {
  key: "ALL",
  label: "All Academic Programs",
  shortLabel: "All Programs",
};

const IT_KEYS = ["ITP", "BSIT", "BSCS", "IT", "INFORMATION TECHNOLOGY", "COMPUTER"];
const CRIM_KEYS = ["CJEP", "BSCRIM", "CRIMINOLOGY", "CRIM", "CRIMINAL JUSTICE"];
const BUS_KEYS = ["BAP", "BSA", "BSBA", "BUSINESS", "ACCOUNTANCY", "ADMINISTRATION"];
const HM_KEYS = ["HMP", "BSHM", "HOSPITALITY", "HOTEL", "TOURISM"];
const EDUC_KEYS = ["TEP", "BSED", "BEED", "EDUCATION", "TEACHER"];

function getFamily(k: string) {
  const upper = String(k || "").toUpperCase().trim();
  if (IT_KEYS.some((x) => upper.includes(x))) return "IT";
  if (CRIM_KEYS.some((x) => upper.includes(x))) return "CRIM";
  if (BUS_KEYS.some((x) => upper.includes(x))) return "BUS";
  if (HM_KEYS.some((x) => upper.includes(x))) return "HM";
  if (EDUC_KEYS.some((x) => upper.includes(x))) return "EDUC";
  return "";
}

export function ProgramProvider({ children }: { children: ReactNode }) {
  const [programOptions, setProgramOptions] = useState<ProgramOption[]>([allProgramsOption]);
  const [selectedProgramKey, setSelectedProgramKeyState] =
    useState<ProgramKey>("ALL");
  const isFetchingRef = useRef(false);

  const loadPrograms = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const role = (window.localStorage.getItem("userRole") || "").toLowerCase();
      const isProgramHead = role === "program_head";
      const invalidCodes = new Set(["BSIT", "BSBA", "BSA", "BSED", "BEED", "BSCRIM", "BSHM"]);

      const applyPrograms = (rows: any[]) => {
        const sanitized = (Array.isArray(rows) ? rows : []).filter(
          (p: any) => p && p.code && !invalidCodes.has(String(p.code).trim().toUpperCase())
        );
        const specificPrograms: ProgramOption[] = sanitized.map((row: any) => ({
          key: String(row.code || row.id || ""),
          label: String(row.name || row.code || ""),
          shortLabel: String(row.code || row.name || ""),
        }));

        if (isProgramHead) {
          const userProg = window.localStorage.getItem("userProgram") || window.localStorage.getItem("programCode") || window.localStorage.getItem("selectedProgram") || "ITP";
          const fam = getFamily(userProg);
          const matchedPrograms = specificPrograms.filter((p) => getFamily(p.key) === fam || p.key === userProg);
          const headProgKey = matchedPrograms[0]?.key || userProg;
          const headValues: ProgramOption[] = matchedPrograms.length > 0 ? matchedPrograms : [
            {
              key: headProgKey,
              label: `${headProgKey} Academic Program`,
              shortLabel: headProgKey,
            },
          ];

          setProgramOptions(headValues);
          setSelectedProgramKeyState(headProgKey);
          window.localStorage.setItem("selectedProgram", headProgKey);
          return;
        }

        const values: ProgramOption[] = [allProgramsOption, ...specificPrograms];

        setProgramOptions((prev) => {
          if (
            prev.length === values.length &&
            prev.every((p, idx) => p.key === values[idx].key && p.label === values[idx].label)
          ) {
            return prev;
          }
          return values;
        });

        const saved = window.localStorage.getItem("selectedProgram");
        if (saved && values.some((option: ProgramOption) => option.key === saved)) {
          setSelectedProgramKeyState((prev) => (prev === saved ? prev : saved));
        } else {
          setSelectedProgramKeyState((prev) => (prev === "ALL" ? prev : "ALL"));
          if (window.localStorage.getItem("selectedProgram") !== "ALL") {
            window.localStorage.setItem("selectedProgram", "ALL");
          }
        }
      };

      // 1. Instantly populate from sanitized storage
      const localRows = storage.getPrograms();
      applyPrograms(localRows);

      // 2. Fetch real data from backend/database
      try {
        const res = await api.get("/programs");
        const remoteRows = res.data?.data;
        if (Array.isArray(remoteRows) && remoteRows.length > 0) {
          const sanitizedRemote = remoteRows.filter(
            (p: any) => p && p.code && !invalidCodes.has(String(p.code).trim().toUpperCase())
          );
          if (sanitizedRemote.length > 0) {
            if (!isProgramHead) {
              storage.setPrograms(sanitizedRemote);
            }
            applyPrograms(sanitizedRemote);
          }
        }
      } catch {
        // Backend not available, sanitized local storage is used
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadPrograms();
    const handleStorageUpdate = () => loadPrograms();
    window.addEventListener("scheduling_storage_update", handleStorageUpdate);
    return () => {
      window.removeEventListener("scheduling_storage_update", handleStorageUpdate);
    };
  }, [loadPrograms]);

  const setSelectedProgramKey = useCallback((value: ProgramKey) => {
    const role = (window.localStorage.getItem("userRole") || "").toLowerCase();
    if (role === "program_head") {
      // Program Heads are locked to their assigned program
      return;
    }
    const val = value || "ALL";
    setSelectedProgramKeyState(val);
    window.localStorage.setItem("selectedProgram", val);
  }, []);

  const selectedProgram = useMemo(
    () =>
      programOptions.find((option) => option.key === selectedProgramKey) ??
      programOptions[0] ??
      allProgramsOption,
    [programOptions, selectedProgramKey],
  );

  const matchesProgram = useCallback(
    (programs?: string[] | string | null) => {
      if (!programs) return true;
      if (!selectedProgramKey || selectedProgramKey === "ALL") return true;
      const values = Array.isArray(programs) ? programs : [programs];
      const key = String(selectedProgramKey).toUpperCase().trim();

      const IT_KEYS = ["ITP", "BSIT", "BSCS", "IT", "INFORMATION TECHNOLOGY", "COMPUTER"];
      const CRIM_KEYS = ["CJEP", "BSCRIM", "CRIMINOLOGY", "CRIM", "CRIMINAL JUSTICE"];
      const BUS_KEYS = ["BAP", "BSA", "BSBA", "BUSINESS", "ACCOUNTANCY", "ADMINISTRATION"];
      const HM_KEYS = ["HMP", "BSHM", "HOSPITALITY", "HOTEL", "TOURISM"];
      const EDUC_KEYS = ["TEP", "BSED", "BEED", "EDUCATION", "TEACHER"];

      const getFamily = (k: string) => {
        if (IT_KEYS.some((x) => k.includes(x))) return "IT";
        if (CRIM_KEYS.some((x) => k.includes(x))) return "CRIM";
        if (BUS_KEYS.some((x) => k.includes(x))) return "BUS";
        if (HM_KEYS.some((x) => k.includes(x))) return "HM";
        if (EDUC_KEYS.some((x) => k.includes(x))) return "EDUC";
        return "";
      };

      const selectedFamily = getFamily(key);

      return values.some((value) => {
        if (!value) return false;
        const normalized = String(value).toUpperCase().trim();
        if (normalized === "ALL" || normalized === "UNIVERSAL" || normalized.includes("GENERAL EDUCATION")) return true;
        if (normalized === key || normalized.includes(key) || key.includes(normalized)) return true;
        const valueFamily = getFamily(normalized);
        if (selectedFamily && valueFamily && selectedFamily === valueFamily) return true;
        return false;
      });
    },
    [selectedProgramKey],
  );

  const value = useMemo(
    () => ({
      selectedProgramKey,
      selectedProgram,
      setSelectedProgramKey,
      programOptions,
      matchesProgram,
    }),
    [
      selectedProgramKey,
      selectedProgram,
      setSelectedProgramKey,
      programOptions,
      matchesProgram,
    ],
  );

  return (
    <ProgramContext.Provider value={value}>{children}</ProgramContext.Provider>
  );
}

export function useProgramContext() {
  const context = useContext(ProgramContext);
  if (!context) {
    throw new Error("useProgramContext must be used inside ProgramProvider");
  }
  return context;
}
