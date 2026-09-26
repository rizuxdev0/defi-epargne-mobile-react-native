import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
  FlatList,
  Dimensions,
  Share,
  Switch,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Trash2,
  CheckCircle2,
  Circle,
  AlertCircle,
  FileDown,
  FileSpreadsheet,
  FileText,
  Archive,
  RotateCcw,
  Share2,
  Plus,
  ShieldAlert,
  X,
  Zap,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Download,
  Clock,
  Coins,
} from "lucide-react-native";
import { useApp } from "../services/AppContext";
import { useMoneyFormatter } from "../hooks/useMoneyFormatter";
import { COLORS } from "../lib/theme";
import { getCategory } from "../lib/categories";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { notificationService } from "../services/notifications";
import Confetti from "../components/Confetti";

const { width } = Dimensions.get("window");
const CARD_MARGIN = 8;
const NUM_COLUMNS = width > 520 ? 4 : 3;

export default function ChallengeDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const {
    profile,
    challenges,
    installments,
    toggleInstallment,
    deleteChallenge,
    updateChallenge,
    toggleInstallmentsBatch,
    addCustomInstallment,
    withdrawFromChallenge,
  } = useApp();
  const fmt = useMoneyFormatter();

  const isHidden = !!profile?.balance_hidden;
  const formatMoney = (amount: number) => (isHidden ? "••••" : fmt(amount));

  const themeColors = COLORS[profile?.theme || "light"];
  const challenge = challenges.find((c) => c.id === id);

  const challengeInsts = useMemo(() => {
    return installments
      .filter((i) => i.challenge_id === id)
      .sort((a, b) => a.position - b.position);
  }, [installments, id]);

  const [filter, setFilter] = useState<"all" | "todo" | "done">("all");
  const [confettiActive, setConfettiActive] = useState(false);
  const [autoDepositAmount, setAutoDepositAmount] = useState("");
  const [customDepositAmount, setCustomDepositAmount] = useState("");
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawReason, setWithdrawReason] = useState("Santé 🏥");

  const [exportFilterActive, setExportFilterActive] = useState(false);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportIncludeUnchecked, setExportIncludeUnchecked] = useState(true);
  const [exportPanelVisible, setExportPanelVisible] = useState(false);

  const forecastText = useMemo(() => {
    if (!challenge || challengeInsts.length === 0) return "";
    
    const checkedInsts = challengeInsts.filter((i) => i.is_checked);
    const uncheckedCount = challengeInsts.length - checkedInsts.length;

    if (uncheckedCount === 0) {
      return "Félicitations ! Ce défi est complété à 100% 🎉";
    }
    if (checkedInsts.length === 0) {
      return "Coche ton premier versement pour démarrer les prévisions ⏱️";
    }

    const startD = new Date(challenge.start_date);
    const today = new Date();
    const diffTime = Math.max(0, today.getTime() - startD.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    const rhythm = checkedInsts.length / diffDays;
    
    if (rhythm <= 0) {
      return "Coche d'autres versements pour estimer la fin ⏱️";
    }

    const remainingDays = Math.ceil(uncheckedCount / rhythm);
    const estDate = new Date();
    estDate.setDate(today.getDate() + remainingDays);

    const formattedEstDate = estDate.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    return `Fin estimée : ${formattedEstDate} (~${remainingDays} j à ce rythme)`;
  }, [challengeInsts, challenge?.start_date]);

  const handleAutoDeposit = async () => {
    if (!challenge) return;
    
    const amount = parseInt(autoDepositAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Erreur", "Veuillez entrer un montant valide supérieur à 0.");
      return;
    }

    const unchecked = challengeInsts.filter((i) => !i.is_checked);
    if (unchecked.length === 0) {
      Alert.alert("Erreur", "Toutes les cases de ce défi sont déjà cochées !");
      return;
    }

    const totalRemaining = unchecked.reduce((sum, i) => sum + i.amount, 0);
    if (amount > totalRemaining) {
      Alert.alert(
        "Montant trop élevé ⚠️",
        `Le montant saisi (${fmt(amount)}) dépasse le montant total restant à épargner (${fmt(totalRemaining)}).`
      );
      return;
    }

    // Fast step/GCD calculation to avoid large memory allocations on devises with large numbers (XOF, JPY, CLP)
    const gcd = (a: number, b: number): number => {
      let x = Math.abs(a);
      let y = Math.abs(b);
      while (y) {
        const t = y;
        y = x % y;
        x = t;
      }
      return x || 1;
    };

    let step = amount;
    for (const inst of unchecked) {
      step = gcd(step, inst.amount);
      if (step === 1) break;
    }

    const scaledAmount = Math.floor(amount / step);
    let toCheck: typeof unchecked = [];
    let scenario: "exact" | "under" | "over" = "exact";

    // Dynamic programming subset-sum if scaled amount is bounded (<= 15000), otherwise fast greedy fallback
    if (scaledAmount <= 15000) {
      const dp = new Array(scaledAmount + 1).fill(false);
      dp[0] = true;
      const parent = new Array(scaledAmount + 1).fill(null);

      for (const inst of unchecked) {
        const val = Math.floor(inst.amount / step);
        for (let w = scaledAmount; w >= val; w--) {
          if (dp[w - val] && !dp[w]) {
            dp[w] = true;
            parent[w] = inst;
          }
        }
      }

      let bestSum = scaledAmount;
      while (bestSum > 0 && !dp[bestSum]) {
        bestSum--;
      }

      if (bestSum > 0) {
        let curr = bestSum;
        while (curr > 0) {
          const inst = parent[curr];
          if (!inst) break;
          toCheck.push(inst);
          curr -= Math.floor(inst.amount / step);
        }
        if (bestSum < scaledAmount) {
          scenario = "under";
        }
      }
    } else {
      // Fast greedy subset approximation for huge sums
      const sorted = [...unchecked].sort((a, b) => b.amount - a.amount);
      let curSum = 0;
      for (const inst of sorted) {
        if (curSum + inst.amount <= amount) {
          toCheck.push(inst);
          curSum += inst.amount;
        }
      }
      if (curSum > 0 && curSum < amount) {
        scenario = "under";
      }
    }

    // If no subset could be selected, find the smallest single installment that exceeds 'amount'
    if (toCheck.length === 0) {
      const sortedUnchecked = [...unchecked].sort((a, b) => a.amount - b.amount);
      const smallestExceeding = sortedUnchecked.find((i) => i.amount >= amount);
      if (smallestExceeding) {
        toCheck.push(smallestExceeding);
        scenario = "over";
      }
    }

    if (toCheck.length === 0) {
      Alert.alert("Aucune combinaison ⚠️", "Aucun versement disponible ne correspond ou ne se rapproche de ce montant.");
      return;
    }

    const totalCalculated = toCheck.reduce((sum, i) => sum + i.amount, 0);
    
    let alertTitle = "Dépôt Intelligent ⚡";
    let alertMessage = "";

    if (scenario === "exact") {
      alertTitle = "Combinaison exacte trouvée ! 🎉";
      alertMessage = `Nous te proposons de cocher ${toCheck.length} case(s) pour un total exact de ${fmt(totalCalculated)}.\n\nEs-tu sûr ?`;
    } else if (scenario === "under") {
      alertTitle = "Combinaison la plus proche (En-dessous) ⏱️";
      alertMessage = `Nous avons trouvé une combinaison de ${toCheck.length} case(s) pour un montant de ${fmt(totalCalculated)} (Reste non couvert : ${fmt(amount - totalCalculated)}).\n\nEs-tu sûr ?`;
    } else {
      alertTitle = "Versement le plus proche (Au-dessus) ⏱️";
      alertMessage = `Aucune case n'est assez petite pour correspondre. Nous te proposons de cocher 1 case d'un montant de ${fmt(totalCalculated)} (Surplus de : ${fmt(totalCalculated - amount)}).\n\nEs-tu sûr ?`;
    }

    Alert.alert(
      alertTitle,
      alertMessage,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer et cocher",
          onPress: async () => {
            try {
              const isCompleting = unchecked.length === toCheck.length;

              const ids = toCheck.map((i) => i.id);
              await toggleInstallmentsBatch(ids);

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

              if (isCompleting) {
                setConfettiActive(true);
                setTimeout(() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }, 250);
              }

              setAutoDepositAmount("");
              Alert.alert("Succès ✅", `${toCheck.length} versement(s) coché(s) !`);
            } catch (e) {
              Alert.alert("Erreur", "Impossible de valider le dépôt.");
            }
          },
        },
      ]
    );
  };

  if (!challenge) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color={themeColors.destructive} />
          <Text style={[styles.errorText, { color: themeColors.foreground }]}>Défi introuvable</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={{ color: themeColors.primary }}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const parseDate = (str: string) => {
    const parts = str.split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  };

  const exportInsts = useMemo(() => {
    let list = [...challengeInsts];
    
    if (!exportIncludeUnchecked) {
      list = list.filter((inst) => inst.is_checked);
    }
    
    if (exportFilterActive) {
      const start = parseDate(exportStartDate);
      const end = parseDate(exportEndDate);
      
      list = list.filter((inst) => {
        if (!inst.is_checked) return exportIncludeUnchecked;
        if (!inst.checked_at) return false;
        
        const d = new Date(inst.checked_at);
        const checkDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        
        if (start) {
          const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
          if (checkDate < startDateOnly) return false;
        }
        if (end) {
          const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
          if (checkDate > endDateOnly) return false;
        }
        return true;
      });
    }
    
    return list;
  }, [challengeInsts, exportFilterActive, exportStartDate, exportEndDate, exportIncludeUnchecked]);

  const saved = challengeInsts.filter((i) => i.is_checked).reduce((sum, i) => sum + i.amount, 0);
  const pct = Math.min(100, Math.round((saved / challenge.target_amount) * 100));

  const getHTMLContent = () => {
    // If filter is active, calculate stats based on exportInsts. Otherwise, use global stats
    const exportSaved = exportFilterActive
      ? exportInsts.filter((i) => i.is_checked).reduce((sum, i) => sum + i.amount, 0)
      : saved;
    const exportPct = Math.min(100, Math.round((exportSaved / challenge.target_amount) * 100));
    const remaining = Math.max(0, challenge.target_amount - exportSaved);

    const formattedTarget = fmt(challenge.target_amount);
    const formattedSaved = fmt(exportSaved);
    const formattedRemaining = fmt(remaining);

    // Calculate dates & days elapsed
    const startD = new Date(challenge.start_date);
    const formattedStartDate = startD.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - startD.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    // Filtered stats
    const checkedCount = exportInsts.filter((i) => i.is_checked).length;
    const totalCount = exportInsts.length;
    const avgInstallment = checkedCount > 0 ? exportSaved / checkedCount : 0;
    const maxInstallment = exportInsts.filter((i) => i.is_checked).length > 0
      ? Math.max(...exportInsts.filter((i) => i.is_checked).map((i) => i.amount))
      : 0;
    const rhythm = checkedCount / diffDays;

    const rows = exportInsts.map((inst, index) => {
      const dateStr = inst.checked_at 
        ? new Date(inst.checked_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
        : "-";
      const rowBg = index % 2 === 1 ? "background-color: #F8F7FC;" : "background-color: #ffffff;";
      return `
        <tr style="${rowBg}">
          <td style="padding: 10px; border-bottom: 1px solid #EBE8F5; text-align: center; font-size: 13px; color: #4b5563;">${index + 1}</td>
          <td style="padding: 10px; border-bottom: 1px solid #EBE8F5; text-align: right; font-weight: bold; font-size: 13px; color: #1e1b4b;">${fmt(inst.amount)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #EBE8F5; text-align: center; font-size: 13px; font-weight: bold; color: ${inst.is_checked ? "#10B981" : "#EF4444"};">${inst.is_checked ? "Épargné" : "À faire"}</td>
          <td style="padding: 10px; border-bottom: 1px solid #EBE8F5; text-align: center; font-size: 13px; color: #4b5563;">${dateStr}</td>
        </tr>
      `;
    }).join("");

    const dateFilterNote = exportFilterActive
      ? `<div style="background-color: #FFFBEB; border: 1px solid #FDE68A; padding: 10px 15px; border-radius: 8px; font-size: 12px; color: #B45309; margin-bottom: 20px;">
          ⚠️ <strong>Filtre actif :</strong> Seuls les versements validés entre le <strong>${exportStartDate || "début"}</strong> et le <strong>${exportEndDate || "aujourd'hui"}</strong> sont exportés.
         </div>`
      : "";

    return `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 0; margin: 0; color: #333; background-color: #ffffff; }
            .header-banner { background-color: #6C3FC4; color: white; padding: 30px 24px; text-align: left; }
            .header-subtitle { font-size: 11px; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 6px; opacity: 0.8; }
            .header-title { font-size: 28px; font-weight: 800; margin: 0 0 6px 0; }
            .header-desc { font-size: 13px; font-style: italic; margin: 0; opacity: 0.9; }
            .header-date { font-size: 11px; margin-top: 10px; opacity: 0.7; }
            
            .content { padding: 24px; }
            
            .section-title { border-left: 4px solid #6C3FC4; padding-left: 10px; font-size: 16px; font-weight: bold; color: #1e1b4b; margin-top: 25px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
            
            .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; background-color: #ffffff; }
            .grid-table td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #EBE8F5; }
            .grid-label { font-weight: bold; color: #4b5563; width: 35%; }
            .grid-value { color: #1f2937; font-weight: 500; }
            
            .progress-container { width: 100%; background-color: #EBE8F5; height: 18px; border-radius: 9px; margin: 15px 0 25px 0; overflow: hidden; position: relative; }
            .progress-fill { height: 100%; background-color: #6C3FC4; width: ${exportPct}%; border-radius: 9px; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: bold; }
            
            .stats-table { width: 100%; border-collapse: collapse; }
            .stats-table th { background-color: #6C3FC4; color: white; padding: 12px; font-size: 13px; font-weight: bold; text-align: left; }
            
            .footer { margin-top: 40px; border-top: 1px solid #EBE8F5; padding-top: 15px; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="header-banner">
            <div class="header-subtitle">Défi Épargne</div>
            <h1 class="header-title">${challenge.emoji || "🎯"} ${challenge.name}</h1>
            ${challenge.description ? `<p class="header-desc">${challenge.description}</p>` : ""}
            <div class="header-date">Exporté le ${new Date().toLocaleDateString("fr-FR")}</div>
          </div>
          
          <div class="content">
            ${dateFilterNote}

            <div class="section-title">Vue d'ensemble</div>
            <table class="grid-table">
              <tr>
                <td class="grid-label">Objectif :</td>
                <td class="grid-value" style="font-weight: bold; color: #6C3FC4;">${formattedTarget}</td>
              </tr>
              <tr style="background-color: #F8F7FC;">
                <td class="grid-label">Déjà épargné :</td>
                <td class="grid-value" style="font-weight: bold; color: #10B981;">${formattedSaved} (${exportPct}%)</td>
              </tr>
              <tr>
                <td class="grid-label">Restant :</td>
                <td class="grid-value" style="font-weight: bold; color: #EF4444;">${formattedRemaining}</td>
              </tr>
              <tr style="background-color: #F8F7FC;">
                <td class="grid-label">Démarré le :</td>
                <td class="grid-value">${formattedStartDate}</td>
              </tr>
              <tr>
                <td class="grid-label">Mode :</td>
                <td class="grid-value" style="text-transform: capitalize;">${challenge.mode}</td>
              </tr>
            </table>
            
            <div class="progress-container">
              <div class="progress-fill">${exportPct}%</div>
            </div>
            
            <div class="section-title">Statistiques</div>
            <table class="grid-table">
              <tr>
                <td class="grid-label">Versements cochés :</td>
                <td class="grid-value">${checkedCount} / ${totalCount}</td>
              </tr>
              <tr style="background-color: #F8F7FC;">
                <td class="grid-label">Versement moyen :</td>
                <td class="grid-value">${fmt(Math.round(avgInstallment))}</td>
              </tr>
              <tr>
                <td class="grid-label">Plus gros versement :</td>
                <td class="grid-value">${fmt(maxInstallment)}</td>
              </tr>
              <tr style="background-color: #F8F7FC;">
                <td class="grid-label">Rythme :</td>
                <td class="grid-value">~ ${rhythm.toFixed(2)} versement(s) / jour</td>
              </tr>
            </table>
            
            <div class="section-title">Détail des versements</div>
            <table class="stats-table">
              <thead>
                <tr>
                  <th style="text-align: center; width: 15%; border-top-left-radius: 6px; border-bottom-left-radius: 6px;">N°</th>
                  <th style="text-align: right; width: 35%;">Montant</th>
                  <th style="text-align: center; width: 20%;">Statut</th>
                  <th style="text-align: center; width: 30%; border-top-right-radius: 6px; border-bottom-right-radius: 6px;">Date de versement</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
            
            <div class="footer">
              <div>Généré par Défi Épargne — Chaque franc compte</div>
              <div style="text-align: right;">Défi Épargne Mobile</div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const saveFileToDevice = async (fileName: string, content: string, mimeType: string) => {
    try {
      // Try StorageAccessFramework first (lets user pick save location)
      if (Platform.OS === "android") {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            fileName,
            mimeType
          );
          await FileSystem.writeAsStringAsync(fileUri, content, {
            encoding: mimeType.includes("pdf") ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8,
          });
          Alert.alert("Succès ✅", `Le fichier "${fileName}" a été enregistré avec succès sur votre téléphone !`);
          
          const ext = fileName.split(".").pop()?.toUpperCase() || "DOCX";
          notificationService.sendExportNotification(fileName, ext);
          return;
        }
      }
      // Fallback: use expo-sharing
      const tempUri = FileSystem.cacheDirectory + fileName;
      await FileSystem.writeAsStringAsync(tempUri, content, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(tempUri, { mimeType, dialogTitle: `Enregistrer ${fileName}` });
        const ext = fileName.split(".").pop()?.toUpperCase() || "DOCX";
        notificationService.sendExportNotification(fileName, ext);
      } else {
        Alert.alert("Erreur", "Le partage n'est pas disponible sur cet appareil.");
      }
    } catch (e: any) {
      console.error("Export error:", e);
      Alert.alert("Erreur", e.message || "Impossible d'enregistrer le fichier.");
    }
  };

  const handleExportPDF = async () => {
    try {
      const html = getHTMLContent();
      const { uri } = await Print.printToFileAsync({ html });

      const pdfFileName = `defi-${challenge.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;

      if (Platform.OS === "android") {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const pdfBase64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
          const newFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            pdfFileName,
            "application/pdf"
          );
          await FileSystem.writeAsStringAsync(newFileUri, pdfBase64, { encoding: FileSystem.EncodingType.Base64 });
          Alert.alert("Succès ✅", `Le rapport PDF "${pdfFileName}" a été enregistré sur votre téléphone !`);
          notificationService.sendExportNotification(pdfFileName, "PDF");
          return;
        }
      }
      // Fallback
      const newUri = FileSystem.cacheDirectory + pdfFileName;
      await FileSystem.moveAsync({ from: uri, to: newUri });
      await Sharing.shareAsync(newUri, { mimeType: "application/pdf", dialogTitle: "Exporter en PDF" });
      notificationService.sendExportNotification(pdfFileName, "PDF");
    } catch (e) {
      Alert.alert("Erreur", "Impossible d'exporter en PDF.");
    }
  };

  const handleExportWord = async () => {
    try {
      const html = getHTMLContent();
      const fileName = `defi-${challenge.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.docx`;
      await saveFileToDevice(fileName, html, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    } catch (e) {
      Alert.alert("Erreur", "Impossible d'exporter en Word.");
    }
  };

  const handleExportExcel = async () => {
    try {
      const headers = "Tranche,Montant,Valide,Date de depot\n";
      const rows = exportInsts.map((inst, index) => {
        const dateStr = inst.checked_at 
          ? new Date(inst.checked_at).toLocaleDateString("fr-FR")
          : "-";
        return `${index + 1},${inst.amount},${inst.is_checked ? "OUI" : "NON"},${dateStr}`;
      }).join("\n");
      const csvContent = headers + rows;

      const fileName = `defi-${challenge.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
      await saveFileToDevice(fileName, csvContent, "text/csv");
    } catch (e) {
      Alert.alert("Erreur", "Impossible d'exporter en Excel.");
    }
  };

  const handleShareProgress = async () => {
    try {
      const progressPercent = pct;
      const totalCount = challengeInsts.length;
      const checkedCount = challengeInsts.filter((i) => i.is_checked).length;
      
      const filledBlocks = Math.round(progressPercent / 10);
      const emptyBlocks = 10 - filledBlocks;
      const bar = "🟩".repeat(filledBlocks) + "⬜".repeat(emptyBlocks);

      const shareMessage = `Défi Épargne 🎯\n` +
        `Mon défi : ${challenge.emoji || "🎯"} *${challenge.name}*\n` +
        `Progression : ${bar} ${progressPercent}%\n` +
        `Épargné : ${fmt(saved)} / ${fmt(challenge.target_amount)} (${checkedCount}/${totalCount} versements)\n\n` +
        `Rejoins-moi sur Défi Épargne pour épargner malin ! ✨`;

      await Share.share({
        message: shareMessage,
      });
    } catch (e: any) {
      Alert.alert("Erreur", "Impossible de partager la progression.");
    }
  };

  const filteredInsts = challengeInsts.filter((i) => {
    if (filter === "todo") return !i.is_checked;
    if (filter === "done") return i.is_checked;
    return true;
  });

  const cat = getCategory(challenge.category);

  const handleToggle = async (instId: string) => {
    try {
      const inst = challengeInsts.find((i) => i.id === instId);
      const wasChecked = inst?.is_checked;

      // Trigger haptic feedback for satisfying user action
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const uncheckedCount = challengeInsts.filter((i) => !i.is_checked).length;
      const isCompleting = !wasChecked && uncheckedCount === 1;

      await toggleInstallment(instId);

      if (isCompleting) {
        setConfettiActive(true);
        setTimeout(() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, 250);
      }

      if (inst && !wasChecked && profile?.notifications_enabled) {
        notificationService.sendCongratsNotification(challenge.name, fmt(inst.amount));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Supprimer le défi",
      "Es-tu sûr de vouloir supprimer ce défi d'épargne ? Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            await deleteChallenge(id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleArchiveToggle = async () => {
    try {
      const newStatus = challenge.status === "active" ? "archived" : "active";
      await updateChallenge(challenge.id, { status: newStatus });
      Alert.alert(
        "Succès",
        newStatus === "archived"
          ? "Le défi a été archivé avec succès."
          : "Le défi a été réactivé avec succès."
      );
    } catch (e) {
      Alert.alert("Erreur", "Impossible de modifier le statut d'archivage.");
    }
  };

  const isXOF = (profile?.currency_code || "XOF").toUpperCase() === "XOF";
  const quickDepositChips = isXOF ? [5000, 10000, 25000] : [10, 20, 50];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={20} color={themeColors.foreground} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: themeColors.foreground }]} numberOfLines={1}>
            {challenge.name}
          </Text>
          <View style={styles.statusBadgeRow}>
            {challenge.status === "completed" ? (
              <View style={[styles.statusBadge, { backgroundColor: `${themeColors.secondary}20`, borderColor: themeColors.secondary }]}>
                <Text style={[styles.statusBadgeText, { color: themeColors.secondary }]}>🏆 Défi accompli</Text>
              </View>
            ) : challenge.status === "archived" ? (
              <View style={[styles.statusBadge, { backgroundColor: `${themeColors.mutedForeground}20`, borderColor: themeColors.mutedForeground }]}>
                <Text style={[styles.statusBadgeText, { color: themeColors.mutedForeground }]}>📦 Archivé</Text>
              </View>
            ) : (
              <View style={[styles.statusBadge, { backgroundColor: `${themeColors.primary}18`, borderColor: themeColors.primary }]}>
                <Text style={[styles.statusBadgeText, { color: themeColors.primary }]}>⚡ Défi en cours</Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
            onPress={handleArchiveToggle}
          >
            {challenge.status === "active" ? (
              <Archive size={18} color={themeColors.primary} />
            ) : (
              <RotateCcw size={18} color={themeColors.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: `${themeColors.destructive}12`, borderColor: `${themeColors.destructive}30` }]}
            onPress={handleDelete}
          >
            <Trash2 size={18} color={themeColors.destructive} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredInsts}
        keyExtractor={(item) => item.id}
        numColumns={NUM_COLUMNS}
        key={NUM_COLUMNS.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={
          <>
            {/* Hero Card */}
            <LinearGradient
              colors={themeColors.gradientHero}
              style={styles.heroCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Top Row: Glowing Emoji + Titles + Percentage badge */}
              <View style={styles.heroTop}>
                <View style={styles.emojiBg}>
                  <Text style={styles.emoji}>{challenge.emoji || "🎯"}</Text>
                </View>
                <View style={styles.heroInfo}>
                  <Text style={styles.heroName} numberOfLines={1}>{challenge.name}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                    {cat && (
                      <View style={styles.catPill}>
                        <Text style={styles.catPillText}>{cat.emoji} {cat.label}</Text>
                      </View>
                    )}
                    <View style={styles.modePill}>
                      <Text style={styles.modePillText}>
                        {challenge.mode === "free" ? "Libre" : challenge.mode === "random" ? "Aléatoire" : "Régulier"}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.heroPctBadge}>
                  <Text style={styles.heroPctText}>{pct}%</Text>
                </View>
              </View>

              {/* Progress Track */}
              <View style={styles.progressBg}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${pct}%`, backgroundColor: themeColors.secondary },
                  ]}
                />
              </View>

              {/* 3-Column Glass Metric Cards */}
              <View style={styles.metricsRow}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>ÉPARGNÉ</Text>
                  <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
                    {formatMoney(saved)}
                  </Text>
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>RESTANT</Text>
                  <Text style={[styles.metricValue, { color: "#FDE68A" }]} numberOfLines={1} adjustsFontSizeToFit>
                    {formatMoney(Math.max(0, challenge.target_amount - saved))}
                  </Text>
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>OBJECTIF</Text>
                  <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
                    {formatMoney(challenge.target_amount)}
                  </Text>
                </View>
              </View>

              {/* Forecast Ribbon */}
              <View style={styles.forecastRibbon}>
                <Clock size={12} color="rgba(255,255,255,0.9)" />
                <Text style={styles.forecastText} numberOfLines={1}>
                  {forecastText}
                </Text>
              </View>
            </LinearGradient>

            {/* Quick Actions Toolbar */}
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.quickActionBtn, { backgroundColor: `${themeColors.primary}15`, borderColor: `${themeColors.primary}40` }]}
                onPress={handleShareProgress}
              >
                <Share2 size={16} color={themeColors.primary} />
                <Text style={[styles.quickActionText, { color: themeColors.primary }]}>Partager</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.quickActionBtn,
                  {
                    backgroundColor: exportPanelVisible ? `${themeColors.primary}20` : themeColors.card,
                    borderColor: exportPanelVisible ? themeColors.primary : themeColors.border,
                  },
                ]}
                onPress={() => setExportPanelVisible(!exportPanelVisible)}
              >
                <Download size={16} color={themeColors.primary} />
                <Text style={[styles.quickActionText, { color: themeColors.foreground }]}>Rapports</Text>
                {exportPanelVisible ? (
                  <ChevronUp size={14} color={themeColors.mutedForeground} />
                ) : (
                  <ChevronDown size={14} color={themeColors.mutedForeground} />
                )}
              </TouchableOpacity>

              {saved > 0 && challenge.status === "active" && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.quickActionBtn, { backgroundColor: `${themeColors.destructive}12`, borderColor: `${themeColors.destructive}35` }]}
                  onPress={() => setWithdrawModalVisible(true)}
                >
                  <ShieldAlert size={16} color={themeColors.destructive} />
                  <Text style={[styles.quickActionText, { color: themeColors.destructive }]}>Coup dur</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Collapsible Export Panel */}
            {exportPanelVisible && (
              <View style={[styles.exportCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <Sparkles size={16} color={themeColors.primary} />
                  <Text style={{ fontSize: 13, fontWeight: "bold", color: themeColors.foreground }}>
                    Génération de rapports & exports
                  </Text>
                </View>

                {/* Export format buttons */}
                <View style={styles.exportFormatsRow}>
                  <TouchableOpacity
                    style={[styles.exportFormatBtn, { borderColor: "#EF444440", backgroundColor: "#EF444410" }]}
                    onPress={handleExportPDF}
                  >
                    <FileDown size={15} color="#EF4444" />
                    <Text style={[styles.exportFormatText, { color: "#EF4444" }]}>PDF Pro</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.exportFormatBtn, { borderColor: "#2563EB40", backgroundColor: "#2563EB10" }]}
                    onPress={handleExportWord}
                  >
                    <FileText size={15} color="#2563EB" />
                    <Text style={[styles.exportFormatText, { color: "#2563EB" }]}>Word (.docx)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.exportFormatBtn, { borderColor: "#10B98140", backgroundColor: "#10B98110" }]}
                    onPress={handleExportExcel}
                  >
                    <FileSpreadsheet size={15} color="#10B981" />
                    <Text style={[styles.exportFormatText, { color: "#10B981" }]}>Excel (.csv)</Text>
                  </TouchableOpacity>
                </View>

                {/* Switch 1: Include Unchecked */}
                <View style={styles.switchRow}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: themeColors.foreground }}>
                      📋 Inclure les tranches non cochées
                    </Text>
                    <Text style={{ fontSize: 10, color: themeColors.mutedForeground }}>
                      Génère la grille complète du défi
                    </Text>
                  </View>
                  <Switch
                    value={exportIncludeUnchecked}
                    onValueChange={setExportIncludeUnchecked}
                    trackColor={{ false: themeColors.border, true: themeColors.primary }}
                  />
                </View>

                {/* Switch 2: Date Filter */}
                <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: themeColors.border, paddingTop: 8 }]}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: themeColors.foreground }}>
                      📅 Filtrer par période de validation
                    </Text>
                    <Text style={{ fontSize: 10, color: themeColors.mutedForeground }}>
                      Exporter uniquement les dépôts d'un intervalle
                    </Text>
                  </View>
                  <Switch
                    value={exportFilterActive}
                    onValueChange={setExportFilterActive}
                    trackColor={{ false: themeColors.border, true: themeColors.primary }}
                  />
                </View>

                {exportFilterActive && (
                  <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: themeColors.mutedForeground, marginBottom: 4 }}>
                        Début (JJ/MM/AAAA)
                      </Text>
                      <TextInput
                        style={[styles.dateInput, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.foreground }]}
                        keyboardType="numeric"
                        value={exportStartDate}
                        onChangeText={(text) => {
                          let cleaned = text.replace(/[^0-9]/g, "");
                          if (cleaned.length > 2) cleaned = cleaned.slice(0, 2) + "/" + cleaned.slice(2);
                          if (cleaned.length > 5) cleaned = cleaned.slice(0, 5) + "/" + cleaned.slice(5);
                          if (cleaned.length > 10) cleaned = cleaned.slice(0, 10);
                          setExportStartDate(cleaned);
                        }}
                        placeholder="01/01/2026"
                        placeholderTextColor={themeColors.mutedForeground}
                        maxLength={10}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: themeColors.mutedForeground, marginBottom: 4 }}>
                        Fin (JJ/MM/AAAA)
                      </Text>
                      <TextInput
                        style={[styles.dateInput, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.foreground }]}
                        keyboardType="numeric"
                        value={exportEndDate}
                        onChangeText={(text) => {
                          let cleaned = text.replace(/[^0-9]/g, "");
                          if (cleaned.length > 2) cleaned = cleaned.slice(0, 2) + "/" + cleaned.slice(2);
                          if (cleaned.length > 5) cleaned = cleaned.slice(0, 5) + "/" + cleaned.slice(5);
                          if (cleaned.length > 10) cleaned = cleaned.slice(0, 10);
                          setExportEndDate(cleaned);
                        }}
                        placeholder="31/12/2026"
                        placeholderTextColor={themeColors.mutedForeground}
                        maxLength={10}
                      />
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Free Mode Deposit Card */}
            {challenge.mode === "free" && challenge.status === "active" && (
              <View style={[styles.depositCard, { backgroundColor: themeColors.card, borderColor: themeColors.primary }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Plus size={18} color={themeColors.primary} />
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: themeColors.foreground }}>
                    Nouveau Versement Libre
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: themeColors.mutedForeground, marginBottom: 10 }}>
                  Saisis la somme exacte à ajouter à ton épargne aujourd'hui.
                </Text>

                {/* Quick Chips */}
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
                  {quickDepositChips.map((chip) => (
                    <TouchableOpacity
                      key={chip}
                      style={[styles.quickChip, { backgroundColor: themeColors.muted, borderColor: themeColors.border }]}
                      onPress={() => setCustomDepositAmount(chip.toString())}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "700", color: themeColors.primary }}>
                        +{chip.toLocaleString("fr-FR")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TextInput
                    style={[styles.depositInput, { color: themeColors.foreground, backgroundColor: themeColors.background, borderColor: themeColors.border }]}
                    placeholder={`ex: 10 000 (${profile?.currency_symbol || ""})`}
                    placeholderTextColor={themeColors.mutedForeground}
                    keyboardType="numeric"
                    value={customDepositAmount}
                    onChangeText={setCustomDepositAmount}
                  />
                  <TouchableOpacity
                    style={[styles.depositBtn, { backgroundColor: themeColors.primary }]}
                    onPress={async () => {
                      const amount = parseFloat(customDepositAmount.replace(/\s+/g, "").replace(",", "."));
                      if (isNaN(amount) || amount <= 0) {
                        Alert.alert("Montant invalide", "Veuillez entrer un montant supérieur à 0.");
                        return;
                      }
                      try {
                        await addCustomInstallment(challenge.id, amount);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        setCustomDepositAmount("");
                        notificationService.sendCongratsNotification(challenge.name, fmt(amount));
                        Alert.alert("Bravo ! 🎉", `Versement de ${fmt(amount)} enregistré avec succès.`);
                      } catch (e: any) {
                        Alert.alert("Erreur", e.message || "Impossible d'enregistrer le versement.");
                      }
                    }}
                  >
                    <Text style={{ color: "white", fontSize: 13, fontWeight: "bold" }}>Verser</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Auto-deposit Card (for random and regular modes) */}
            {challenge.mode !== "free" && challenge.status === "active" && (
              <View style={[styles.depositCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Zap size={18} color={themeColors.primary} />
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: themeColors.foreground }}>
                    Auto-Dépôt Intelligent
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: themeColors.mutedForeground, marginBottom: 10 }}>
                  Saisis une somme et l'algorithme trouvera et cochera automatiquement la combinaison optimale de cases.
                </Text>

                {/* Quick Chips */}
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
                  {quickDepositChips.map((chip) => (
                    <TouchableOpacity
                      key={chip}
                      style={[styles.quickChip, { backgroundColor: themeColors.muted, borderColor: themeColors.border }]}
                      onPress={() => setAutoDepositAmount(chip.toString())}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "700", color: themeColors.primary }}>
                        +{chip.toLocaleString("fr-FR")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TextInput
                    style={[styles.depositInput, { color: themeColors.foreground, backgroundColor: themeColors.background, borderColor: themeColors.border }]}
                    placeholder="Montant total à déposer..."
                    placeholderTextColor={themeColors.mutedForeground}
                    keyboardType="numeric"
                    value={autoDepositAmount}
                    onChangeText={setAutoDepositAmount}
                  />
                  <TouchableOpacity
                    style={[styles.depositBtn, { backgroundColor: themeColors.primary }]}
                    onPress={handleAutoDeposit}
                  >
                    <Text style={{ color: "white", fontSize: 13, fontWeight: "bold" }}>Valider</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Congratulations Card on Completion */}
            {challenge.status === "completed" && (
              <View style={[styles.completionCard, { backgroundColor: `${themeColors.secondary}15`, borderColor: themeColors.secondary }]}>
                <Text style={{ fontSize: 32, marginBottom: 6 }}>🏆</Text>
                <Text style={{ fontSize: 16, fontWeight: "800", color: themeColors.secondary, textAlign: "center", marginBottom: 4 }}>
                  Félicitations, défi accompli ! 🎉
                </Text>
                <Text style={{ fontSize: 12, color: themeColors.mutedForeground, textAlign: "center", marginBottom: 14, lineHeight: 18 }}>
                  Tu as épargné la totalité de ton objectif de {fmt(challenge.target_amount)}. Bravo pour ta discipline et ta constance !
                </Text>
                <TouchableOpacity
                  style={[styles.completionBtn, { backgroundColor: themeColors.secondary }]}
                  onPress={() => navigation.navigate("Dashboard")}
                >
                  <Text style={{ color: "white", fontSize: 13, fontWeight: "bold" }}>
                    Terminer et retourner à l'accueil
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Filter Tabs Segmented Control */}
            <View style={[styles.tabsContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <TouchableOpacity
                style={[styles.tab, filter === "all" && [styles.activeTab, { backgroundColor: themeColors.primary }]]}
                onPress={() => setFilter("all")}
              >
                <Text style={[styles.tabText, { color: filter === "all" ? "white" : themeColors.foreground }]}>
                  Tout ({challengeInsts.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, filter === "todo" && [styles.activeTab, { backgroundColor: themeColors.primary }]]}
                onPress={() => setFilter("todo")}
              >
                <Text style={[styles.tabText, { color: filter === "todo" ? "white" : themeColors.foreground }]}>
                  À faire ({challengeInsts.filter((i) => !i.is_checked).length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, filter === "done" && [styles.activeTab, { backgroundColor: themeColors.primary }]]}
                onPress={() => setFilter("done")}
              >
                <Text style={[styles.tabText, { color: filter === "done" ? "white" : themeColors.foreground }]}>
                  Validés ({challengeInsts.filter((i) => i.is_checked).length})
                </Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>{challenge.mode === "free" ? "🌱" : "🔍"}</Text>
            <Text style={[styles.emptyTitle, { color: themeColors.foreground }]}>
              {challenge.mode === "free" ? "Aucun versement libre pour l'instant" : "Aucun versement dans ce filtre"}
            </Text>
            <Text style={[styles.emptySubtitle, { color: themeColors.mutedForeground }]}>
              {challenge.mode === "free"
                ? "Utilise le formulaire ci-dessus pour enregistrer ton premier dépôt !"
                : "Sélectionne l'onglet 'Tout' pour afficher les autres tranches."}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          return (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.gridItem,
                {
                  backgroundColor: item.is_checked ? `${themeColors.secondary}18` : themeColors.card,
                  borderColor: item.is_checked ? themeColors.secondary : themeColors.border,
                  borderWidth: item.is_checked ? 1.5 : 1,
                },
              ]}
              onPress={() => handleToggle(item.id)}
            >
              {/* Top row: Position badge */}
              <View style={styles.gridItemTop}>
                <Text
                  style={[
                    styles.itemPosition,
                    { color: item.is_checked ? themeColors.secondary : themeColors.mutedForeground },
                  ]}
                >
                  #{item.position || index + 1}
                </Text>
                {item.is_checked && (
                  <View style={[styles.checkedDot, { backgroundColor: themeColors.secondary }]} />
                )}
              </View>

              {/* Middle: Amount */}
              <Text
                style={[
                  styles.itemAmount,
                  {
                    color: item.is_checked ? themeColors.secondary : themeColors.foreground,
                    fontWeight: item.is_checked ? "800" : "700",
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {isHidden ? "••" : fmt(item.amount)}
              </Text>

              {/* Bottom: Check pill */}
              <View style={styles.gridItemBottom}>
                {item.is_checked ? (
                  <View style={[styles.itemStatusPill, { backgroundColor: `${themeColors.secondary}25` }]}>
                    <CheckCircle2 size={12} color={themeColors.secondary} />
                    <Text style={[styles.itemStatusText, { color: themeColors.secondary }]}>Payé</Text>
                  </View>
                ) : (
                  <View style={[styles.itemStatusPill, { backgroundColor: themeColors.muted }]}>
                    <Circle size={10} color={themeColors.mutedForeground} />
                    <Text style={[styles.itemStatusText, { color: themeColors.mutedForeground }]}>À faire</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />
      <Confetti active={confettiActive} onAnimationEnd={() => setConfettiActive(false)} />

      {/* Emergency Withdrawal Modal */}
      <Modal
        visible={withdrawModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWithdrawModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <ShieldAlert size={22} color={themeColors.destructive} />
                <Text style={[styles.modalTitle, { color: themeColors.foreground }]}>Retrait d'urgence</Text>
              </View>
              <TouchableOpacity onPress={() => setWithdrawModalVisible(false)}>
                <X size={20} color={themeColors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: themeColors.mutedForeground, lineHeight: 18, marginBottom: 14 }}>
              Un imprévu arrive. Vous pouvez retirer une somme de ce défi. L'application ajustera intelligemment vos cases cochées tout en préservant votre historique.
            </Text>

            <View style={[styles.availableCard, { backgroundColor: themeColors.muted }]}>
              <Text style={{ fontSize: 11, color: themeColors.mutedForeground }}>Disponible actuellement sur ce défi :</Text>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: themeColors.primary, marginTop: 2 }}>{fmt(saved)}</Text>
            </View>

            {/* Quick Percentage Chips */}
            <Text style={{ fontSize: 11, fontWeight: "600", color: themeColors.mutedForeground, marginBottom: 6 }}>
              Raccourcis de retrait :
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              {[
                { label: "25%", val: Math.round(saved * 0.25) },
                { label: "50%", val: Math.round(saved * 0.5) },
                { label: "Tout (100%)", val: saved },
              ].map((p) => (
                <TouchableOpacity
                  key={p.label}
                  style={[styles.percentChip, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}
                  onPress={() => setWithdrawAmount(p.val.toString())}
                >
                  <Text style={{ fontSize: 11, fontWeight: "bold", color: themeColors.foreground }}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontSize: 12, fontWeight: "600", color: themeColors.foreground, marginBottom: 6 }}>
              Montant exact à retirer :
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.foreground }]}
              placeholder={`ex: ${Math.min(saved, 10000)}`}
              placeholderTextColor={themeColors.mutedForeground}
              keyboardType="numeric"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
            />

            <Text style={{ fontSize: 12, fontWeight: "600", color: themeColors.foreground, marginTop: 12, marginBottom: 6 }}>
              Motif du coup dur :
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
              {["Santé 🏥", "Facture ⚡", "Réparation 🚗", "Autre 📝"].map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reasonChip,
                    {
                      borderColor: withdrawReason === reason ? themeColors.primary : themeColors.border,
                      backgroundColor: withdrawReason === reason ? `${themeColors.primary}20` : themeColors.background,
                    },
                  ]}
                  onPress={() => setWithdrawReason(reason)}
                >
                  <Text style={{ fontSize: 11, fontWeight: "600", color: withdrawReason === reason ? themeColors.primary : themeColors.mutedForeground }}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: themeColors.border }]}
                onPress={() => setWithdrawModalVisible(false)}
              >
                <Text style={{ color: themeColors.foreground, fontWeight: "600", fontSize: 13 }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: themeColors.destructive }]}
                onPress={async () => {
                  const amt = parseFloat(withdrawAmount.replace(/\s+/g, "").replace(",", "."));
                  if (isNaN(amt) || amt <= 0) {
                    Alert.alert("Montant invalide", "Veuillez entrer un montant valide supérieur à 0.");
                    return;
                  }
                  if (amt > saved) {
                    Alert.alert("Montant trop élevé", `Vous ne pouvez pas retirer plus que le montant déjà épargné (${fmt(saved)}).`);
                    return;
                  }

                  try {
                    await withdrawFromChallenge(challenge.id, amt, withdrawReason);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    setWithdrawModalVisible(false);
                    setWithdrawAmount("");
                    Alert.alert(
                      "Retrait effectué ⚠️",
                      `Un montant de ${fmt(amt)} a été retiré pour le motif "${withdrawReason}". Courage, vous pourrez rattraper votre défi plus tard !`
                    );
                  } catch (e: any) {
                    Alert.alert("Erreur", e.message || "Impossible d'effectuer le retrait.");
                  }
                }}
              >
                <Text style={{ color: "white", fontWeight: "bold", fontSize: 13 }}>Confirmer le retrait</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 6 : 0,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 15,
  },
  backBtn: {
    padding: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  statusBadgeRow: {
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 24,
    padding: 18,
    marginTop: 8,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  emojiBg: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  emoji: {
    fontSize: 26,
  },
  heroInfo: {
    flex: 1,
    marginLeft: 12,
  },
  heroName: {
    fontSize: 18,
    fontWeight: "800",
    color: "white",
    letterSpacing: -0.2,
  },
  catPill: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  catPillText: {
    fontSize: 11,
    color: "white",
    fontWeight: "600",
  },
  modePill: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  modePillText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
  },
  heroPctBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  heroPctText: {
    fontSize: 18,
    fontWeight: "900",
    color: "white",
  },
  progressBg: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginTop: 16,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "white",
    marginTop: 2,
  },
  forecastRibbon: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.15)",
    borderRadius: 10,
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  forecastText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.95)",
    fontWeight: "600",
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "700",
  },
  exportCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  exportFormatsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  exportFormatBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
  },
  exportFormatText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4,
  },
  dateInput: {
    height: 38,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 11,
    textAlign: "center",
  },
  depositCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 12,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  depositInput: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  depositBtn: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    borderRadius: 10,
    height: 42,
  },
  completionCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 18,
    marginBottom: 14,
    alignItems: "center",
  },
  completionBtn: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    height: 40,
    borderRadius: 20,
    width: "100%",
  },
  tabsContainer: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 10,
  },
  activeTab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "700",
  },
  columnWrapper: {
    justifyContent: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  gridItem: {
    width: (width - 32 - (NUM_COLUMNS - 1) * 8) / NUM_COLUMNS,
    height: 78,
    borderRadius: 14,
    padding: 7,
    justifyContent: "space-between",
  },
  gridItemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemPosition: {
    fontSize: 10,
    fontWeight: "700",
  },
  checkedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  itemAmount: {
    fontSize: 13,
    textAlign: "center",
    marginVertical: 2,
  },
  gridItemBottom: {
    alignItems: "center",
  },
  itemStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  itemStatusText: {
    fontSize: 9,
    fontWeight: "700",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 35,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  availableCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  percentChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  modalInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  reasonChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalCancelBtn: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  modalConfirmBtn: {
    flex: 1.5,
    height: 42,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});
