import { useEffect, useMemo, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { database } from "./firebaseConfig";
import { ref, get, set } from "firebase/database";

interface StudentName {
  name: string;
  Klasse: string;
}

interface BeurteilungDoc {
  id: string;
  name: string;
  schoolSubject: string;
  descriptions: Array<string | { text: string; maxPoints?: number }>;
}

const GRADES = [
  { label: "sehr gut", icon: "emoticon-excited", color: "#27ae60" },
  { label: "gut", icon: "emoticon-happy", color: "#3498db" },
  { label: "genügend", icon: "emoticon-neutral", color: "#f39c12" },
  { label: "ungenügend", icon: "emoticon-sad", color: "#e74c3c" },
] as const;

export function ErfassenScreen({
  subject,
  onBack,
  students = [],
}: {
  subject: string;
  onBack: () => void;
  students?: StudentName[];
}) {
  const insets = useSafeAreaInsets();
  const [beurteilungen, setBeurteilungen] = useState<BeurteilungDoc[]>([]);
  const [selectedBeurteilungId, setSelectedBeurteilungId] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [descriptionGrades, setDescriptionGrades] = useState<Record<string, string>>({});
  const [descriptionPoints, setDescriptionPoints] = useState<Record<string, number>>({});

  const previousSelectionRef = useRef<{ beurteilungId: string; student: string } | null>(null);

  const selectedBeurteilung = useMemo(
    () => beurteilungen.find((b) => b.id === selectedBeurteilungId),
    [beurteilungen, selectedBeurteilungId],
  );

  const calculateGrade = (points: number, maxPoints: number): string => {
    const percentage = (points / maxPoints) * 100;
    if (percentage >= 90) return "sehr gut";
    if (percentage >= 75) return "gut";
    if (percentage >= 60) return "genügend";
    return "ungenügend";
  };

  const loadBeurteilungen = async () => {
    try {
      const dbRef = ref(database, "beurteilungen");
      const snapshot = await get(dbRef);
      if (snapshot.exists()) {
        const raw = snapshot.val();
        const filtered = Object.keys(raw)
          .map((id) => ({
            id,
            name: raw[id].name,
            schoolSubject: raw[id].schoolSubject,
            descriptions: raw[id].descriptions || [],
          }))
          .filter((doc) => doc.schoolSubject === subject);
        setBeurteilungen(filtered);
      } else {
        setBeurteilungen([]);
      }
    } catch (error) {
      console.error("Error loading beurteilungen:", error);
      setBeurteilungen([]);
    }
  };

  const saveGrades = async (beurteilungId: string, studentName: string, grades: Record<string, string>, points?: Record<string, number>) => {
    try {
      await set(
        ref(database, `erfassenGrades/${subject}/${beurteilungId}/${studentName}`),
        { grades, points: points || {} },
      );
    } catch (error) {
      console.error("Error saving erfassen grades:", error);
    }
  };

  const loadGrades = async (beurteilungId: string, studentName: string) => {
    try {
      const dbRef = ref(database, `erfassenGrades/${subject}/${beurteilungId}/${studentName}`);
      const snapshot = await get(dbRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.grades) {
          setDescriptionGrades(data.grades);
          setDescriptionPoints(data.points || {});
        } else {
          // Legacy format: direct grades object
          setDescriptionGrades(data);
          setDescriptionPoints({});
        }
      } else {
        setDescriptionGrades({});
        setDescriptionPoints({});
      }
    } catch (error) {
      console.error("Error loading erfassen grades:", error);
      setDescriptionGrades({});
      setDescriptionPoints({});
    }
  };

  useEffect(() => {
    setSelectedBeurteilungId("");
    setSelectedStudent("");
    setDescriptionGrades({});
    setDescriptionPoints({});
    loadBeurteilungen();
  }, [subject]);

  useEffect(() => {
    const prev = previousSelectionRef.current;
    if (prev?.beurteilungId && prev?.student) {
      saveGrades(prev.beurteilungId, prev.student, descriptionGrades, descriptionPoints);
    }

    if (selectedBeurteilungId && selectedStudent) {
      loadGrades(selectedBeurteilungId, selectedStudent);
      previousSelectionRef.current = {
        beurteilungId: selectedBeurteilungId,
        student: selectedStudent,
      };
    } else {
      setDescriptionGrades({});
      setDescriptionPoints({});
      previousSelectionRef.current = null;
    }
  }, [selectedBeurteilungId, selectedStudent]);

  const handleGradeSelect = (description: string, grade: string) => {
    const updated = {
      ...descriptionGrades,
      [description]: grade,
    };
    setDescriptionGrades(updated);

    if (selectedBeurteilungId && selectedStudent) {
      saveGrades(selectedBeurteilungId, selectedStudent, updated, descriptionPoints);
    }
  };

  const handlePointsChange = (description: string, pointsText: string, maxPoints: number) => {
    const points = pointsText === "" ? 0 : parseInt(pointsText) || 0;
    const updatedPoints = {
      ...descriptionPoints,
      [description]: points,
    };
    setDescriptionPoints(updatedPoints);

    // Auto-calculate grade
    const grade = calculateGrade(points, maxPoints);
    const updatedGrades = {
      ...descriptionGrades,
      [description]: grade,
    };
    setDescriptionGrades(updatedGrades);

    if (selectedBeurteilungId && selectedStudent) {
      saveGrades(selectedBeurteilungId, selectedStudent, updatedGrades, updatedPoints);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Erfassen</Text>
        <View style={{ width: 28 }} />
      </View>

      <Text style={styles.title}>{subject}</Text>

      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedBeurteilungId}
          onValueChange={(itemValue) => setSelectedBeurteilungId(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Beurteilung auswählen..." value="" />
          {beurteilungen.map((doc) => (
            <Picker.Item key={doc.id} label={doc.name} value={doc.id} />
          ))}
        </Picker>
      </View>

      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedStudent}
          onValueChange={(itemValue) => setSelectedStudent(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Schüler auswählen..." value="" />
          {students.map((student, index) => (
            <Picker.Item
              key={`${student.name}-${index}`}
              label={`${student.name} (${student.Klasse})`}
              value={student.name}
            />
          ))}
        </Picker>
      </View>

      {selectedBeurteilung && selectedStudent ? (
        <ScrollView style={styles.exerciseList}>
          {(selectedBeurteilung.descriptions || []).map((descItem, index) => {
            const description = typeof descItem === 'string' ? descItem : descItem.text;
            const maxPoints = typeof descItem === 'object' ? descItem.maxPoints : undefined;
            
            return (
              <View key={`${description}-${index}`} style={styles.exerciseRow}>
                <View style={styles.exerciseBox}>
                  <Text style={styles.exerciseText}>{description}</Text>
                  {maxPoints && (
                    <View style={styles.pointsInputContainer}>
                      <Text style={styles.pointsInputLabel}>Punkte:</Text>
                      <TextInput
                        style={styles.pointsTextInput}
                        value={descriptionPoints[description]?.toString() || ""}
                        onChangeText={(text) => handlePointsChange(description, text, maxPoints)}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#999"
                      />
                      <Text style={styles.maxPointsText}>/ {maxPoints}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.gradeContainer}>
                  {GRADES.map((gradeObj) => (
                    <TouchableOpacity
                      key={gradeObj.label}
                      style={[
                        styles.gradeButton,
                        descriptionGrades[description] === gradeObj.label &&
                          styles.gradeButtonSelected,
                      ]}
                      onPress={() => handleGradeSelect(description, gradeObj.label)}
                      disabled={!!maxPoints}
                    >
                      <MaterialCommunityIcons
                        name={gradeObj.icon}
                        size={24}
                        color={
                          descriptionGrades[description] === gradeObj.label
                            ? "#fff"
                            : gradeObj.color
                        }
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={styles.helperText}>
          Bitte Beurteilung und Schüler auswählen.
        </Text>
      )}

      <StatusBar hidden={false} style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#80847f",
    paddingHorizontal: 10,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  title: {
    fontSize: 26,
    color: "#fff",
    fontFamily: "sans-serif-thin",
    marginBottom: 16,
    textAlign: "center",
  },
  pickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    width: "90%",
    marginBottom: 16,
    overflow: "hidden",
    alignSelf: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
  },
  picker: {
    height: 50,
    width: "100%",
  },
  helperText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginTop: 12,
  },
  exerciseList: {
    flex: 1,
    marginBottom: 20,
  },
  exerciseRow: {
    flexDirection: "row",
    marginBottom: 15,
    alignItems: "center",
    gap: 10,
  },
  exerciseBox: {
    backgroundColor: "#4a90e2",
    padding: 12,
    borderRadius: 8,
    width: "40%",
    justifyContent: "center",
    elevation: 2,
  },
  exerciseText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
  },
  pointsInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    gap: 4,
  },
  pointsInputLabel: {
    color: "#fff",
    fontSize: 11,
  },
  pointsTextInput: {
    backgroundColor: "#fff",
    borderRadius: 4,
    padding: 4,
    fontSize: 14,
    color: "#333",
    width: 40,
    textAlign: "center",
  },
  maxPointsText: {
    color: "#fff",
    fontSize: 11,
  },
  gradeContainer: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
  },
  gradeButton: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 6,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  gradeButtonSelected: {
    backgroundColor: "#17e60c",
  },
});
