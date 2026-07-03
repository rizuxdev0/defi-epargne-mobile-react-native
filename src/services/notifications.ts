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

    const notificationContent = {
      title: "Goal Glow 🎯",
      body: "Prenez une minute pour mettre de l'argent de côté aujourd'hui ! Vos objectifs vous attendent. 💪",
      sound: true,
    };

    if (frequency === "daily") {
      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hour,
          minute: minute,
        },
      });
    } else if (frequency === "twice_daily") {
      // Schedule first reminder
      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hour,
          minute: minute,
        },
      });

      // Schedule second reminder 12 hours later
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Goal Glow 🎯",
          body: "Un petit rappel pour booster votre épargne ! Avez-vous atteint votre cible du jour ? 🚀",
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: (hour + 12) % 24,
          minute: minute,
        },
      });
    } else if (frequency === "weekly") {
      // Schedule weekly reminder on Sunday (weekday 1 in SchedulableTriggerInputTypes.WEEKLY)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Goal Glow — Bilan Hebdomadaire 🎯",
          body: "C'est la fin de la semaine ! Faites le point sur vos défis et validez vos économies. 📈",
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: 1, // Sunday
          hour: hour,
          minute: minute,
        },
      });
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
  }
};
