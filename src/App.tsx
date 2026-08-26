import { BrowserRouter } from "react-router-dom";
import "./styles/index.css";
import { AppRoutes } from "./routes/AppRoutes";
import { ToastProvider } from "./components/common/Toast";
import { ProgramProvider } from "./contexts/ProgramContext";
import { DevFloatingTools } from "./components/dev/DevFloatingTools";

import { NotificationProvider } from "./contexts/NotificationContext";

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <NotificationProvider>
          <ProgramProvider>
            <AppRoutes />
            <DevFloatingTools />
          </ProgramProvider>
        </NotificationProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
