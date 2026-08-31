import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "../data/apiClient";

export interface AcademicPeriodState {
  activeSchoolYear: string;
  activeSemester: string;
  institutionName: string;
  institutionCode: string;
  standardClassDuration: string;
  defaultModality: string;
  allowSaturdayClasses: boolean;
  enforceAvailabilityStrict: boolean;
  maxFullTimeLoadHours: number;
  maxPartTimeLoadHours: number;
}

const DEFAULT_ACADEMIC_PERIOD: AcademicPeriodState = {
  activeSchoolYear: "2026-2027",
  activeSemester: "1st Semester",
  institutionName: "St. Rita's College of Balingasag",
  institutionCode: "SRCB",
  standardClassDuration: "90",
  defaultModality: "Face-to-Face",
  allowSaturdayClasses: true,
  enforceAvailabilityStrict: true,
  maxFullTimeLoadHours: 24,
  maxPartTimeLoadHours: 12,
};

interface AcademicPeriodContextValue extends AcademicPeriodState {
  setActiveAcademicPeriod: (schoolYear: string, semester: string) => Promise<void>;
  refreshAcademicPeriod: () => Promise<void>;
  isLoading: boolean;
}

const AcademicPeriodContext = createContext<AcademicPeriodContextValue | undefined>(undefined);

export function AcademicPeriodProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState<AcademicPeriodState>(() => {
    const cached = localStorage.getItem("srcb_system_settings");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return {
          ...DEFAULT_ACADEMIC_PERIOD,
          activeSchoolYear: parsed.academicYear || parsed.activeSchoolYear || DEFAULT_ACADEMIC_PERIOD.activeSchoolYear,
          activeSemester: parsed.semester || parsed.activeSemester || DEFAULT_ACADEMIC_PERIOD.activeSemester,
          ...parsed,
        };
      } catch {
        // use defaults
      }
    }
    return DEFAULT_ACADEMIC_PERIOD;
  });

  const [isLoading, setIsLoading] = useState(false);

  const fetchAcademicPeriod = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/terms/settings");
      if (res.data?.data) {
        const data = res.data.data;
        const nextState: AcademicPeriodState = {
          activeSchoolYear: data.academicYear || data.activeSchoolYear || "2026-2027",
          activeSemester: data.semester || data.activeSemester || "1st Semester",
          institutionName: data.institutionName || "St. Rita's College of Balingasag",
          institutionCode: data.institutionCode || "SRCB",
          standardClassDuration: String(data.standardClassDuration || "90"),
          defaultModality: data.defaultModality || "Face-to-Face",
          allowSaturdayClasses: data.allowSaturdayClasses ?? true,
          enforceAvailabilityStrict: data.enforceAvailabilityStrict ?? true,
          maxFullTimeLoadHours: Number(data.maxFullTimeLoadHours) || 24,
          maxPartTimeLoadHours: Number(data.maxPartTimeLoadHours) || 12,
        };
        setPeriod(nextState);
        localStorage.setItem("srcb_system_settings", JSON.stringify(data));
      }
    } catch {
      // Keep local/default state if offline
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAcademicPeriod();

    const handleSettingsUpdate = () => {
      fetchAcademicPeriod();
    };

    window.addEventListener("srcb_settings_updated", handleSettingsUpdate);
    return () => {
      window.removeEventListener("srcb_settings_updated", handleSettingsUpdate);
    };
  }, [fetchAcademicPeriod]);

  const setActiveAcademicPeriod = useCallback(
    async (schoolYear: string, semester: string) => {
      const updated = {
        ...period,
        activeSchoolYear: schoolYear,
        activeSemester: semester,
        academicYear: schoolYear,
        semester,
      };
      setPeriod(updated);
      localStorage.setItem("srcb_system_settings", JSON.stringify(updated));

      try {
        await api.put("/terms/settings", {
          ...updated,
          academicYear: schoolYear,
          semester,
        });
        window.dispatchEvent(new CustomEvent("srcb_settings_updated"));
      } catch (err) {
        console.error("Failed to persist updated academic period to backend:", err);
      }
    },
    [period]
  );

  return (
    <AcademicPeriodContext.Provider
      value={{
        ...period,
        setActiveAcademicPeriod,
        refreshAcademicPeriod: fetchAcademicPeriod,
        isLoading,
      }}
    >
      {children}
    </AcademicPeriodContext.Provider>
  );
}

export function useAcademicPeriod() {
  const context = useContext(AcademicPeriodContext);
  if (!context) {
    return {
      ...DEFAULT_ACADEMIC_PERIOD,
      setActiveAcademicPeriod: async () => {},
      refreshAcademicPeriod: async () => {},
      isLoading: false,
    };
  }
  return context;
}
