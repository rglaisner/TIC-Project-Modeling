"use client";

import { useCallback, useState } from "react";

interface ResourceState<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
}

interface ResourceActions<TData, TPayload> extends ResourceState<TData> {
  execute: (payload: TPayload) => Promise<TData | null>;
  reset: () => void;
}

export function useResources<TData, TPayload>(
  executor: (payload: TPayload) => Promise<TData>
): ResourceActions<TData, TPayload> {
  const [state, setState] = useState<ResourceState<TData>>({
    loading: false,
    error: null,
    data: null,
  });

  const execute = useCallback(
    async (payload: TPayload): Promise<TData | null> => {
      setState((current) => ({ ...current, loading: true, error: null }));
      try {
        const data = await executor(payload);
        setState({ loading: false, error: null, data });
        return data;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unexpected request failure.";
        setState((current) => ({ ...current, loading: false, error: message }));
        return null;
      }
    },
    [executor]
  );

  const reset = useCallback(() => {
    setState({ loading: false, error: null, data: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}
