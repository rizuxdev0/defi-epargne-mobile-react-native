import React, { createContext, useContext, useState, useEffect } from "react";
import { db, DatabaseState, Profile, Challenge, Installment, AIThread, AIMessage } from "./db";
import { notificationService } from "./notifications";

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
  completeOnboarding: () => Promise<void>;
  createChallenge: (challenge: Omit<Challenge, "id" | "created_at" | "updated_at">, installments: Omit<Installment, "id" | "created_at">[]) => Promise<Challenge>;
  updateChallenge: (id: string, updates: Partial<Challenge>) => Promise<Challenge>;
  deleteChallenge: (id: string) => Promise<void>;
  toggleInstallment: (id: string) => Promise<Installment>;
  addCustomInstallment: (challengeId: string, amount: number) => Promise<Installment>;
  withdrawFromChallenge: (challengeId: string, amount: number, reason: string) => Promise<number>;
  toggleBalanceHidden: () => Promise<boolean>;
  createThread: (title: string) => Promise<AIThread>;
  deleteThread: (threadId: string) => Promise<void>;
  renameThread: (threadId: string, title: string) => Promise<void>;
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

      // Ensure notification channel is created and sync scheduled reminders
      notificationService.ensureChannel().catch(() => {});
      if (data.profile?.notifications_enabled) {
        notificationService.scheduleReminders({
          enabled: true,
          frequency: data.profile.notification_frequency || "daily",
          hour: data.profile.notification_hour ?? 20,
          minute: data.profile.notification_minute ?? 0,
          morningHour: data.profile.notification_morning_hour ?? 8,
          morningMinute: data.profile.notification_morning_minute ?? 30,
          eveningHour: data.profile.notification_evening_hour ?? 20,
          eveningMinute: data.profile.notification_evening_minute ?? 0,
          weekday: data.profile.notification_weekday ?? 1,
          dayOfMonth: data.profile.notification_day_of_month ?? 28,
        }).catch(() => {});
      }
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

  const completeOnboarding = async () => {
    await db.updateProfile({ onboarding_completed: true });
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

  const addCustomInstallment = async (challengeId: string, amount: number) => {
    const res = await db.addCustomInstallment(challengeId, amount);
    return res;
  };

  const withdrawFromChallenge = async (challengeId: string, amount: number, reason: string) => {
    const res = await db.withdrawFromChallenge(challengeId, amount, reason);
    return res;
  };

  const toggleBalanceHidden = async () => {
    const res = await db.toggleBalanceHidden();
    return res;
  };

  const createThread = async (title: string) => {
    return await db.createThread(title);
  };

  const deleteThread = async (threadId: string) => {
    await db.deleteThread(threadId);
  };

  const renameThread = async (threadId: string, title: string) => {
    await db.renameThread(threadId, title);
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
        completeOnboarding,
        createChallenge,
        updateChallenge,
        deleteChallenge,
        toggleInstallment,
        addCustomInstallment,
        withdrawFromChallenge,
        toggleBalanceHidden,
        createThread,
        deleteThread,
        renameThread,
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
