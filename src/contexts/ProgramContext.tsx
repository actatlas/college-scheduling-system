import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ProgramKey = "ITP" | "BSA" | "CJEP" | "HMP" | "TEP";

export type ProgramOption = {
  key: ProgramKey;
  label: string;
  shortLabel: string;
};

export const programOptions: ProgramOption[] = [
  { key: "ITP", label: "Information Technology Program", shortLabel: "ITP" },
  { key: "BSA", label: "Business Administration Program", shortLabel: "BSA" },
  {
    key: "CJEP",
    label: "Criminal Justice Education Program",
    shortLabel: "CJEP",
  },
  { key: "HMP", label: "Hospitality Management Program", shortLabel: "HMP" },
  { key: "TEP", label: "Teacher Education Program", shortLabel: "TEP" },
];

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

export function ProgramProvider({ children }: { children: ReactNode }) {
  const [selectedProgramKey, setSelectedProgramKeyState] =
    useState<ProgramKey>("ITP");

  useEffect(() => {
    const saved = window.localStorage.getItem("selectedProgram");
    if (saved && programOptions.some((option) => option.key === saved)) {
      setSelectedProgramKeyState(saved as ProgramKey);
    }
  }, []);

  const setSelectedProgramKey = (value: ProgramKey) => {
    setSelectedProgramKeyState(value);
    window.localStorage.setItem("selectedProgram", value);
  };

  const selectedProgram = useMemo(
    () =>
      programOptions.find((option) => option.key === selectedProgramKey) ??
      programOptions[0],
    [selectedProgramKey],
  );

  const matchesProgram = (programs?: string[] | string | null) => {
    if (!programs) return true;
    const values = Array.isArray(programs) ? programs : [programs];
    return values.some((value) => {
      const normalized = String(value).toUpperCase();
      return (
        normalized === selectedProgramKey ||
        normalized.includes(selectedProgramKey)
      );
    });
  };

  const value = useMemo(
    () => ({
      selectedProgramKey,
      selectedProgram,
      setSelectedProgramKey,
      programOptions,
      matchesProgram,
    }),
    [selectedProgramKey, selectedProgram, matchesProgram],
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
