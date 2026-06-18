import { useEffect } from "react";
import { Router } from "@/router";
import { useAuthStore } from "@/stores/authStore";

function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return <Router />;
}

export default App;
