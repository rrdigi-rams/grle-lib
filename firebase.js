const firebaseConfig = {
    apiKey: "AIzaSyDJohzmqu8bcIQ8HFPFuR4lxOA-P--X7iw",
    authDomain: "grle-5366a.firebaseapp.com",
    projectId: "grle-5366a",
    storageBucket: "grle-5366a.firebasestorage.app",
    messagingSenderId: "730320564424",
    appId: "1:730320564424:web:de5d5a58826e06ac86b5fd",
    measurementId: "G-ETNCVZ4LPT"
  };

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
