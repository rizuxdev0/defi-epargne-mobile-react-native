import { documentDirectory, getInfoAsync, readAsStringAsync, writeAsStringAsync } from "expo-file-system/legacy";

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_emoji: string | null;
  currency_code: string;
  currency_symbol: string;
  currency_position: "left" | "right";
  number_format: "fr" | "en";
  theme: "light" | "dark";
  pin_code: string | null;
  notifications_enabled: boolean;
  notification_hour: number;
  notification_minute: number;
  notification_frequency: "daily" | "twice_daily" | "weekly";
  created_at: string;
  updated_at: string;
}

export interface Challenge {
  id: string;
  name: string;
  emoji: string;
  target_amount: number;
  category: string | null;
  description: string | null;
  start_date: string;
  end_date: string | null;
  status: "active" | "completed" | "archived";
  mode: "random" | "regular" | "free";
  min_installment: number;
  max_installment: number;
  created_at: string;
  updated_at: string;
}

export interface Installment {
  id: string;
  challenge_id: string;
  amount: number;
  position: number;
  is_checked: boolean;
  checked_at: string | null;
  created_at: string;
}

export interface AIMessage {
  id: string;
  thread_id: string;
  role: "user" | "model";
  content: string;
  created_at: string;
}

export interface AIThread {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseState {
  profile: Profile;
  challenges: Challenge[];
  installments: Installment[];
  threads: AIThread[];
  messages: AIMessage[];
}

const DB_FILE_PATH = (documentDirectory || "") + "db.json";

const DEFAULT_PROFILE: Profile = {
  id: "local-user",
  first_name: "Épargnant",
  last_name: null,
  avatar_emoji: "💰",
  currency_code: "XOF",
  currency_symbol: "F CFA",
  currency_position: "right",
  number_format: "fr",
  theme: "light",
  pin_code: null,
  notifications_enabled: false,
  notification_hour: 20,
  notification_minute: 0,
  notification_frequency: "daily",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const DEFAULT_STATE: DatabaseState = {
  profile: DEFAULT_PROFILE,
  challenges: [],
  installments: [],
  threads: [],
  messages: [],
};

// Memory cache
let cachedState: DatabaseState | null = null;
let dbListeners: (() => void)[] = [];

export const db = {
  subscribe(listener: () => void): () => void {
    dbListeners.push(listener);
    return () => {
      dbListeners = dbListeners.filter((l) => l !== listener);
    };
  },

  notify() {
    dbListeners.forEach((listener) => listener());
  },

  async init(): Promise<DatabaseState> {
    if (cachedState) return cachedState;
    try {
      const fileInfo = await getInfoAsync(DB_FILE_PATH);
      if (fileInfo.exists) {
        const fileContent = await readAsStringAsync(DB_FILE_PATH);
        const parsed = JSON.parse(fileContent) as Partial<DatabaseState>;
        cachedState = {
          profile: parsed.profile || DEFAULT_PROFILE,
          challenges: parsed.challenges || [],
          installments: parsed.installments || [],
          threads: parsed.threads || [],
          messages: parsed.messages || [],
        };
      } else {
        cachedState = { ...DEFAULT_STATE };
        await this.save();
      }
    } catch (e) {
      console.error("Error loading database file:", e);
      cachedState = { ...DEFAULT_STATE };
    }
    return cachedState;
  },

  async save(): Promise<void> {
    if (!cachedState) return;
    try {
      const content = JSON.stringify(cachedState, null, 2);
      await writeAsStringAsync(DB_FILE_PATH, content);
      this.notify();
    } catch (e) {
      console.error("Error saving database file:", e);
    }
  },

  // PROFILE operations
  async getProfile(): Promise<Profile> {
    const state = await this.init();
    return state.profile;
  },

  async updateProfile(updates: Partial<Profile>): Promise<Profile> {
    const state = await this.init();
    state.profile = {
      ...state.profile,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    await this.save();
    return state.profile;
  },

  // CHALLENGE operations
  async getChallenges(): Promise<Challenge[]> {
    const state = await this.init();
    return state.challenges;
  },

  async getActiveChallengesWithStats(): Promise<(Challenge & { saved: number; total_installments: number; checked_installments: number })[]> {
    const state = await this.init();
    const active = state.challenges.filter((c) => c.status === "active");
    return active.map((c) => {
      const insts = state.installments.filter((i) => i.challenge_id === c.id);
      const saved = insts.filter((i) => i.is_checked).reduce((sum, i) => sum + i.amount, 0);
      return {
        ...c,
        saved,
        total_installments: insts.length,
        checked_installments: insts.filter((i) => i.is_checked).length,
      };
    });
  },

  async getChallengeById(id: string): Promise<Challenge | null> {
    const state = await this.init();
    return state.challenges.find((c) => c.id === id) || null;
  },

  async createChallenge(challenge: Omit<Challenge, "id" | "created_at" | "updated_at">, installmentsList: Omit<Installment, "id" | "created_at">[]): Promise<Challenge> {
    const state = await this.init();
    const newChallenge: Challenge = {
      ...challenge,
      id: Math.random().toString(36).substring(2, 15),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const newInstallments: Installment[] = installmentsList.map((inst) => ({
      ...inst,
      id: Math.random().toString(36).substring(2, 15),
      challenge_id: newChallenge.id,
      created_at: new Date().toISOString(),
    }));

    state.challenges.push(newChallenge);
    state.installments.push(...newInstallments);
    await this.save();
    return newChallenge;
  },

  async updateChallenge(id: string, updates: Partial<Challenge>): Promise<Challenge> {
    const state = await this.init();
    const idx = state.challenges.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Challenge not found");
    state.challenges[idx] = {
      ...state.challenges[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    await this.save();
    return state.challenges[idx];
  },

  async deleteChallenge(id: string): Promise<void> {
    const state = await this.init();
    state.challenges = state.challenges.filter((c) => c.id !== id);
    state.installments = state.installments.filter((i) => i.challenge_id !== id);
    await this.save();
  },

  // INSTALLMENTS operations
  async getInstallments(challengeId: string): Promise<Installment[]> {
    const state = await this.init();
    return state.installments.filter((i) => i.challenge_id === challengeId).sort((a, b) => a.position - b.position);
  },

  async toggleInstallment(id: string): Promise<Installment> {
    const state = await this.init();
    const idx = state.installments.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error("Installment not found");
    const inst = state.installments[idx];
    const is_checked = !inst.is_checked;
    state.installments[idx] = {
      ...inst,
      is_checked,
      checked_at: is_checked ? new Date().toISOString() : null,
    };

    // Check if challenge is completed
    const challengeId = inst.challenge_id;
    const challengeInsts = state.installments.filter((i) => i.challenge_id === challengeId);
    const allChecked = challengeInsts.every((i) => i.is_checked);
    const challengeIdx = state.challenges.findIndex((c) => c.id === challengeId);
    
    if (challengeIdx !== -1) {
      const currentStatus = state.challenges[challengeIdx].status;
      if (allChecked && currentStatus === "active") {
        state.challenges[challengeIdx].status = "completed";
      } else if (!allChecked && currentStatus === "completed") {
        state.challenges[challengeIdx].status = "active";
      }
    }

    await this.save();
    return state.installments[idx];
  },

  // AI COACH operations
  async getThreads(): Promise<AIThread[]> {
    const state = await this.init();
    return state.threads;
  },

  async getMessages(threadId: string): Promise<AIMessage[]> {
    const state = await this.init();
    return state.messages.filter((m) => m.thread_id === threadId).sort((a, b) => a.created_at.localeCompare(b.created_at));
  },

  async createThread(title: string): Promise<AIThread> {
    const state = await this.init();
    const newThread: AIThread = {
      id: Math.random().toString(36).substring(2, 15),
      title,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    state.threads.unshift(newThread);
    await this.save();
    return newThread;
  },

  async addMessage(threadId: string, role: "user" | "model", content: string): Promise<AIMessage> {
    const state = await this.init();
    const newMessage: AIMessage = {
      id: Math.random().toString(36).substring(2, 15),
      thread_id: threadId,
      role,
      content,
      created_at: new Date().toISOString(),
    };
    state.messages.push(newMessage);
    
    // Update thread timestamp
    const threadIdx = state.threads.findIndex((t) => t.id === threadId);
    if (threadIdx !== -1) {
      state.threads[threadIdx].updated_at = new Date().toISOString();
      // Move to top
      const thread = state.threads.splice(threadIdx, 1)[0];
      state.threads.unshift(thread);
    }
    
    await this.save();
    return newMessage;
  },

  async clearDatabase(): Promise<void> {
    cachedState = {
      profile: { ...DEFAULT_PROFILE, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      challenges: [],
      installments: [],
      threads: [],
      messages: [],
    };
    await this.save();
  },

  async importDatabase(jsonString: string): Promise<void> {
    try {
      const parsed = JSON.parse(jsonString) as Partial<DatabaseState>;
      cachedState = {
        profile: parsed.profile || DEFAULT_PROFILE,
        challenges: parsed.challenges || [],
        installments: parsed.installments || [],
        threads: parsed.threads || [],
        messages: parsed.messages || [],
      };
      await this.save();
    } catch (e) {
      throw new Error("Invalid database format");
    }
  }
};
