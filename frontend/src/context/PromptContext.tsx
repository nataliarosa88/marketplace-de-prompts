"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { copyPrompt, createPrompt, fetchPrompts } from "@/data/promptApi";
import { Prompt, PromptInput } from "@/types/prompt";

type PromptState = {
  prompts: Prompt[];
  loading: boolean;
  error: string | null;
};

type Action =
  | { type: "LOAD_START" }
  | { type: "LOAD_SUCCESS"; payload: Prompt[] }
  | { type: "LOAD_ERROR"; payload: string }
  | { type: "UPSERT"; payload: Prompt }
  | { type: "REMOVE"; payload: string };

function reducer(state: PromptState, action: Action): PromptState {
  switch (action.type) {
    case "LOAD_START":
      return { ...state, loading: true, error: null };
    case "LOAD_SUCCESS":
      return { prompts: action.payload, loading: false, error: null };
    case "LOAD_ERROR":
      return { ...state, loading: false, error: action.payload };
    case "UPSERT": {
      const exists = state.prompts.some((prompt) => prompt.id === action.payload.id);
      const prompts = exists
        ? state.prompts.map((prompt) => (prompt.id === action.payload.id ? action.payload : prompt))
        : [action.payload, ...state.prompts];
      return { ...state, prompts };
    }
    case "REMOVE":
      return { ...state, prompts: state.prompts.filter((prompt) => prompt.id !== action.payload) };
    default:
      return state;
  }
}

type PromptContextValue = PromptState & {
  activeTag: string;
  search: string;
  setActiveTag: (tag: string) => void;
  setSearch: (value: string) => void;
  refresh: () => Promise<void>;
  savePrompt: (id: string | null, payload: PromptInput) => Promise<void>;
  incrementCopies: (id: string) => Promise<void>;
};

const PromptContext = createContext<PromptContextValue | null>(null);

const initialState: PromptState = {
  prompts: [],
  loading: false,
  error: null,
};

export function PromptProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [activeTag, setActiveTag] = useState("all");
  const [search, setSearch] = useState("");

  const refresh = useCallback(async () => {
    dispatch({ type: "LOAD_START" });
    try {
      const data = await fetchPrompts();
      dispatch({ type: "LOAD_SUCCESS", payload: data });
    } catch (error) {
      dispatch({ type: "LOAD_ERROR", payload: (error as Error).message });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(async (id: string | null, payload: PromptInput) => {
    // novo prompt vai para moderacao (nao aparece no feed publico ate autorizacao)
    await createPrompt(payload);
    await refresh();
  }, []);

  const incrementCopies = useCallback(async (id: string) => {
    const prompt = await copyPrompt(id);
    dispatch({ type: "UPSERT", payload: prompt });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      activeTag,
      search,
      setActiveTag,
      setSearch,
      refresh,
      savePrompt: save,
      incrementCopies,
    }),
    [activeTag, refresh, save, search, state, incrementCopies],
  );

  return <PromptContext.Provider value={value}>{children}</PromptContext.Provider>;
}

export function usePromptContext() {
  const context = useContext(PromptContext);
  if (!context) {
    throw new Error("usePromptContext must be used inside PromptProvider");
  }
  return context;
}
