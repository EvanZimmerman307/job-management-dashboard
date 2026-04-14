import { useState } from "react";

interface Props {
  onSubmit: (name: string) => Promise<void>;
}

export function CreateJobForm({ onSubmit }: Props) {
  const [name, setName] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setValidationError("Job name cannot be empty.");
      return;
    }
    setValidationError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(name.trim());
      setName("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex gap-2">
      <div className="flex-1">
        <input
          data-testid="job-name-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New job name..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          disabled={isSubmitting}
        />
        {validationError && (
          <p className="mt-1 text-xs text-red-600">{validationError}</p>
        )}
      </div>
      <button
        data-testid="create-job-submit"
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {isSubmitting ? "Creating..." : "Create Job"}
      </button>
    </form>
  );
}
