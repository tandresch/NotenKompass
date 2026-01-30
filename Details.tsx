import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface StudentName {
  name: string;
  Klasse: string;
}

const SUBJECT_EXERCISES = {
  Turnen: ["Rolle", "Aufschwung", "Salto", "Rolle Rückwärts"],
  Deutsch: ["Lesen", "Schreiben", "Sprechen", "Hören"],
  Mathematik: ["Rechnen", "Geometrie", "Algebra", "Statistik"],
  Handarbeit: ["Nähen", "Stricken", "Weben", "Basteln"],
  Eisbahn: ["Gleiten", "Bremsen", "Kurven", "Sprünge"],
  Werken: ["Sägen", "Schleifen", "Bohren", "Kleben"],
};

const GRADES = [
  { label: "sehr gut", icon: "emoticon-excited", color: "#27ae60" },
  { label: "gut", icon: "emoticon-happy", color: "#3498db" },
  { label: "genügend", icon: "emoticon-neutral", color: "#f39c12" },
  { label: "ungenügend", icon: "emoticon-sad", color: "#e74c3c" },
];

export function DetailsScreen({ 
  subject, 
  onBack,
  initialGrades = {},
  onSaveGrades = () => {},
  students = []
}: { 
  subject: keyof typeof SUBJECT_EXERCISES; 
  onBack: () => void;
  initialGrades?: Record<string, string>;
  onSaveGrades?: (grades: Record<string, string>) => void;
  students?: StudentName[];
}) {
  const insets = useSafeAreaInsets();
  const [selectedName, setSelectedName] = useState("");
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [exerciseGrades, setExerciseGrades] = useState(initialGrades);

  const exercises = SUBJECT_EXERCISES[subject] || [];

  const handleExerciseSelect = (exercise) => {
    setSelectedExercise(exercise);
  };

  const handleGradeSelect = (exercise, grade) => {
    const updated = {
      ...exerciseGrades,
      [exercise]: grade,
    };
    setExerciseGrades(updated);
    // Save to Firebase when grade is updated
    onSaveGrades(updated);
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <Text style={styles.title}>{subject}</Text>

      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedName}
          onValueChange={(itemValue) => setSelectedName(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Select a name..." value="" />
          {students.map((student, index) => (
            <Picker.Item 
              key={index} 
              label={`${student.name} (${student.Klasse})`} 
              value={student.name} 
            />
          ))}
        </Picker>
      </View>

      {selectedName && (
        <Text style={styles.selectedName}>Selected: {selectedName}</Text>
      )}

      <ScrollView style={styles.exerciseList}>
        {exercises.map((exercise) => (
          <View key={exercise} style={styles.exerciseRow}>
            <TouchableOpacity
              style={[
                styles.exerciseBox,
                selectedExercise === exercise && styles.exerciseBoxSelected,
              ]}
              onPress={() => handleExerciseSelect(exercise)}
            >
              <Text style={styles.exerciseText}>{exercise}</Text>
            </TouchableOpacity>

            <View style={styles.gradeContainer}>
              {GRADES.map((gradeObj) => (
                <TouchableOpacity
                  key={gradeObj.label}
                  style={[
                    styles.gradeButton,
                    exerciseGrades[exercise] === gradeObj.label &&
                      styles.gradeButtonSelected,
                  ]}
                  onPress={() => handleGradeSelect(exercise, gradeObj.label)}
                >
                  <MaterialCommunityIcons
                    name={gradeObj.icon}
                    size={24}
                    color={
                      exerciseGrades[exercise] === gradeObj.label
                        ? "#fff"
                        : gradeObj.color
                    }
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.button} onPress={onBack}>
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>

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
  title: {
    fontSize: 32,
    color: "#fff",
    fontFamily: "sans-serif-thin",
    marginBottom: 20,
    textAlign: "center",
  },
  pickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    width: "80%",
    marginBottom: 20,
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
  selectedName: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
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
    width: "35%",
    justifyContent: "center",
    elevation: 2,
  },
  exerciseBoxSelected: {
    backgroundColor: "#2e5f9e",
    borderWidth: 2,
    borderColor: "#fff",
  },
  exerciseText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
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
  button: {
    backgroundColor: "#4a90e2",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: "center",
    marginBottom: 10,
    elevation: 3,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});