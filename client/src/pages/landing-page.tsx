import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <div className="flex min-h-[calc(100vh-3rem)] flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">Your Maps</h1>
      <p className="text-muted-foreground">
        Create and explore thesis maps to structure your arguments.
      </p>
      <Link
        to="/map/new"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Create your first thesis map
      </Link>
    </div>
  );
}
