import { useAdmin } from "@/hooks/useAdmin";
import { Navigate } from "react-router-dom";

const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, loading } = useAdmin();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  if (!user) return <Navigate to="/admin/login" replace />;
  if (!isAdmin) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-heading font-bold text-foreground mb-2">Access Denied</h1>
        <p className="text-muted-foreground">You don't have admin privileges.</p>
      </div>
    </div>
  );

  return <>{children}</>;
};

export default AdminGuard;
