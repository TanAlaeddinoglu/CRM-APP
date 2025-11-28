// src/App.jsx
import {BrowserRouter} from "react-router-dom";
import AppRouter from "./routes/AppRouter.jsx";
import {AuthProvider} from "./context/AuthContext.jsx";
import {Toaster} from "react-hot-toast";


function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRouter/>
                <Toaster position="top-right"/>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
