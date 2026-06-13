// src/App.jsx
import {BrowserRouter} from "react-router-dom";
import AppRouter from "./routes/AppRouter.jsx";
import {AuthProvider} from "./context/AuthContext.jsx";
import {Toaster} from "react-hot-toast";
import { PageTransitionProvider } from "./context/PageTransitionContext.jsx";


function App() {
    return (
        <BrowserRouter>
            <PageTransitionProvider>
                <AuthProvider>
                    <AppRouter/>
                    <Toaster position="top-right"/>
                </AuthProvider>
            </PageTransitionProvider>
        </BrowserRouter>
    );
}

export default App;
