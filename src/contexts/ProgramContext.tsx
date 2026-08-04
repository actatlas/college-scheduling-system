import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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

const emptyProgram: ProgramOption = {
  key: "",
  label: "No Program Selected",
  shortLabel: "N/A",
};

export function ProgramProvider({ children }: { children: ReactNode }) {
  const [programOptions, setProgramOptions] = useState<ProgramOption[]>([]);
  const [selectedProgramKey, setSelectedProgramKeyState] =
    useState<ProgramKey>("");

  useEffect(() => {
    let ignore = false;

    api
      .get("/programs")
      .then((res) => {
        if (ignore) return;
        const rows = Array.isArray(res.data?.data) ? res.data.data : [];
        const values = rows.map(
          (row: any): ProgramOption => ({
            key: String(row.code || row.id || ""),
            label: String(row.name || row.code || ""),
            shortLabel: String(row.code || row.name || ""),
          }),
        );
        setProgramOptions(values);
        const saved = window.localStorage.getItem("selectedProgram");
        if (
          saved &&
          values.some((option: ProgramOption) => option.key === saved)
        ) {
          setSelectedProgramKeyState(saved);
        } else if (values[0]) {
          setSelectedProgramKeyState(values[0].key);
          window.localStorage.setItem("selectedProgram", values[0].key);
        }
      })
      .catch(() => {
        if (!ignore) {
          setProgramOptions([]);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const setSelectedProgramKey = useCallback((value: ProgramKey) => {
    setSelectedProgramKeyState(value);
    if (value) {
      window.localStorage.setItem("selectedProgram", value);
    }
  }, []);

  const selectedProgram = useMemo(
    () =>
      programOptions.find((option) => option.key === selectedProgramKey) ??
      programOptions[0] ??
      emptyProgram,
    [programOptions, selectedProgramKey],
  );

  const matchesProgram = useCallback(
    (programs?: string[] | string | null) => {
      if (!programs || !selectedProgramKey) return true;
      const values = Array.isArray(programs) ? programs : [programs];
      return values.some((value) => {
        const normalized = String(value).toUpperCase();
        const key = String(selectedProgramKey).toUpperCase();
        return normalized === key || normalized.includes(key);
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
