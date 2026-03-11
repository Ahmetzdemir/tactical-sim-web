import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

// TODO: Kullanıcı kendi Firebase konfigürasyonunu buraya eklemeli.
// Şablon olarak boş bir yapı bırakıyoruz.
const firebaseConfig = {
  apiKey: "AIzaSyAgKHbtQ_jjp068GkDQoFAwceiObbfd9aA",
  authDomain: "taktiksimilasyon.firebaseapp.com",
  databaseURL: "https://taktiksimilasyon-default-rtdb.firebaseio.com",
  projectId: "taktiksimilasyon",
  storageBucket: "taktiksimilasyon.firebasestorage.app",
  messagingSenderId: "214858616083",
  appId: "1:214858616083:web:31c8dce79da1c88facdee6",
  measurementId: "G-4WJQ7YL7CD"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
