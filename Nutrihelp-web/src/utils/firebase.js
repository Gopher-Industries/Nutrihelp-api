// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDtrBvL6M-1WYKQdZGMUHF9fW8-1sjr53w",
    authDomain: "nutrihelp-39346.firebaseapp.com",
    projectId: "nutrihelp-39346",
    storageBucket: "nutrihelp-39346.appspot.com",
    messagingSenderId: "127254846668",
    appId: "1:127254846668:web:301f824c553d3149f1b669"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app)

const provider = new GoogleAuthProvider();

provider.setCustomParameters({
    prompt: "select_account"
});

// Initialize Firestore
const firestore = getFirestore(app);

export { firestore };

//============== CODE BELOW ARE CUSTOMISED TO OUR APP ====================
export const auth = getAuth(app); //Obtain the Firebase authentication
export const db = getFirestore(); //Get the Firestore database from the Firebase authentication


//---------------- LOGIN WITH GOOGLE --------------------
//Open a new window to Sign in with Google
export const signInWithGooglePopup = () => signInWithPopup(auth, provider);


//---------------- CREATE A NEW USER ONTO THE FIREBASE AUTHENTICATION --------------
//NOTE: The Firestore database stores all the accounts registered via any
// method of authentication

//NOTE: The Firestore database schema is structured like so:
// collection -> document within the collection -> sub-collection within the document
// -> document within the sub-collection -> etc.

export const createUserDocFromAuth = async (userAuth, additionalInformation = {}) => {

    //If email doesn't exist in the authentication, then do nothing
    if (!userAuth.email) return;

    //Create a new document under the collection called "user"
    const userDocRef = doc(db, 'users', userAuth.uid);
    console.log(userDocRef); //Print the user doc reference onto Inspect->Console

    //Obtain the new document under the collection called "user"
    const userSnapshot = await getDoc(userDocRef); //Snapshot of the logged in User
    console.log(userSnapshot); //Print a snapshot of the logged in user onto Inspect->Console
    console.log(userSnapshot.exists()) //Print a status of whether the logged in user exists
    //                                   onto Inspect -> Console


    //If the document under the collection called "user" doesn't exist yet
    // (i.e., the new user does not exist yet), then add it to the "user" collection
    if (!userSnapshot.exists()) {

        const { displayName, email } = userAuth; //Get the user Authentication info
        const createdAt = new Date(); //Get the date the user was created

        //
        let firstName = '';
        let lastName = '';

        if (displayName) {
            const displayNameInParts = displayName.split(' ');

            firstName = displayNameInParts[0];
            lastName = displayNameInParts[1];
        }

        //Create a new document under the 
        try {
            await setDoc(userDocRef, {
                displayName,
                firstName,
                lastName,
                email,
                createdAt,
                ...additionalInformation //Additional information
            })
        }
        catch (error) {
            console.log('error in creating ', error.message)
        }
    }

    return userDocRef;
}

//---------------- SIGNUP WITH EMAIL/PASSWORD --------------------
//Create a user using the Email/Password signin method from Firebase
export const createAuthUserWithEmailandPassword = async (email, password) => {

    //If email or password do not exist, then do nothing
    if (!email || !password) return;

    //Create a new "doc" with the email and password
    // onto the Authentication instance of Firebase
    return createUserWithEmailAndPassword(auth, email, password)
}


//---------------- SIGNIN WITH EMAIL/PASSWORD --------------------
//Signin using the Email/Password signin method from Firebase
export const signInAutUserWithEmailAndPassword = async (email, password) => {

    //If email or password do not exist, then do nothing
    if (!email || !password) return;

    //Create a new "doc" with the email and password
    // onto the Authentication instance of Firebase
    return signInWithEmailAndPassword(auth, email, password)
}