export interface GeminiModelInfo {
  name: string;
  displayName?: string;
  description?: string;
  supportedGenerationMethods?: string[];
}

let cachedWorkingModel: string | null = null;

const MODEL_PRIORITY = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.0-flash",
  "gemini-3-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-pro",
];

export const geminiService = {
  /**
   * Sorts available models by our priority list, putting gemini-3.6-flash and modern flash models first.
   */
  rankModels(contentModels: GeminiModelInfo[]): string[] {
    const slugs = contentModels.map((m) => m.name.replace(/^models\//, ""));
    const sorted: string[] = [];

    // Add in priority order
    for (const p of MODEL_PRIORITY) {
      const match = slugs.find((s) => s.includes(p) || s === p);
      if (match && !sorted.includes(match)) {
        sorted.push(match);
      }
    }

    // Add any remaining models
    for (const s of slugs) {
      if (!sorted.includes(s)) {
        sorted.push(s);
      }
    }

    return sorted;
  },

  /**
   * Discovers and verifies a working model for this API key.
   */
  /**
   * Discovers and verifies a working model for this API key.
   * Directly prioritizes gemini-3.6-flash (recommended by Google AI Studio for new users).
   */
  async findWorkingModel(apiKey: string): Promise<string> {
    if (cachedWorkingModel) return cachedWorkingModel;

    const key = apiKey.trim();
    if (!key) return "gemini-3.6-flash";

    // Fast check: test gemini-3.6-flash directly
    try {
      const ping = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": key,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "OK" }] }],
          }),
        }
      );

      if (ping.ok) {
        cachedWorkingModel = "gemini-3.6-flash";
        return "gemini-3.6-flash";
      }

      // Check if response suggests another model
      const errData = await ping.json().catch(() => ({}));
      const errMsg = errData?.error?.message || "";
      const match = errMsg.match(/models\/([a-zA-Z0-9.-]+)/);
      if (match && match[1]) {
        cachedWorkingModel = match[1];
        return match[1];
      }
    } catch (e) {
      console.warn("[Gemini] Direct test error:", e);
    }

    // Fallback: Query ListModels
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
        {
          method: "GET",
          headers: { "x-goog-api-key": key },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const models: GeminiModelInfo[] = data.models || [];
        const contentModels = models.filter((m) =>
          m.supportedGenerationMethods?.includes("generateContent")
        );

        if (contentModels.length > 0) {
          const ranked = this.rankModels(contentModels);
          cachedWorkingModel = ranked[0];
          return ranked[0];
        }
      }
    } catch (e) {
      console.warn("[Gemini] Error finding model via ListModels:", e);
    }

    return "gemini-3.6-flash";
  },

  /**
   * Test API key connectivity by testing gemini-3.6-flash and candidates.
   * Auto-handles Google model migration suggestions (e.g. models/gemini-3.6-flash).
   */
  async testConnection(
    apiKey: string
  ): Promise<{ success: boolean; model?: string; error?: string }> {
    const key = apiKey.trim();
    if (!key) {
      return { success: false, error: "Aucune clé API renseignée." };
    }

    // Direct candidate list starting with gemini-3.6-flash
    const priorityModels = [
      "gemini-3.6-flash",
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
    ];

    let lastErrorMessage = "";

    // 1. Try priority models directly
    for (const modelSlug of priorityModels) {
      try {
        const pingRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelSlug}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": key,
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: "Reponds 'OK' en un mot." }] }],
            }),
          }
        );

        if (pingRes.ok) {
          cachedWorkingModel = modelSlug;
          return { success: true, model: modelSlug };
        }

        const errData = await pingRes.json().catch(() => ({}));
        const errMsg = errData?.error?.message || "";
        lastErrorMessage = errMsg;

        // If Google explicitly tells us which model to use in the error message
        // e.g. "Please update your code to use models/gemini-3.6-flash"
        const match = errMsg.match(/models\/([a-zA-Z0-9.-]+)/);
        if (match && match[1] && match[1] !== modelSlug) {
          const recommended = match[1];
          const retryRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${recommended}:generateContent?key=${key}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": key,
              },
              body: JSON.stringify({
                contents: [{ parts: [{ text: "Reponds 'OK' en un mot." }] }],
              }),
            }
          );

          if (retryRes.ok) {
            cachedWorkingModel = recommended;
            return { success: true, model: recommended };
          }
        }
      } catch (candidateErr) {
        console.warn(`[Gemini] Error testing model ${modelSlug}:`, candidateErr);
      }
    }

    // 2. If priority models didn't succeed, query ListModels as fallback
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
        {
          method: "GET",
          headers: { "x-goog-api-key": key },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const models: GeminiModelInfo[] = data.models || [];
        const contentModels = models.filter((m) =>
          m.supportedGenerationMethods?.includes("generateContent")
        );

        if (contentModels.length > 0) {
          const ranked = this.rankModels(contentModels);
          for (const m of ranked) {
            if (priorityModels.includes(m)) continue;
            try {
              const ping = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": key,
                  },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: "Reponds 'OK' en un mot." }] }],
                  }),
                }
              );
              if (ping.ok) {
                cachedWorkingModel = m;
                return { success: true, model: m };
              }
            } catch {}
          }
        }
      }
    } catch (listErr) {
      console.warn("[Gemini] ListModels fallback error:", listErr);
    }

    return {
      success: false,
      error: lastErrorMessage || "La clé API n'a pas pu être validée par Google AI Studio.",
    };
  },

  /**
   * Execute chat generation with dynamic model resolution and automatic recovery
   */
  async generateReply(
    apiKey: string,
    systemPrompt: string,
    contents: any[]
  ): Promise<string | null> {
    const key = apiKey.trim();
    if (!key) return null;

    let modelSlug = await this.findWorkingModel(key);

    try {
      let response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelSlug}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": key,
          },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: systemPrompt }],
            },
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 800,
            },
          }),
        }
      );

      // If model returned 400/404 with migration error, re-discover
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData?.error?.message || "";
        const match = errMsg.match(/models\/([a-zA-Z0-9.-]+)/);
        if (match && match[1]) {
          modelSlug = match[1];
          cachedWorkingModel = modelSlug;
        } else {
          cachedWorkingModel = null;
          modelSlug = await this.findWorkingModel(key);
        }

        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelSlug}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": key,
            },
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: systemPrompt }],
              },
              contents,
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 800,
              },
            }),
          }
        );
      }

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      }
    } catch (e) {
      console.warn("[Gemini] generateReply failed:", e);
    }

    return null;
  },
};
