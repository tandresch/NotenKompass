import { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { database } from "./firebaseConfig";
import { ref, set, get } from "firebase/database";

export function BulkUploadScreen({
  onBack,
  onSaveSuccess = () => {},
  schoolSubjects = [],
}: {
  onBack: () => void;
  onSaveSuccess?: () => void;
  schoolSubjects?: string[];
}) {
  const insets = useSafeAreaInsets();
  const [documentName, setDocumentName] = useState("");
  const [selectedSchoolSubject, setSelectedSchoolSubject] = useState<string>(
    schoolSubjects.length > 0 ? schoolSubjects[0] : "",
  );
  const [bulkText, setBulkText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const lines = bulkText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const totalPoints = lines.length * 5;
  const pointsPerLine = 5;

  const saveToFirebase = async () => {
    if (!documentName.trim()) {
      Alert.alert("Error", "Bitte geben Sie einen Namen für die Beurteilung ein.");
      return;
    }

    if (!selectedSchoolSubject) {
      Alert.alert("Error", "Schulfach auswählen.");
      return;
    }

    if (lines.length === 0) {
      Alert.alert(
        "Error",
        "Bitte geben Sie mindestens ein Bewertungskriterium ein (eine Zeile pro Kriterium).",
      );
      return;
    }

    setIsSaving(true);
    try {
      const documentKey = documentName.trim().replace(/\s+/g, "_");
      const descriptions = lines.map((line) => ({
        text: line,
        maxPoints: pointsPerLine,
      }));

      const documentData = {
        name: documentName.trim(),
        schoolSubject: selectedSchoolSubject,
        descriptions: descriptions,
        totalPoints: totalPoints,
        timestamp: new Date().toISOString(),
      };

      await set(ref(database, `beurteilungen/${documentKey}`), documentData);

      Alert.alert("Success", "Beurteilung erfolgreich gespeichert!");
      setDocumentName("");
      setBulkText("");
      onSaveSuccess();
    } catch (error) {
      console.error("Error saving document:", error);
      Alert.alert(
        "Error",
        "Beurteilung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bulk Upload</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Name der Beurteilung</Text>
          <TextInput
            style={styles.textInput}
            placeholder="z.B. Deutsch - Lesen"
            placeholderTextColor="#999"
            value={documentName}
            onChangeText={setDocumentName}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Schulfach</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedSchoolSubject}
              onValueChange={(itemValue) => setSelectedSchoolSubject(itemValue)}
              style={styles.picker}
            >
              {schoolSubjects.map((subject, index) => (
                <Picker.Item key={index} label={subject} value={subject} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Bewertungskriterien (ein pro Zeile)</Text>
          <Text style={styles.subLabel}>
            Jede Zeile = 1 Kriterium mit {pointsPerLine} Punkten
          </Text>
          <TextInput
            style={styles.bulkTextInput}
            placeholder={`Kriterium 1\nKriterium 2\nKriterium 3\n...`}
            placeholderTextColor="#999"
            value={bulkText}
            onChangeText={setBulkText}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Anzahl Kriterien:</Text>
            <Text style={styles.infoValue}>{lines.length}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Punkte pro Kriterium:</Text>
            <Text style={styles.infoValue}>{pointsPerLine}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Gesamtpunkte:</Text>
            <Text style={styles.infoValueTotal}>{totalPoints}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={saveToFirebase}
          disabled={isSaving}
        >
          <MaterialCommunityIcons name="content-save" size={24} color="#fff" />
          <Text style={styles.saveButtonText}>
            {isSaving ? "Speichern..." : "Speichern"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <StatusBar hidden={false} style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#d6d9d6",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#619cdf",
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    padding: 15,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    fontStyle: "italic",
  },
  textInput: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  pickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  picker: {
    height: 50,
    width: "100%",
  },
  bulkTextInput: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#333",
    borderWidth: 1,
    borderColor: "#ddd",
    minHeight: 200,
    maxHeight: 300,
    textAlignVertical: "top",
  },
  infoBox: {
    backgroundColor: "#e8f4f8",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#619cdf",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#b8d4e8",
  },
  infoLabel: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 14,
    color: "#619cdf",
    fontWeight: "bold",
  },
  infoValueTotal: {
    fontSize: 16,
    color: "#27ae60",
    fontWeight: "bold",
  },
  saveButton: {
    flexDirection: "row",
    backgroundColor: "#27ae60",
    borderRadius: 8,
    padding: 14,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    marginBottom: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
