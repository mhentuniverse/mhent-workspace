/**
 * MHENT WORKSPACE - GLOBAL CONFIGURATION & FIREBASE SETUP
 */
window.MHENT_CONFIG = {
  APP_NAME: "MHEnt Workspace",
  VERSION: "1.0.0",
  API_BASE_URL: "http://localhost:8000", // AISA FastAPI Server Endpoint
  JITSI_DOMAIN: "meet.jit.si",
  ORG_DOMAIN: "@mhentuniverse.internal",

  FIREBASE_CONFIG: {
    apiKey: "AIzaSyDKDAAnmeqWFRqUZWTVa--m5-cORyHCoUk",
    authDomain: "mhentuniverse.firebaseapp.com",
    projectId: "mhentuniverse",
    storageBucket: "mhentuniverse.firebasestorage.app",
    messagingSenderId: "377044322952",
    appId: "1:377044322952:web:d657d1b0806d37d9246d3d"
  },
  
  DEFAULT_WORKSPACE: {
    id: "mhent-core",
    name: "MHEnt Universe HQ",
    code: "MHENT-CORE-2026",
    role: "master"
  },

  CURRENT_USER: {
    id: "user-master-01",
    name: "Master Yurika",
    email: "yurika@mhentuniverse.internal",
    role: "master",
    avatar: "👑",
    status: "online"
  },

  TEAM_MEMBERS: [
    { id: "user-master-01", name: "Master Yurika", email: "yurika@mhentuniverse.internal", role: "master", avatar: "👑", status: "online" },
    { id: "user-dev-02", name: "Kaelen (Dev Lead)", email: "kaelen@mhentuniverse.internal", role: "member", avatar: "💻", status: "online" },
    { id: "user-media-03", name: "Sara (Media Dir)", email: "sara@mhentuniverse.internal", role: "member", avatar: "🎨", status: "away" },
    { id: "user-event-04", name: "Ray (Logistics)", email: "ray@mhentuniverse.internal", role: "member", avatar: "⚡", status: "busy" }
  ]
};
