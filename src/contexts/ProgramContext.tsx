import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { storage } from "../data/storage";

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

export function ProgramProvider({ children }: { children: ReactNode }) {
  const [programOptions, setProgramOptions] = useState<ProgramOption[]>([allProgramsOption]);
  const [selectedProgramKey, setSelectedProgramKeyState] =
    useState<ProgramKey>("ALL");

  const loadPrograms = useCallback(() => {
    const rows = storage.getPrograms();
    const specificPrograms: ProgramOption[] = rows.map((row: any) => ({
      key: String(row.code || row.id || ""),
      label: String(row.name || row.code || ""),
      shortLabel: String(row.code || row.name || ""),
    }));

    const values: ProgramOption[] = [allProgramsOption, ...specificPrograms];
    setProgramOptions(values);

    const saved = window.localStorage.getItem("selectedProgram");
    if (saved && values.some((option: ProgramOption) => option.key === saved)) {
      setSelectedProgramKeyState(saved);
    } else {
      setSelectedProgramKeyState("ALL");
      window.localStorage.setItem("selectedProgram", "ALL");
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
    const val = value || "ALL";
    setSelectedProgramKeyState(val);
    window.localStorage.setItem("selectedProgram", val);
  }, []);

  const selectedProgram = useMemo(
    () =>
      programOptions.find((option) => option.key === selectedProgramKey) ??
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
      const BUS_KEYS = ["BSA", "BSBA", "BUSINESS", "ACCOUNTANCY", "ADMINISTRATION"];
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
