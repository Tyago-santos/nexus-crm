import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { ProtectedRoute, useAuth } from "@/app/auth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import CustomersPage from "@/pages/CustomersPage";
import CustomerDetailPage from "@/pages/CustomerDetailPage";
import LeadsPage from "@/pages/LeadsPage";
import PipelinePage from "@/pages/PipelinePage";
import WhatsAppPage from "@/pages/WhatsAppPage";
import AssistantPage from "@/pages/AssistantPage";
import TasksPage from "@/pages/TasksPage";
import AutomationsPage from "@/pages/AutomationsPage";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import TeamPage from "@/pages/TeamPage";

function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface px-6 text-center">
      <p className="font-display text-6xl font-extrabold text-primary">404</p>
      <h1 className="text-xl font-bold text-ink">Página não encontrada</h1>
      <p className="max-w-sm text-sm text-muted">O endereço acessado não existe ou foi movido.</p>
      <Button onClick={() => navigate("/dashboard")}>Voltar ao dashboard</Button>
    </div>
  );
}

function HomeRedirect() {
  const { can } = useAuth();
  return <Navigate to={can("reports:read") ? "/dashboard" : "/whatsapp"} replace />;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  if (session) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route
        path="/cadastro"
        element={
          <PublicOnly>
            <RegisterPage />
          </PublicOnly>
        }
      />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<HomeRedirect />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/clientes" element={<CustomersPage />} />
          <Route path="/clientes/:id" element={<CustomerDetailPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/whatsapp" element={<WhatsAppPage />} />
          <Route path="/assistente" element={<AssistantPage />} />
          <Route path="/tarefas" element={<TasksPage />} />
          <Route path="/automacoes" element={<AutomationsPage />} />
          <Route path="/relatorios" element={<ReportsPage />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
          <Route path="/equipa" element={<TeamPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
