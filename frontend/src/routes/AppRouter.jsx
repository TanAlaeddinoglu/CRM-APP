// src/routes/AppRouter.jsx
import {Routes, Route} from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import LoginPage from "../pages/LoginPage";

import Dashboard from "../pages/Dashboard";
import ProtectedRoute from "./ProtectedRoute.jsx";
import ProfilePage from "../pages/ProfilePage.jsx";
import ProductsPage from "../pages/ProductsPage.jsx";
import AppointmentsPage from "../pages/AppointmentsPage.jsx";

export default function AppRouter() {
    return (
        <Routes>

            <Route path="/login" element={<LoginPage/>}/>
            <Route
                path="/profile"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <ProfilePage/>
                        </MainLayout>
                    </ProtectedRoute>
                }
            />
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
            <Route
                path="/products"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <ProductsPage/>
                        </MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/events"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <AppointmentsPage/>
                        </MainLayout>
                    </ProtectedRoute>
                }
            />


        </Routes>
    );
}
