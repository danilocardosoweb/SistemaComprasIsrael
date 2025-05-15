
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { Link } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-accent/30 p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <Star size={64} className="text-church-600" />
        </div>
        <h1 className="text-6xl font-bold text-church-600">404</h1>
        <p className="text-xl text-muted-foreground">
          Oops! A página que você está procurando não existe.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Voltar para o início</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
