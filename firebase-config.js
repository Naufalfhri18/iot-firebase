// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD9yQhJYAb5hcfgaG9InroxUEVL7DImrLY",
  authDomain: "iot-firebase-6c9d2.firebaseapp.com",
  databaseURL: "https://iot-firebase-6c9d2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "iot-firebase-6c9d2",
  storageBucket: "iot-firebase-6c9d2.firebasestorage.app",
  messagingSenderId: "57489442934",
  appId: "1:57489442934:web:dc43098d7033b10508f757",
  measurementId: "G-RNYPQ2WZQ5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
const db = getDatabase(app);

// Initialize Authentication
const auth = getAuth(app);

// Export reference so it can be used in script.js
export { db, ref, set, onValue, update, auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup };

