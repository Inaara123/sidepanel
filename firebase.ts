import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
    apiKey: "AIzaSyBLeHVX_PVKoXuIGBBjf-Mv1S8Cn2oWM18",
    authDomain: "qezev6.firebaseapp.com",
    databaseURL: "https://qezev6-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "qezev6",
    storageBucket: "qezev6.appspot.com",
    messagingSenderId: "446370519683",
    appId: "1:446370519683:web:de812b56512fb9556e19b6",
    measurementId: "G-QVWB7G4L8W"
  };
const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)