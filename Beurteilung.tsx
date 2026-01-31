import { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { database } from "./firebaseConfig";
import { ref, set, get, remove } from "firebase/database";

interface DescriptionItem {
  id: string;
  text: string;
  maxPoints?: number;
}

export function BeurteilungScreen({
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
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [descriptions, setDescriptions] = useState<DescriptionItem[]>([
    { id: "1", text: "", maxPoints: undefined },
    { id: "2", text: "", maxPoints: undefined },
    { id: "3", text: "", maxPoints: undefined },
    { id: "4", text: "", maxPoints: undefined },
    { id: "5", text: "", maxPoints: undefined },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [existingDocuments, setExistingDocuments] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [isNewDocument, setIsNewDocument] = useState(true);

  // Load existing documents on mount
  useEffect(() => {
    loadExistingDocuments();
  }, []);

  const loadExistingDocuments = async () => {
    try {
      const dbRef = ref(database, "beurteilungen");
      const snapshot = await get(dbRef);
      if (snapshot.exists()) {
        const allDocs = snapshot.val();
        // Filter documents by selected school subject
        const filteredDocs = Object.keys(allDocs).filter(
          (docKey) => allDocs[docKey].schoolSubject === selectedSchoolSubject,
        );
        setExistingDocuments(filteredDocs);
      } else {
        setExistingDocuments([]);
      }
    } catch (error) {
      console.error("Error loading documents:", error);
      setExistingDocuments([]);
    }
  };

  // Load documents when school subject changes
  useEffect(() => {
    if (selectedSchoolSubject) {
      loadExistingDocuments();
      createNewDocument();
    }
  }, [selectedSchoolSubject]);

  const loadDocument = async (docName: string) => {
    try {
      const dbRef = ref(database, `beurteilungen/${docName}`);
      const snapshot = await get(dbRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        setDocumentName(data.name);
        const descItems: DescriptionItem[] = (data.descriptions || []).map(
          (item: string | { text: string; maxPoints?: number }, index: number) => {
            if (typeof item === 'string') {
              return { id: (index + 1).toString(), text: item, maxPoints: undefined };
            }
            return {
              id: (index + 1).toString(),
              text: item.text,
              maxPoints: item.maxPoints,
            };
          },
        );
        setDescriptions(
          descItems.length > 0
            ? descItems
            : [
                { id: "1", text: "", maxPoints: undefined },
                { id: "2", text: "", maxPoints: undefined },
                { id: "3", text: "", maxPoints: undefined },
                { id: "4", text: "", maxPoints: undefined },
                { id: "5", text: "", maxPoints: undefined },
              ],
        );
        setSelectedDocument(docName);
        setIsNewDocument(false);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error("Error loading document:", error);
      Alert.alert("Error", "Failed to load document.");
    }
  };

  const createNewDocument = () => {
    setDocumentName("");
    setDescriptions([
      { id: "1", text: "", maxPoints: undefined },
      { id: "2", text: "", maxPoints: undefined },
      { id: "3", text: "", maxPoints: undefined },
      { id: "4", text: "", maxPoints: undefined },
      { id: "5", text: "", maxPoints: undefined },
    ]);
    setSelectedDocument(null);
    setIsNewDocument(true);
    setShowDropdown(false);
  };

  const addDescriptionField = () => {
    const newId = Math.max(...descriptions.map((d) => parseInt(d.id)), 0) + 1;
    setDescriptions([...descriptions, { id: newId.toString(), text: "", maxPoints: undefined }]);
  };

  const removeDescriptionField = (id: string) => {
    if (descriptions.length <= 1) {
      Alert.alert("Error", "Sie müssen mindestens ein Bewertungskriterium haben.");
      return;
    }
    setDescriptions(descriptions.filter((d) => d.id !== id));
  };

  const updateDescriptionText = (id: string, text: string) => {
    setDescriptions(
      descriptions.map((d) => (d.id === id ? { ...d, text } : d)),
    );
  };

  const updateDescriptionPoints = (id: string, points: string) => {
    const numPoints = points === "" ? undefined : parseInt(points);
    setDescriptions(
      descriptions.map((d) => (d.id === id ? { ...d, maxPoints: numPoints } : d)),
    );
  };

  const saveToFirebase = async () => {
    if (!documentName.trim()) {
      Alert.alert("Error", "Bitte geben Sie einen Namen für die Beurteilung ein.");
      return;
    }

    if (!selectedSchoolSubject) {
      Alert.alert("Error", "Schulfach auswählen.");
      return;
    }

    const filledDescriptions = descriptions.filter((d) => d.text.trim());
    if (filledDescriptions.length === 0) {
      Alert.alert("Error", "Bitte fügen Sie mindestens ein Bewertungskriterium hinzu.");
      return;
    }

    setIsSaving(true);
    try {
      const documentKey = documentName.trim().replace(/\s+/g, "_");
      const documentData = {
        name: documentName.trim(),
        schoolSubject: selectedSchoolSubject,
        descriptions: descriptions.map((d) => ({
          text: d.text.trim(),
          maxPoints: d.maxPoints,
        })),
        timestamp: new Date().toISOString(),
      };

      await set(ref(database, `beurteilungen/${documentKey}`), documentData);

      Alert.alert("Success", "Beurteilung erfolgreich gespeichert!");
      setDocumentName("");
      setDescriptions([
        { id: "1", text: "", maxPoints: undefined },
        { id: "2", text: "", maxPoints: undefined },
        { id: "3", text: "", maxPoints: undefined },
        { id: "4", text: "", maxPoints: undefined },
        { id: "5", text: "", maxPoints: undefined },
      ]);
      setSelectedDocument(null);
      setIsNewDocument(true);
      loadExistingDocuments();
      onSaveSuccess();
    } catch (error) {
      console.error("Error saving document:", error);
      Alert.alert("Error", "Beurteilung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteDocument = async () => {
    if (!selectedDocument) {
      Alert.alert("Error", "Keine Beurteilung ausgewählt.");
      return;
    }

    Alert.alert(
      "Confirm Delete",
      "Sind Sie sicher, dass Sie diese Beurteilung löschen möchten?",
      [
        { text: "Abbrechen", onPress: () => {} },
        {
          text: "Löschen",
          onPress: async () => {
            try {
              await remove(ref(database, `beurteilungen/${selectedDocument}`));
              Alert.alert("Success", "Beurteilung erfolgreich gelöscht!");
              createNewDocument();
              loadExistingDocuments();
            } catch (error) {
              console.error("Error deleting document:", error);
              Alert.alert("Error", "Beurteilung konnte nicht gelöscht werden.");
            }
          },
          style: "destructive",
        },
      ],
    );
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
        <Text style={styles.headerTitle}>Beurteilungen</Text>
        <View style={{ width: 28 }} />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Schulfach</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowSubjectDropdown(!showSubjectDropdown)}
        >
          <Text style={styles.dropdownButtonText}>
            {selectedSchoolSubject || "Fach auswählen..."}
          </Text>
          <MaterialCommunityIcons
            name={showSubjectDropdown ? "chevron-up" : "chevron-down"}
            size={24}
            color="#333"
          />
        </TouchableOpacity>

        {showSubjectDropdown && (
          <View style={styles.dropdownList}>
            {schoolSubjects.map((subject) => (
              <TouchableOpacity
                key={subject}
                style={[
                  styles.dropdownItem,
                  selectedSchoolSubject === subject &&
                    styles.dropdownItemSelected,
                ]}
                onPress={() => {
                  setSelectedSchoolSubject(subject);
                  setShowSubjectDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{subject}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
              <View style={styles.section}>
          <Text style={styles.label}>Bestehende Beurteilungen</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowDropdown(!showDropdown)}
          >
            <Text style={styles.dropdownButtonText}>
              {selectedDocument ? selectedDocument : "Beurteilung auswählen..."}
            </Text>
            <MaterialCommunityIcons
              name={showDropdown ? "chevron-up" : "chevron-down"}
              size={24}
              color="#333"
            />
          </TouchableOpacity>

          {showDropdown && (
            <View style={styles.dropdownList}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => createNewDocument()}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#3498db" />
                <Text style={styles.dropdownItemText}>Neue Beurteilung erstellen</Text>
              </TouchableOpacity>
              {existingDocuments.map((doc) => (
                <TouchableOpacity
                  key={doc}
                  style={[
                    styles.dropdownItem,
                    selectedDocument === doc && styles.dropdownItemSelected,
                  ]}
                  onPress={() => loadDocument(doc)}
                >
                  <Text style={styles.dropdownItemText}>{doc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Bewertungs auswählen</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Ringenturnen"
            placeholderTextColor="#999"
            value={documentName}
            onChangeText={setDocumentName}
            editable={isNewDocument || selectedDocument !== null}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Bewertungskriterien</Text>
          {descriptions.map((item, index) => (
            <View key={item.id} style={styles.descriptionContainer}>
              <View style={styles.descriptionRow}>
                <TextInput
                  style={styles.descriptionInput}
                  placeholder={`Bewertungskriterien ${index + 1}`}
                  placeholderTextColor="#999"
                  value={item.text}
                  onChangeText={(text) => updateDescriptionText(item.id, text)}
                  multiline
                />
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => removeDescriptionField(item.id)}
                >
                  <MaterialCommunityIcons
                    name="delete"
                    size={24}
                    color="#e74c3c"
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.pointsRow}>
                <Text style={styles.pointsLabel}>Max. Punkte (optional):</Text>
                <TextInput
                  style={styles.pointsInput}
                  placeholder="z.B. 10"
                  placeholderTextColor="#999"
                  value={item.maxPoints?.toString() || ""}
                  onChangeText={(text) => updateDescriptionPoints(item.id, text)}
                  keyboardType="numeric"
                />
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={addDescriptionField}
        >
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Bewertungskriterium hinzufügen</Text>
        </TouchableOpacity>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={saveToFirebase}
            disabled={isSaving}
          >
            <MaterialCommunityIcons
              name="content-save"
              size={24}
              color="#fff"
            />
            <Text style={styles.saveButtonText}>
              {isSaving ? "Speichern..." : "Speichern"}
            </Text>
          </TouchableOpacity>

          {selectedDocument && (
            <TouchableOpacity
              style={styles.deleteDocButton}
              onPress={deleteDocument}
            >
              <MaterialCommunityIcons name="trash-can" size={24} color="#fff" />
              <Text style={styles.deleteDocButtonText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
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
    color: "#971a1a",
    marginTop: 10,
    marginBottom: 10,
  },
  dropdownButton: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
    borderWidth: 1,
    borderColor: "#ddd",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownButtonText: {
    fontSize: 16,
    color: "#333",
  },
  dropdownList: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginTop: 5,
    borderWidth: 1,
    borderColor: "#ddd",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
  },
  dropdownItem: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
    gap: 10,
  },
  dropdownItemSelected: {
    backgroundColor: "#e8f4f8",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#333",
    flex: 1,
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
  descriptionContainer: {
    marginBottom: 15,
  },
  descriptionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
    gap: 8,
  },
  descriptionInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#333",
    borderWidth: 1,
    borderColor: "#ddd",
    minHeight: 50,
    maxHeight: 100,
  },
  pointsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 8,
    gap: 8,
  },
  pointsLabel: {
    fontSize: 12,
    color: "#666",
  },
  pointsInput: {
    backgroundColor: "#fff",
    borderRadius: 6,
    padding: 6,
    fontSize: 14,
    color: "#333",
    borderWidth: 1,
    borderColor: "#ddd",
    width: 80,
  },
  deleteButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  addButton: {
    flexDirection: "row",
    backgroundColor: "#3498db",
    borderRadius: 8,
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    gap: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  saveButton: {
    flex: 1,
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
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  deleteDocButton: {
    flexDirection: "row",
    backgroundColor: "#e74c3c",
    borderRadius: 8,
    padding: 14,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
  },
  deleteDocButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
