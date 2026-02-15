import { trpc } from "@/lib/trpc";

function App() {
  const healthCheck = trpc.healthCheck.useQuery();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">Thesis Map</h1>
      {healthCheck.isLoading && <p className="text-muted-foreground">Connecting to server...</p>}
      {healthCheck.isError && (
        <p className="text-destructive">Server connection failed: {healthCheck.error.message}</p>
      )}
      {healthCheck.data && (
        <p className="text-sm text-muted-foreground">
          Server status: {healthCheck.data.status}
        </p>
      )}
    </div>
  );
}

export default App;
