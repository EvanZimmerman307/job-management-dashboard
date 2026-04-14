import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  createJob,
  deleteJob,
  fetchJobs,
  updateJobStatus,
} from "../api/jobs";
import type { StatusType } from "../types";

export function useJobs() {
  const [page, setPage] = useState(1);
  const [status, setStatusState] = useState<StatusType | null>(null);
  const [ordering, setOrderingState] = useState("-created_at");
  const queryClient = useQueryClient();

  function setStatus(s: StatusType | null) {
    setStatusState(s);
    setPage(1);
  }

  function setOrdering(o: string) {
    setOrderingState(o);
    setPage(1);
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ["jobs", page, status, ordering],
    queryFn: () => fetchJobs(page, status, ordering),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: createJob,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: StatusType }) =>
      updateJobStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteJob,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  return {
    jobs: data?.results ?? [],
    count: data?.count ?? 0,
    hasNext: data?.next != null,
    hasPrev: data?.previous != null,
    page,
    setPage,
    status,
    setStatus,
    ordering,
    setOrdering,
    isLoading,
    error: error instanceof Error ? error.message : null,
    createJob: createMutation.mutateAsync,
    createError:
      createMutation.error instanceof Error
        ? createMutation.error.message
        : null,
    updateJobStatus: (id: number, status: StatusType) =>
      updateMutation.mutateAsync({ id, status }),
    updateError:
      updateMutation.error instanceof Error
        ? updateMutation.error.message
        : null,
    deleteJob: deleteMutation.mutateAsync,
    deleteError:
      deleteMutation.error instanceof Error
        ? deleteMutation.error.message
        : null,
  };
}
