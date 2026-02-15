import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CreateMapDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [thesisStatement, setThesisStatement] = useState("");
  const [errors, setErrors] = useState<{
    name?: string;
    thesisStatement?: string;
  }>({});
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const createMap = trpc.map.create.useMutation({
    onSuccess: (data) => {
      utils.map.list.invalidate();
      setOpen(false);
      navigate(`/map/${data.id}`);
    },
  });

  function resetForm() {
    setName("");
    setThesisStatement("");
    setErrors({});
    createMap.reset();
  }

  function validate(): boolean {
    const newErrors: { name?: string; thesisStatement?: string } = {};
    if (!name.trim()) {
      newErrors.name = "Map name is required";
    }
    if (!thesisStatement.trim()) {
      newErrors.thesisStatement = "Thesis statement is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    createMap.mutate({
      name: name.trim(),
      thesisStatement: thesisStatement.trim(),
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (value) resetForm();
        setOpen(value);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create a new thesis map</DialogTitle>
            <DialogDescription>
              Give your map a name and define the thesis you want to evaluate.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="map-name">Map name</Label>
              <Input
                id="map-name"
                placeholder='e.g., "My PhD Chapter 3"'
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="thesis-statement">Thesis statement</Label>
              <Input
                id="thesis-statement"
                placeholder='e.g., "Remote work improves productivity"'
                value={thesisStatement}
                onChange={(e) => {
                  setThesisStatement(e.target.value);
                  if (errors.thesisStatement)
                    setErrors((prev) => ({ ...prev, thesisStatement: undefined }));
                }}
                aria-invalid={!!errors.thesisStatement}
              />
              {errors.thesisStatement && (
                <p className="text-sm text-destructive">
                  {errors.thesisStatement}
                </p>
              )}
            </div>
            {createMap.error && (
              <p className="text-sm text-destructive">
                Failed to create map. Please try again.
              </p>
            )}
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMap.isPending}>
              {createMap.isPending ? "Creating..." : "Create map"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
