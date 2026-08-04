import { BrowserRouter } from "react-router-dom";
import "./styles/index.css";
import { AppRoutes } from "./routes/AppRoutes";
import { ToastProvider } from "./components/common/Toast";
import { ProgramProvider } from "./contexts/ProgramContext";

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ProgramProvider>
          <AppRoutes />
        </ProgramProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
