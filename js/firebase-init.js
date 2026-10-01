// firebase-init.js
// As chaves abaixo identificam o app (não são secretas); quem protege os dados
// são as regras do Firestore + Auth.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut,
  createUserWithEmailAndPassword, sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB17OO___FpTpjRMly9xhfjll8p9CJY_Lo",
  authDomain: "robo-fiscal-nfe.firebaseapp.com",
  projectId: "robo-fiscal-nfe",
  storageBucket: "robo-fiscal-nfe.firebasestorage.app",
  messagingSenderId: "275540693300",
  appId: "1:275540693300:web:67107e1c0be81ff56fd561",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Segunda instância usada só para cadastrar usuários novos sem derrubar
// o login do administrador que está logado.
const authCadastro = getAuth(initializeApp(firebaseConfig, "cadastro-usuarios"));
async function criarLogin(email, senha) {
  const cred = await createUserWithEmailAndPassword(authCadastro, email, senha);
  await signOut(authCadastro);
  return cred.user.uid;
}

export {
  auth, db, criarLogin,
  signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail,
  collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp,
};
