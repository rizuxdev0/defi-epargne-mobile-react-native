import React, { createContext, useContext, useState, useEffect } from "react";
import { db, DatabaseState, Profile, Challenge, Installment, AIThread, AIMessage } from "./db";

interface AppContextType {
  state: DatabaseState | null;
  loading: boolean;
  profile: Profile | null;
  challenges: Challenge[];
  installments: Installment[];
  threads: AIThread[];
  messages: AIMessage[];
  refresh: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  createChallenge: (challenge: Omit<Challenge, "id" | "created_at" | "updated_at">, installments: Omit<Installment, "id" | "created_at">[]) => Promise<Challenge>;
  updateChallenge: (id: string, updates: Partial<Challenge>) => Promise<Challenge>;
  deleteChallenge: (id: string) => Promise<void>;
  toggleInstallment: (id: string) => Promise<Installment>;
  createThread: (title: string) => Promise<AIThread>;
  addMessage: (threadId: string, role: "user" | "model", content: string) => Promise<AIMessage>;
  clearDatabase: () => Promise<void>;
  importDatabase: (jsonString: string) => Promise<void>;
  toggleInstallmentsBatch: (ids: string[]) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<DatabaseState | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchState = async () => {
    try {
      const data = await db.init();
      setState({
        profile: data.profile ? { ...data.profile } : null,
        challenges: [...data.challenges],
        installments: [...data.installments],
        threads: [...data.threads],
        messages: [...data.messages],
      } as DatabaseState);
    } catch (e) {
      console.error("Failed to fetch state:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    
    // Subscribe to DB changes to automatically trigger state updates
    const unsubscribe = db.subscribe(() => {
      fetchState();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const updateProfile = async (updates: Partial<Profile>) => {
    await db.updateProfile(updates);
  };

  const createChallenge = async (challenge: Omit<Challenge, "id" | "created_at" | "updated_at">, installments: Omit<Installment, "id" | "created_at">[]) => {
    const res = await db.createChallenge(challenge, installments);
    return res;
  };

  const updateChallenge = async (id: string, updates: Partial<Challenge>) => {
    const res = await db.updateChallenge(id, updates);
    return res;
  };

  const deleteChallenge = async (id: string) => {
    await db.deleteChallenge(id);
  };

  const toggleInstallment = async (id: string) => {
    const res = await db.toggleInstallment(id);
    return res;
  };

  const createThread = async (title: string) => {
    return await db.createThread(title);
  };

  const addMessage = async (threadId: string, role: "user" | "model", content: string) => {
    return await db.addMessage(threadId, role, content);
  };

  const clearDatabase = async () => {
    await db.clearDatabase();
  };

  const importDatabase = async (jsonString: string) => {
    await db.importDatabase(jsonString);
  };

  const toggleInstallmentsBatch = async (ids: string[]) => {
    await db.toggleInstallmentsBatch(ids);
  };

  return (
    <AppContext.Provider
      value={{
        state,
        loading,
        profile: state?.profile || null,
        challenges: state?.challenges || [],
        installments: state?.installments || [],
        threads: state?.threads || [],
        messages: state?.messages || [],
        refresh: fetchState,
        updateProfile,
        createChallenge,
        updateChallenge,
        deleteChallenge,
        toggleInstallment,
        createThread,
        addMessage,
        clearDatabase,
        importDatabase,
        toggleInstallmentsBatch,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
