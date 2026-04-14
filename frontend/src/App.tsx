import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { CreateJobForm } from "./components/CreateJobForm";
import { ErrorBanner } from "./components/ErrorBanner";
import { JobList } from "./components/JobList";
import { useJobs } from "./hooks/useJobs";

const queryClient = new QueryClient();

function Dashboard() {
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    jobs,
    count,
    hasNext,
    hasPrev,
    page,
    setPage,
    status,
    setStatus,
    ordering,
    setOrdering,
    isLoading,
    error,
    createJob,
    createError,
    updateJobStatus,
    deleteJob,
  } = useJobs();

  const displayError = error ?? apiError ?? createError;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <h1 className="text-xl font-semibold text-gray-900">
            Job Management Dashboard
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-4">
        <ErrorBanner message={displayError} />

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-gray-700">
            Create New Job
          </h2>
          <CreateJobForm
            onSubmit={async (name) => {
              setApiError(null);
              await createJob(name);
            }}
          />
        </div>

        <JobList
          jobs={jobs}
          count={count}
          page={page}
          hasNext={hasNext}
          hasPrev={hasPrev}
          isLoading={isLoading}
          status={status}
          ordering={ordering}
          onPageChange={setPage}
          onStatusFilter={setStatus}
          onOrderingChange={setOrdering}
          onStatusChange={async (id, status) => {
            setApiError(null);
            await updateJobStatus(id, status);
          }}
          onDelete={async (id) => {
            setApiError(null);
            await deleteJob(id);
          }}
          onError={setApiError}
        />
      </main>
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}
