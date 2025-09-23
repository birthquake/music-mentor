import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCntn0Nc3fbAA7763e4sPM3eqCu45KB8g0",
  authDomain: "music-mentor-mvp.firebaseapp.com",
  projectId: "music-mentor-mvp",
  storageBucket: "music-mentor-mvp.firebasestorage.app",
  messagingSenderId: "562585988718",
  appId: "1:562585988718:web:6a7c252fdef108e722407f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
