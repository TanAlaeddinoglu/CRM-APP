// src/routes/AppRouter.jsx
import {Routes, Route} from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import LoginPage from "../pages/LoginPage";
import Dashboard from "../pages/Dashboard";
import ProtectedRoute from "./ProtectedRoute.jsx";

export default function AppRouter() {
    return (
        <Routes>

            {/* Login */}
            <Route path="/login" element={<LoginPage/>}/>

            {/* Dashboard */}
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <Dashboard/>
                        </MainLayout>
                    </ProtectedRoute>
                }
            />


        </Routes>
    );
}
