import { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from "react-native";
import { DetailsScreen } from "./Details";
import { BeurteilungScreen } from "./Beurteilung";
import { database } from "./firebaseConfig";
import { ref, get, set } from "firebase/database";

const DEFAULT_SCHOOL_SUBJECTS = [
  "Deutsch"
];

const DEFAULT_STUDENTS_NAMES = [
  { name: "Anna", Klasse: "1A" },
  { name: "Benjamin", Klasse: "1B" },
  { name: "Clara", Klasse: "1A" },
  { name: "Daniel", Klasse: "1B" },
  { name: "Emma", Klasse: "2A" },
  { name: "Felix", Klasse: "2B" },
  { name: "Greta", Klasse: "2A" },
  { name: "Henry", Klasse: "2B" },
  { name: "Iris", Klasse: "3A" },
  { name: "Jakob", Klasse: "3B" },
  { name: "Karin", Klasse: "3A" },
  { name: "Liam", Klasse: "3B" },
  { name: "Maria", Klasse: "4A" },
  { name: "Noah", Klasse: "4B" },
  { name: "Olivia", Klasse: "4A" },
];

const { width } = Dimensions.get('window');
const boxSize = (width - 150) / 2;

function HomeScreen({ onSelectSubject, onSelectBeurteilung, subjects }) {
  const insets = useSafeAreaInsets();

  const handlePress = (subject) => {
    console.log(`Selected: ${subject}`);
    onSelectSubject(subject);
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <Text style={styles.title}>Beurteilungen          Monika Andres</Text>
      <View style={styles.grid}>
        {subjects.map((subject) => (
          <TouchableOpacity
            key={subject}
            style={styles.box}
            onPress={() => handlePress(subject)}
          >
            <Text style={styles.boxText}>{subject}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.beurteilungButton}
        onPress={onSelectBeurteilung}
      >
        <Text style={styles.beurteilungButtonText}>+ Beurteilung erstellen</Text>
      </TouchableOpacity>

      <StatusBar hidden={false} style="light" />
    </View>
  );
}

export default function App() {
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [showBeurteilung, setShowBeurteilung] = useState(false);
  const [gradesData, setGradesData] = useState({});
  const [schoolSubjects, setSchoolSubjects] = useState(DEFAULT_SCHOOL_SUBJECTS);
  const [students, setStudents] = useState(DEFAULT_STUDENTS_NAMES);

  // Load data from Firebase on app start
  useEffect(() => {
    loadSchoolSubjectsFromFirebase();
     migrateRandomNamesIfNeeded().then(() => loadStudentsFromFirebase());
    loadGradesFromFirebase();
  }, []);

   const migrateRandomNamesIfNeeded = async () => {
     try {
       const oldRef = ref(database, "randomNames");
       const newRef = ref(database, "students");
       const oldSnap = await get(oldRef);
       const newSnap = await get(newRef);
       if (oldSnap.exists() && !newSnap.exists()) {
         // copy data from old key to new key
         await set(newRef, oldSnap.val());
         console.log("Migrated /randomNames → /students");
       }
     } catch (error) {
       console.error("Migration (randomNames -> students) failed:", error);
     }
   };
  const loadSchoolSubjectsFromFirebase = async () => {
    try {
      const dbRef = ref(database, "schoolSubjects");
      const snapshot = await get(dbRef);
      if (snapshot.exists()) {
        setSchoolSubjects(snapshot.val());
      } else {
        // Wenn nicht existiert, speichere defaults
        await set(dbRef, DEFAULT_SCHOOL_SUBJECTS);
        setSchoolSubjects(DEFAULT_SCHOOL_SUBJECTS);
      }
    } catch (error) {
      console.error("Error loading school subjects from Firebase:", error);
      setSchoolSubjects(DEFAULT_SCHOOL_SUBJECTS);
    }
  };

  const loadStudentsFromFirebase = async () => {
    try {
      const dbRef = ref(database, "students");
      const snapshot = await get(dbRef);
      if (snapshot.exists()) {
        setStudents(snapshot.val());
      } else {
        // Wenn nicht existiert, speichere defaults
        await set(dbRef, DEFAULT_STUDENTS_NAMES);
        setStudents(DEFAULT_STUDENTS_NAMES);
      }
    } catch (error) {
      console.error("Error loading students from Firebase:", error);
      setStudents(DEFAULT_STUDENTS_NAMES);
    }
  };

  const loadGradesFromFirebase = async () => {
    try {
      const dbRef = ref(database, "grades");
      const snapshot = await get(dbRef);
      if (snapshot.exists()) {
        setGradesData(snapshot.val());
      }
    } catch (error) {
      console.error("Error loading grades from Firebase:", error);
    }
  };

  const saveGradesToFirebase = async (updatedGrades) => {
    try {
      await set(ref(database, "grades"), updatedGrades);
      setGradesData(updatedGrades);
    } catch (error) {
      console.error("Error saving grades to Firebase:", error);
    }
  };

  const handleSelectSubject = (subject) => {
    setSelectedSubject(subject);
  };

  const handleBack = () => {
    setSelectedSubject(null);
    setShowBeurteilung(false);
  };

  return (
    <SafeAreaProvider>
      {showBeurteilung ? (
        <BeurteilungScreen onBack={handleBack} schoolSubjects={schoolSubjects} />
      ) : selectedSubject ? (
        <DetailsScreen 
          subject={selectedSubject} 
          onBack={handleBack}
          initialGrades={gradesData[selectedSubject] || {}}
          onSaveGrades={(grades) => {
            const updated = { ...gradesData, [selectedSubject]: grades };
            saveGradesToFirebase(updated);
          }}
          students={students}
        />
      ) : (
        <HomeScreen 
          subjects={schoolSubjects}
          onSelectSubject={handleSelectSubject}
          onSelectBeurteilung={() => setShowBeurteilung(true)}
        />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ebf4e9",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 32,
    color: "#070707",
    fontFamily: "sans-serif-thin",
    marginTop: 20,
    marginBottom: 20
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },
  box: {
    width: boxSize,
    height: boxSize,
    backgroundColor: "#4a90e2",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
  },
  boxText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  beurteilungButton: {
    marginTop: 20,
    backgroundColor: "#e74c3c",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
  },
  beurteilungButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
