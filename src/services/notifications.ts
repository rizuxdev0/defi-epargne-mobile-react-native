import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure how notifications are handled when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const REMINDER_CHANNEL_ID = "defi-epargne-reminders";

export interface ReminderOptions {
  enabled: boolean;
  frequency: "daily" | "twice_daily" | "weekly" | "monthly";
  hour: number;
  minute: number;
  morningHour?: number;
  morningMinute?: number;
  eveningHour?: number;
  eveningMinute?: number;
  weekday?: number; // 1 = Sunday, 2 = Monday, ... 7 = Saturday
  dayOfMonth?: number; // 1 - 31
}

const MOTIVATIONAL_DAILY_QUOTES = [
  "Chaque petit pas compte. Prêt pour ton versement du jour ? 🌱",
  "Épargner, ce n'est pas se priver, c'est s'offrir un avenir plus serein. 🛡️",
  "Un sou économisé est un sou gagné. Tes objectifs t'attendent ! 🎯",
  "La régularité bat la quantité. Coche ta case d'aujourd'hui ! 💪",
  "Fais aujourd'hui ce que ton futur toi te remerciera d'avoir fait. 🚀",
  "Construis ta liberté financière, un versement à la fois. 💎",
  "Plus tu commences tôt, plus vite tu atteindras les sommets ! 🏔️",
  "N'attends pas qu'il te reste de l'argent pour épargner, épargne d'abord ! 💰",
];

const MOTIVATIONAL_MORNING_QUOTES = [
  "Bonjour ! Un petit versement aujourd'hui pour garder le cap de tes rêves. ☀️",
  "Démarre ta journée avec la fierté de bâtir ton épargne ! 🚀",
  "Nouvelle journée, nouvelle opportunité d'avancer vers ta liberté financière. 💎",
];

const MOTIVATIONAL_EVENING_QUOTES = [
  "C'est l'heure du bilan de la journée ! As-tu validé ton épargne aujourd'hui ? 🌙",
  "Garde le rythme et protège ta série de régularité avant d'aller dormir ! 🔥",
  "Chaque journée où tu épargnes te rapproche de tes projets. Coche ta case ! 🎯",
];

const WEEKLY_QUOTES = [
  "C'est l'heure du bilan hebdomadaire ! Fais le point sur tes défis et valide tes économies. 📈",
  "Une semaine de plus vers la liberté financière ! Viens cocher tes progrès sur l'application. 🎯",
  "Bilan d'épargne de la semaine : as-tu gardé le rythme ? Tes défis t'attendent ! ⚡",
  "Chaque semaine est une opportunité de grandir. Coche tes versements et célèbre tes victoires. 🏆",
];

const MONTHLY_QUOTES = [
  "C'est le jour de paie ou le bilan mensuel ! Épargne d'abord avant de dépenser. 💳💎",
  "Nouveau mois, nouveaux objectifs ! Fais un versement pour tes défis d'épargne. 🌟",
  "Investis en toi-même en ce début de mois : verse ta part d'économies ! 🚀",
];

export const notificationService = {
  /**
   * Ensure Android notification channel exists with MAX priority, sound, and vibration
   */
  async ensureChannel(): Promise<void> {
    if (Platform.OS === "android") {
      try {
        await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
          name: "Rappels Défi Épargne",
          description: "Rappels réguliers, encouragements et bilans d'épargne",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#2563eb",
          sound: "default",
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
        });
      } catch (err) {
        console.warn("[Notifications] Failed to create Android notification channel:", err);
      }
    }
  },

  /**
   * Check if notification permissions are currently granted without prompting
   */
  async checkPermissions(): Promise<boolean> {
    if (Platform.OS === "web") return false;
    try {
      await this.ensureChannel();
      const settings = await Notifications.getPermissionsAsync();
      return settings.granted || settings.status === "granted";
    } catch {
      return false;
    }
  },

  /**
   * Request permissions from the user. Returns true if granted.
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === "web") return false;

    try {
      await this.ensureChannel();
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
      }

      return finalStatus === "granted";
    } catch (e) {
      console.warn("[Notifications] Error checking permissions:", e);
      return false;
    }
  },

  /**
   * Get all currently scheduled notifications on the device
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    if (Platform.OS === "web") return [];
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (e) {
      console.warn("[Notifications] Failed to fetch scheduled notifications:", e);
      return [];
    }
  },

  /**
   * Schedule or cancel reminders based on user options.
   * Supports:
   * - "daily" : 1 notification per day at hour:minute
   * - "twice_daily" : 2 notifications per day (morning & evening)
   * - "weekly" : 1 notification per week on chosen weekday
   * - "monthly" : 1 notification per month on chosen day of month
   */
  async scheduleReminders(
    optionsOrEnabled: boolean | ReminderOptions,
    maybeHour?: number,
    maybeMinute?: number,
    maybeFrequency?: "daily" | "twice_daily" | "weekly" | "monthly"
  ): Promise<{ success: boolean; count: number }> {
    if (Platform.OS === "web") return { success: false, count: 0 };

    try {
      // Normalize arguments for backwards compatibility
      let opts: ReminderOptions;
      if (typeof optionsOrEnabled === "object") {
        opts = optionsOrEnabled;
      } else {
        opts = {
          enabled: optionsOrEnabled,
          hour: maybeHour ?? 20,
          minute: maybeMinute ?? 0,
          frequency: maybeFrequency ?? "daily",
        };
      }

      // Always clear old schedules first to prevent duplicate alarms
      await Notifications.cancelAllScheduledNotificationsAsync();

      if (!opts.enabled) {
        return { success: true, count: 0 };
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return { success: false, count: 0 };
      }

      const safeHour = Math.min(Math.max(0, opts.hour || 0), 23);
      const safeMinute = Math.min(Math.max(0, opts.minute || 0), 59);

      let scheduledCount = 0;

      if (opts.frequency === "daily") {
        const quote = MOTIVATIONAL_DAILY_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_DAILY_QUOTES.length)];
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Défi Épargne 🎯",
            body: quote,
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: safeHour,
            minute: safeMinute,
            channelId: REMINDER_CHANNEL_ID,
          },
        });
        scheduledCount = 1;
      } else if (opts.frequency === "twice_daily") {
        // Morning reminder
        const morningH = Math.min(Math.max(0, opts.morningHour ?? 8), 23);
        const morningM = Math.min(Math.max(0, opts.morningMinute ?? 30), 59);
        const morningQuote = MOTIVATIONAL_MORNING_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_MORNING_QUOTES.length)];

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Défi Épargne — Bonjour ! ☀️",
            body: morningQuote,
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: morningH,
            minute: morningM,
            channelId: REMINDER_CHANNEL_ID,
          },
        });

        // Evening reminder
        const eveningH = Math.min(Math.max(0, opts.eveningHour ?? 20), 23);
        const eveningM = Math.min(Math.max(0, opts.eveningMinute ?? 0), 59);
        const eveningQuote = MOTIVATIONAL_EVENING_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_EVENING_QUOTES.length)];

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Défi Épargne — Bilan du soir 🌙",
            body: eveningQuote,
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: eveningH,
            minute: eveningM,
            channelId: REMINDER_CHANNEL_ID,
          },
        });
        scheduledCount = 2;
      } else if (opts.frequency === "weekly") {
        // Weekly on chosen weekday (1: Sunday, 2: Monday, ..., 7: Saturday)
        const safeWeekday = Math.min(Math.max(1, opts.weekday ?? 1), 7);
        const weeklyQuote = WEEKLY_QUOTES[Math.floor(Math.random() * WEEKLY_QUOTES.length)];

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Défi Épargne — Bilan Hebdomadaire 📈",
            body: weeklyQuote,
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: safeWeekday,
            hour: safeHour,
            minute: safeMinute,
            channelId: REMINDER_CHANNEL_ID,
          },
        });
        scheduledCount = 1;
      } else if (opts.frequency === "monthly") {
        // Monthly on chosen day of month (e.g. 28th or 1st)
        const safeDay = Math.min(Math.max(1, opts.dayOfMonth ?? 28), 31);
        const monthlyQuote = MONTHLY_QUOTES[Math.floor(Math.random() * MONTHLY_QUOTES.length)];

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Défi Épargne — Bilan Mensuel & Paie 💳",
            body: monthlyQuote,
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
            day: safeDay,
            hour: safeHour,
            minute: safeMinute,
            channelId: REMINDER_CHANNEL_ID,
          },
        });
        scheduledCount = 1;
      }

      return { success: true, count: scheduledCount };
    } catch (err) {
      console.warn("[Notifications] Error scheduling reminders:", err);
      return { success: false, count: 0 };
    }
  },

  /**
   * Send a test notification.
   * If inSeconds > 0, schedules it with a countdown so the user can lock their phone and see background reception.
   */
  async sendTestNotification(inSeconds: number = 0): Promise<boolean> {
    if (Platform.OS === "web") return false;

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return false;

      if (inSeconds > 0) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Défi Épargne — Test Réussi ! 🔔",
            body: `Ce rappel a été délivré avec succès après ${inSeconds} secondes. Vos notifications d'épargne fonctionnent parfaitement ! 💪`,
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: inSeconds,
            repeats: false,
            channelId: REMINDER_CHANNEL_ID,
          },
        });
      } else {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Défi Épargne — Test Réussi ! 🔔",
            body: "Vos notifications fonctionnent parfaitement ! Vous recevrez vos rappels d'épargne avec succès. 💪",
            sound: true,
          },
          trigger: { channelId: REMINDER_CHANNEL_ID },
        });
      }
      return true;
    } catch (err) {
      console.warn("[Notifications] Error sending test notification:", err);
      return false;
    }
  },

  /**
   * Congratulate user immediately after a deposit
   */
  async sendCongratsNotification(challengeName: string, amountFormatted: string): Promise<void> {
    if (Platform.OS === "web") return;

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Félicitations ! 🎉",
          body: `Vous avez déposé ${amountFormatted} pour votre défi "${challengeName}". Chaque petit pas compte ! 🚀`,
          sound: true,
        },
        trigger: { channelId: REMINDER_CHANNEL_ID },
      });
    } catch (err) {
      console.warn("[Notifications] Error sending congrats notification:", err);
    }
  },

  async sendExportNotification(fileName: string, format: string): Promise<void> {
    if (Platform.OS === "web") return;

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Export réussi ! 📥",
          body: `Le fichier "${fileName}" (${format}) a été enregistré avec succès.`,
          sound: true,
        },
        trigger: { channelId: REMINDER_CHANNEL_ID },
      });
    } catch (err) {
      console.warn("[Notifications] Error sending export notification:", err);
    }
  },
};
