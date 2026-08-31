import { BrowserRouter } from "react-router-dom";
import "./styles/index.css";
import { AppRoutes } from "./routes/AppRoutes";
import { ToastProvider } from "./components/common/Toast";
import { ProgramProvider } from "./contexts/ProgramContext";
import { DevFloatingTools } from "./components/dev/DevFloatingTools";

import { NotificationProvider } from "./contexts/NotificationContext";
import { AcademicPeriodProvider } from "./contexts/AcademicPeriodContext";

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <NotificationProvider>
          <AcademicPeriodProvider>
            <ProgramProvider>
              <AppRoutes />
              <DevFloatingTools />
            </ProgramProvider>
          </AcademicPeriodProvider>
        </NotificationProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
