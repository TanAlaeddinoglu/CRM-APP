// src/App.jsx
import {BrowserRouter} from "react-router-dom";
import AppRouter from "./routes/AppRouter.jsx";
import {AuthProvider} from "./context/AuthContext.jsx";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
