import { useParams, Link } from "react-router-dom";

export function MapView() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="flex min-h-[calc(100vh-3rem)] flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">Map: {id}</p>
      <Link
        to="/"
        className="text-sm text-primary underline hover:text-primary/80"
      >
        Back to maps
      </Link>
    </div>
  );
}
