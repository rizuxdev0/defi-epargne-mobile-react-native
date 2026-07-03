import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView, Platform,
  StatusBar,
  Alert,
  FlatList,
  Dimensions,
  Share,
  Switch,
  TextInput,
} from "react-native";
import { ArrowLeft, Trash2, CheckCircle2, Circle, AlertCircle, FileDown, FileSpreadsheet, FileText, Archive, RotateCcw, Share2 } from "lucide-react-native";
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

const { width } = Dimensions.get("window");
const CARD_MARGIN = 8;
const NUM_COLUMNS = Math.floor((width - 40) / 80); // fits 80px circles/squares dynamically

export default function ChallengeDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const { profile, challenges, installments, toggleInstallment, deleteChallenge, updateChallenge } = useApp();
  const fmt = useMoneyFormatter();
  const [filter, setFilter] = useState<"all" | "todo" | "done">("all");

  const themeColors = COLORS[profile?.theme || "light"];

  const challenge = challenges.find((c) => c.id === id);
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

  const challengeInsts = installments
    .filter((i) => i.challenge_id === id)
    .sort((a, b) => a.position - b.position);

  const [exportFilterActive, setExportFilterActive] = useState(false);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportIncludeUnchecked, setExportIncludeUnchecked] = useState(true);

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
              <div style="text-align: right;">Goal Glow Mobile</div>
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
          return;
        }
      }
      // Fallback: use expo-sharing
      const tempUri = FileSystem.cacheDirectory + fileName;
      await FileSystem.writeAsStringAsync(tempUri, content, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(tempUri, { mimeType, dialogTitle: `Enregistrer ${fileName}` });
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

      if (Platform.OS === "android") {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const pdfBase64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
          const pdfFileName = `defi-${challenge.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;
          const newFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            pdfFileName,
            "application/pdf"
          );
          await FileSystem.writeAsStringAsync(newFileUri, pdfBase64, { encoding: FileSystem.EncodingType.Base64 });
          Alert.alert("Succès ✅", `Le rapport PDF "${pdfFileName}" a été enregistré sur votre téléphone !`);
          return;
        }
      }
      // Fallback
      const newUri = FileSystem.cacheDirectory + `defi-${challenge.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;
      await FileSystem.moveAsync({ from: uri, to: newUri });
      await Sharing.shareAsync(newUri, { mimeType: "application/pdf", dialogTitle: "Exporter en PDF" });
    } catch (e) {
      Alert.alert("Erreur", "Impossible d'exporter en PDF.");
    }
  };

  const handleExportWord = async () => {
    try {
      const exportSaved = exportFilterActive
        ? exportInsts.filter((i) => i.is_checked).reduce((sum, i) => sum + i.amount, 0)
        : saved;
      const exportPct = Math.min(100, Math.round((exportSaved / challenge.target_amount) * 100));

      const formattedTarget = fmt(challenge.target_amount);
      const formattedSaved = fmt(exportSaved);
      const progressPercent = exportPct;

      let rtf = "{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0\\fnil\\fcharset0 Arial;}}\n";
      rtf += "\\viewkind4\\uc1\\pard\\lang1036\\f0\\fs28\\b GOAL GLOW - RAPPORT D'EPARGNE\\b0\\fs20\\par\n";
      rtf += "==================================================\\par\\par\n";
      rtf += `\\b Defi :\\b0 ${challenge.name}\\par\n`;
      rtf += `\\b Statut :\\b0 ${progressPercent >= 100 ? "Complete" : "En cours"}\\par\n`;
      rtf += `\\b Objectif total :\\b0 ${formattedTarget}\\par\n`;
      rtf += `\\b Deja epargne :\\b0 ${formattedSaved} (${progressPercent}%)\\par\n`;
      if (exportFilterActive) {
        rtf += `\\b Filtre actif :\\b0 Du ${exportStartDate || "debut"} au ${exportEndDate || "aujourd'hui"}\\par\n`;
      }
      rtf += "--------------------------------------------------\\par\\par\n";
      rtf += "\\b LISTE DES VERSEMENTS\\b0\\par\\par\n";

      exportInsts.forEach((inst, index) => {
        const dateStr = inst.checked_at 
          ? new Date(inst.checked_at).toLocaleDateString("fr-FR")
          : "-";
        rtf += `Tranche ${index + 1} : ${fmt(inst.amount)}  -  [${inst.is_checked ? "COCHE" : "A FAIRE"}]  -  Date : ${dateStr}\\par\n`;
      });

      rtf += "}";

      const fileName = `defi-${challenge.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.rtf`;
      await saveFileToDevice(fileName, rtf, "application/rtf");
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

      const shareMessage = `Goal Glow 🎯\n` +
        `Mon défi : ${challenge.emoji || "🎯"} *${challenge.name}*\n` +
        `Progression : ${bar} ${progressPercent}%\n` +
        `Épargné : ${fmt(saved)} / ${fmt(challenge.target_amount)} (${checkedCount}/${totalCount} versements)\n\n` +
        `Rejoins-moi sur Goal Glow pour épargner malin ! ✨`;

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
      await toggleInstallment(instId);

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={themeColors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.foreground }]}>Détails du Défi</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity style={styles.headerBtn} onPress={handleArchiveToggle}>
            {challenge.status === "active" ? (
              <Archive size={22} color={themeColors.primary} />
            ) : (
              <RotateCcw size={22} color={themeColors.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={handleDelete}>
            <Trash2 size={22} color={themeColors.destructive} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredInsts}
        keyExtractor={(item) => item.id}
        numColumns={NUM_COLUMNS}
        key={NUM_COLUMNS.toString()} // Force rerender of grid if column count changes
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
              <View style={styles.heroTop}>
                <View style={styles.emojiBg}>
                  <Text style={styles.emoji}>{challenge.emoji}</Text>
                </View>
                <View style={styles.heroInfo}>
                  <Text style={styles.heroName} numberOfLines={1}>{challenge.name}</Text>
                  {cat && <Text style={styles.heroCategory}>{cat.emoji} {cat.label}</Text>}
                </View>
                <Text style={styles.heroPct}>{pct}%</Text>
              </View>

              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: themeColors.secondary }]} />
              </View>

              <View style={styles.heroStats}>
                <View>
                  <Text style={styles.statLabel}>ÉPARGNÉ</Text>
                  <Text style={styles.statValue}>{fmt(saved)}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.statLabel}>OBJECTIF</Text>
                  <Text style={styles.statValue}>{fmt(challenge.target_amount)}</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Filter Exports Card */}
            <View style={{ backgroundColor: themeColors.card, borderColor: themeColors.border, padding: 15, marginTop: 10, marginBottom: 15, borderRadius: 16, borderWidth: 1 }}>
              {/* Option 1: Include Unchecked */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: "bold", color: themeColors.foreground }}>📋 Inclure les versements non cochés</Text>
                  <Text style={{ fontSize: 11, color: themeColors.mutedForeground }}>Exporter tous les versements (y compris non cochés).</Text>
                </View>
                <Switch
                  value={exportIncludeUnchecked}
                  onValueChange={setExportIncludeUnchecked}
                  trackColor={{ false: themeColors.border, true: themeColors.primary }}
                />
              </View>

              <View style={{ height: 1, backgroundColor: themeColors.border, marginVertical: 8 }} />

              {/* Option 2: Date Filter */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: "bold", color: themeColors.foreground }}>📅 Filtrer par date de versement</Text>
                  <Text style={{ fontSize: 11, color: themeColors.mutedForeground }}>Restreindre l'export des versements cochés sur une période.</Text>
                </View>
                <Switch
                  value={exportFilterActive}
                  onValueChange={setExportFilterActive}
                  trackColor={{ false: themeColors.border, true: themeColors.primary }}
                />
              </View>

              {exportFilterActive && (
                <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: themeColors.mutedForeground, marginBottom: 4 }}>Début (JJ/MM/AAAA)</Text>
                    <TextInput
                      style={{
                        height: 40,
                        borderWidth: 1,
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        fontSize: 12,
                        backgroundColor: themeColors.background,
                        borderColor: themeColors.border,
                        color: themeColors.foreground,
                        textAlign: "center",
                      }}
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
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: themeColors.mutedForeground, marginBottom: 4 }}>Fin (JJ/MM/AAAA)</Text>
                    <TextInput
                      style={{
                        height: 40,
                        borderWidth: 1,
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        fontSize: 12,
                        backgroundColor: themeColors.background,
                        borderColor: themeColors.border,
                        color: themeColors.foreground,
                        textAlign: "center",
                      }}
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

            {/* Export options */}
            <View style={styles.exportRow}>
              <TouchableOpacity style={[styles.exportBtn, { borderColor: themeColors.border, backgroundColor: themeColors.card }]} onPress={handleExportPDF}>
                <FileDown size={15} color={themeColors.primary} />
                <Text style={[styles.exportBtnText, { color: themeColors.foreground }]}>PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.exportBtn, { borderColor: themeColors.border, backgroundColor: themeColors.card }]} onPress={handleExportWord}>
                <FileText size={15} color={themeColors.primary} />
                <Text style={[styles.exportBtnText, { color: themeColors.foreground }]}>Word</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.exportBtn, { borderColor: themeColors.border, backgroundColor: themeColors.card }]} onPress={handleExportExcel}>
                <FileSpreadsheet size={15} color={themeColors.primary} />
                <Text style={[styles.exportBtnText, { color: themeColors.foreground }]}>Excel</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={{
                backgroundColor: `${themeColors.primary}15`, 
                borderColor: themeColors.primary,
                borderWidth: 1,
                borderRadius: 12,
                paddingVertical: 10,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
                marginTop: 10,
              }} 
              onPress={handleShareProgress}
            >
              <Share2 size={16} color={themeColors.primary} />
              <Text style={{ color: themeColors.primary, fontWeight: "bold", fontSize: 13 }}>
                Partager ma progression
              </Text>
            </TouchableOpacity>

            {/* Filter Tabs */}
            <View style={[styles.tabsContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <TouchableOpacity
                style={[styles.tab, filter === "all" && { backgroundColor: themeColors.muted }]}
                onPress={() => setFilter("all")}
              >
                <Text style={[styles.tabText, { color: themeColors.foreground }]}>Tout ({challengeInsts.length})</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, filter === "todo" && { backgroundColor: themeColors.muted }]}
                onPress={() => setFilter("todo")}
              >
                <Text style={[styles.tabText, { color: themeColors.foreground }]}>
                  À faire ({challengeInsts.filter((i) => !i.is_checked).length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, filter === "done" && { backgroundColor: themeColors.muted }]}
                onPress={() => setFilter("done")}
              >
                <Text style={[styles.tabText, { color: themeColors.foreground }]}>
                  Coché ({challengeInsts.filter((i) => i.is_checked).length})
                </Text>
              </TouchableOpacity>
            </View>
          </>
        }
        renderItem={({ item }) => {
          return (
            <TouchableOpacity
              style={[
                styles.gridItem,
                {
                  backgroundColor: item.is_checked ? `${themeColors.secondary}20` : themeColors.card,
                  borderColor: item.is_checked ? themeColors.secondary : themeColors.border,
                },
              ]}
              onPress={() => handleToggle(item.id)}
            >
              <Text
                style={[
                  styles.itemAmount,
                  { color: item.is_checked ? themeColors.secondary : themeColors.foreground },
                ]}
              >
                {fmt(item.amount).replace(/\s€|€/g, "")}
              </Text>
              <View style={styles.checkIcon}>
                {item.is_checked ? (
                  <CheckCircle2 size={16} color={themeColors.secondary} />
                ) : (
                  <Circle size={16} color={themeColors.mutedForeground} />
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 10 : 0,
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
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  emojiBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  emoji: {
    fontSize: 24,
  },
  heroInfo: {
    flex: 1,
    marginLeft: 15,
  },
  heroName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  heroCategory: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  heroPct: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  progressBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginTop: 20,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  heroStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  statLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "700",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 15,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
  },
  columnWrapper: {
    justifyContent: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  exportRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 15,
  },
  exportBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
  },
  exportBtnText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  gridItem: {
    width: (width - 40 - (NUM_COLUMNS - 1) * 8) / NUM_COLUMNS,
    height: 72,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 6,
  },
  itemAmount: {
    fontSize: 13,
    fontWeight: "bold",
    textAlign: "center",
  },
  checkIcon: {
    position: "absolute",
    bottom: 6,
  },
});
