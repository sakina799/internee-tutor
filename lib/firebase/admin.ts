import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";


const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\n/g, "\n");
const adminConfig = {
    credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: privateKey,
    }),
};

const adminApp = getApps().length === 0? initializeApp(adminConfig) : getApps()[0];
export const adminDb = getFirestore(adminApp);
export default adminApp;
