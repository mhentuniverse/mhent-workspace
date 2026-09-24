/**
 * MHENT WORKSPACE - GLOBAL CONFIGURATION & FIREBASE SETUP
 */
window.MHENT_CONFIG = {
  APP_NAME: "MHEnt Workspace",
  VERSION: "1.0.0",
  API_BASE_URL: "https://api.mhentuniverse.com", // AISA Cloudflare Core Endpoint
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

  SUPABASE_CONFIG: {
    URL: "https://ctzkgchjheirxwejctvl.supabase.co",
    KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0emtnY2hqaGVpcnh3ZWpjdHZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjA0MTgsImV4cCI6MjA5MTgzNjQxOH0.Wl-sBpH1VvcR6-Y4D4UAVm1f5_brGK3cVIHRJBEhOJ0"
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
    { id: "user-master-01", name: "Master Yurika", email: "yurika@mhentuniverse.internal", role: "master", avatar: "👑", status: "online" }
  ]
};

window.firebaseConfig = window.MHENT_CONFIG.FIREBASE_CONFIG;
window.supabaseUrl = window.MHENT_CONFIG.SUPABASE_CONFIG.URL;
window.supabaseKey = window.MHENT_CONFIG.SUPABASE_CONFIG.KEY;

