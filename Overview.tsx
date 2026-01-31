import { useEffect, useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { database } from "./firebaseConfig";
import { ref, get } from "firebase/database";

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

interface StudentGrades {
  grades?: { [description: string]: string };
  points?: { [description: string]: number };
  // Legacy format support
  [description: string]: string | { [description: string]: string } | { [description: string]: number } | undefined;
}

const GRADES = [
  { label: "sehr gut", icon: "emoticon-excited", color: "#27ae60" },
  { label: "gut", icon: "emoticon-happy", color: "#3498db" },
  { label: "genügend", icon: "emoticon-neutral", color: "#f39c12" },
  { label: "ungenügend", icon: "emoticon-sad", color: "#e74c3c" },
] as const;

export function OverviewScreen({
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
  const [allStudentGrades, setAllStudentGrades] = useState<Record<string, StudentGrades>>({});

  const selectedBeurteilung = useMemo(
    () => beurteilungen.find((b) => b.id === selectedBeurteilungId),
    [beurteilungen, selectedBeurteilungId],
  );

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

  const loadAllGrades = async (beurteilungId: string) => {
    try {
      const gradesMap: Record<string, StudentGrades> = {};
      
      for (const student of students) {
        const dbRef = ref(database, `erfassenGrades/${subject}/${beurteilungId}/${student.name}`);
        const snapshot = await get(dbRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          // Handle both new format {grades: {}, points: {}} and legacy format
          if (data.grades) {
            gradesMap[student.name] = data;
          } else {
            // Legacy format: direct grades object
            gradesMap[student.name] = { grades: data, points: {} };
          }
        } else {
          gradesMap[student.name] = { grades: {}, points: {} };
        }
      }
      
      setAllStudentGrades(gradesMap);
    } catch (error) {
      console.error("Error loading all grades:", error);
      setAllStudentGrades({});
    }
  };

  useEffect(() => {
    setSelectedBeurteilungId("");
    setAllStudentGrades({});
    loadBeurteilungen();
  }, [subject]);

  useEffect(() => {
    if (selectedBeurteilungId) {
      loadAllGrades(selectedBeurteilungId);
    } else {
      setAllStudentGrades({});
    }
  }, [selectedBeurteilungId]);

  const getGradeIcon = (grade: string | undefined) => {
    const gradeObj = GRADES.find((g) => g.label === grade);
    return gradeObj || null;
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
        <Text style={styles.headerTitle}>Übersicht</Text>
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

      {selectedBeurteilung ? (
        <ScrollView style={styles.studentList} showsVerticalScrollIndicator={true}>
          <View style={styles.tableHeader}>
            <Text style={styles.studentHeaderText}>Schüler</Text>
            {selectedBeurteilung.descriptions.map((descItem, index) => {
              const descText = typeof descItem === 'string' ? descItem : descItem.text;
              return (
                <Text key={index} style={styles.descHeaderText} numberOfLines={2}>
                  {descText}
                </Text>
              );
            })}
          </View>

          {students.map((student, studentIndex) => {
            const studentData = allStudentGrades[student.name] || {};
            const studentGrades = (studentData.grades || studentData) as Record<string, string>;
            const studentPoints = (studentData.points || {}) as Record<string, number>;
            
            return (
              <View key={studentIndex} style={styles.studentRow}>
                <View style={styles.studentNameCell}>
                  <Text style={styles.studentNameText}>{student.name}</Text>
                  <Text style={styles.studentKlasseText}>({student.Klasse})</Text>
                </View>
                
                {selectedBeurteilung.descriptions.map((descItem, descIndex) => {
                  const descText = typeof descItem === 'string' ? descItem : descItem.text;
                  const maxPoints = typeof descItem === 'object' ? descItem.maxPoints : undefined;
                  const grade = studentGrades[descText];
                  const points = studentPoints[descText];
                  const gradeIcon = getGradeIcon(grade);
                  
                  return (
                    <View key={descIndex} style={styles.gradeCell}>
                      {gradeIcon ? (
                        <>
                          <MaterialCommunityIcons
                            name={gradeIcon.icon}
                            size={28}
                            color={gradeIcon.color}
                          />
                          {maxPoints !== undefined && points !== undefined && (
                            <Text style={styles.pointsText}>
                              {points}/{maxPoints}
                            </Text>
                          )}
                        </>
                      ) : (
                        <Text style={styles.noGradeText}>-</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={styles.helperText}>
          Bitte Beurteilung auswählen.
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
  studentList: {
    flex: 1,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#4a90e2",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
  },
  studentHeaderText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
    width: 100,
  },
  descHeaderText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 11,
    flex: 1,
    textAlign: "center",
  },
  studentRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: "center",
    elevation: 1,
  },
  studentNameCell: {
    width: 100,
    paddingRight: 8,
  },
  studentNameText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  studentKlasseText: {
    fontSize: 11,
    color: "#666",
  },
  gradeCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pointsText: {
    fontSize: 10,
    color: "#666",
    marginTop: 2,
  },
  noGradeText: {
    color: "#999",
    fontSize: 18,
  },
});
