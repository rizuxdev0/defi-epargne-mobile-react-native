import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const MOTIVATIONAL_QUOTES = [
  "Chaque petit pas compte. Prêt pour ton versement du jour ? 🌱",
  "Épargner, ce n'est pas se priver, c'est s'offrir un avenir plus serein. 🛡️",
  "Un sou économisé est un sou gagné. Tes objectifs t'attendent ! 🎯",
  "La régularité bat la quantité. Coche ta case d'aujourd'hui ! 💪",
  "Fais aujourd'hui ce que ton futur toi te remerciera d'avoir fait. 🚀",
  "Construis ta liberté financière, un versement à la fois. 💎",
  "Plus tu commences tôt, plus vite tu atteindras les sommets ! 🏔️",
  "N'attends pas qu'il te reste de l'argent pour épargner, épargne d'abord ! 💰",
];

const WEEKLY_QUOTES = [
  "C'est l'heure du bilan hebdomadaire ! Fais le point sur tes défis et valide tes économies de la semaine. 📈",
  "Une semaine de plus vers la liberté financière ! Viens cocher tes progrès sur l'application. 🎯",
  "Bilan d'épargne de la semaine : as-tu gardé le rythme ? Tes défis t'attendent ! ⚡",
  "Chaque semaine est une opportunité de grandir. Coche tes versements et célèbre tes victoires. 🏆",
];

export const notificationService = {
  /**
   * Request permissions from the user. Returns true if granted.
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === "web") return false;
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === "granted";
  },

  /**
   * Cancel all existing reminders and schedule new reminders based on frequency, hour, and minute.
   * Schedules multiple days of notifications with unique motivational quotes.
   */
  async scheduleReminders(
    enabled: boolean, 
    hour: number, 
    minute: number, 
    frequency: "daily" | "twice_daily" | "weekly"
  ): Promise<void> {
    if (Platform.OS === "web") return;

    // First cancel all previous schedules to avoid duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (!enabled) return;

    // Request permissions first
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    if (frequency === "daily") {
      // Schedule 7 daily reminders with different quotes
      for (let i = 0; i < 7; i++) {
        const triggerDate = new Date();
        triggerDate.setDate(triggerDate.getDate() + i);
        triggerDate.setHours(hour, minute, 0, 0);

        if (triggerDate.getTime() <= Date.now()) {
          triggerDate.setDate(triggerDate.getDate() + 1);
        }

        const quote = MOTIVATIONAL_QUOTES[i % MOTIVATIONAL_QUOTES.length];

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Défi Épargne 🎯",
            body: quote,
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
        });
      }
    } else if (frequency === "twice_daily") {
      // Schedule 7 days of twice daily reminders
      for (let i = 0; i < 7; i++) {
        // Morning/Primary trigger
        const triggerDate1 = new Date();
        triggerDate1.setDate(triggerDate1.getDate() + i);
        triggerDate1.setHours(hour, minute, 0, 0);

        if (triggerDate1.getTime() <= Date.now()) {
          triggerDate1.setDate(triggerDate1.getDate() + 1);
        }

        const quote1 = MOTIVATIONAL_QUOTES[i % MOTIVATIONAL_QUOTES.length];

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Défi Épargne 🎯",
            body: quote1,
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate1,
          },
        });

        // Evening trigger (12 hours later)
        const triggerDate2 = new Date();
        triggerDate2.setDate(triggerDate2.getDate() + i);
        triggerDate2.setHours((hour + 12) % 24, minute, 0, 0);

        if (triggerDate2.getTime() <= Date.now()) {
          triggerDate2.setDate(triggerDate2.getDate() + 1);
        }

        const quote2 = MOTIVATIONAL_QUOTES[(i + 4) % MOTIVATIONAL_QUOTES.length];

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Défi Épargne 🎯",
            body: `Petit coup de pouce : ${quote2}`,
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate2,
          },
        });
      }
    } else if (frequency === "weekly") {
      // Schedule 4 weekly reminders (once a week for 4 weeks) with different weekly quotes
      for (let i = 0; i < 4; i++) {
        const triggerDate = new Date();
        triggerDate.setDate(triggerDate.getDate() + i * 7);
        // Find next Sunday (or preferred weekday)
        const currentDay = triggerDate.getDay();
        const distanceToSunday = (7 - currentDay) % 7;
        triggerDate.setDate(triggerDate.getDate() + distanceToSunday);
        triggerDate.setHours(hour, minute, 0, 0);

        if (triggerDate.getTime() <= Date.now()) {
          triggerDate.setDate(triggerDate.getDate() + 7);
        }

        const quote = WEEKLY_QUOTES[i % WEEKLY_QUOTES.length];

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Défi Épargne — Bilan Hebdomadaire 🎯",
            body: quote,
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
        });
      }
    }
  },

  /**
   * Send an immediate congratulate message when a deposit is saved
   */
  async sendCongratsNotification(challengeName: string, amountFormatted: string): Promise<void> {
    if (Platform.OS === "web") return;
    
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Félicitations ! 🎉",
        body: `Vous avez déposé ${amountFormatted} pour votre défi "${challengeName}". Chaque petit pas compte ! 🚀`,
        sound: true,
      },
      trigger: null, // Send immediately
    });
  },

  async sendExportNotification(fileName: string, format: string): Promise<void> {
    if (Platform.OS === "web") return;
    
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Export réussi ! 📥",
        body: `Le fichier "${fileName}" (${format}) a été enregistré avec succès.`,
        sound: true,
      },
      trigger: null, // Send immediately
    });
  }
};
