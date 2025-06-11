import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, update, get, set } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBwUeamSsOHaeY_cyjdroVZTFEj8Q2z2YQ",
  authDomain: "texwaller-4e4f5.firebaseapp.com",
  databaseURL: "https://texwaller-4e4f5-default-rtdb.firebaseio.com",
  projectId: "texwaller-4e4f5",
  storageBucket: "texwaller-4e4f5.appspot.com",
  messagingSenderId: "938867890235",
  appId: "1:938867890235:web:11f9c20d190908ba19641e",
  measurementId: "G-C0RTHZFPCW"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Helper to retrieve fields from RT firebase
async function fetch(database, projectPath, field) {
  const snapshot = await get(ref(database, projectPath));
  if (!snapshot.exists()) return null;

  const data = snapshot.val();
  const fieldData = data[field];

  if (!fieldData) return null;

  if (typeof fieldData === 'object' && !Array.isArray(fieldData)) {
    return Object.values(fieldData);
  }

  return fieldData;
}

// Helper to update current authors
function updateCurrentAuthors(currentAuthorsArray, author) {
  if (!currentAuthorsArray.includes(author)) {
    currentAuthorsArray.push(author);
  }
  return currentAuthorsArray;
}

// Open project (create or update)
async function open_project(database, id, author, projectData) {
  const projectPath = `active_projects/${id}`;
  const snapshot = await get(ref(database, projectPath));

  if (snapshot.exists()) {
    const data = snapshot.val();
    let currentAuthors = data["current-authors"] || [];

    if (!Array.isArray(currentAuthors)) {
      currentAuthors = Object.values(currentAuthors);
    }

    currentAuthors = updateCurrentAuthors(currentAuthors, author);

    await update(ref(database, projectPath), { "current-authors": currentAuthors });
    alert("Another author is activating the project...");
    console.log("Project already existed. Updated current-authors:", currentAuthors);
  } else {
    await set(ref(database, projectPath), {
      ...projectData,
      "current-authors": [author]
    });
    alert("Project activation");
    console.log("Project activated on RT");
  }
}

// Close project (remove current author or delete project)
async function close_project(database, id, author) {
  const projectPath = `active_projects/${id}`;
  let currentAuthors = await fetch(database, projectPath, "current-authors");

  if (!Array.isArray(currentAuthors)) {
    currentAuthors = currentAuthors ? Object.values(currentAuthors) : [];
  }

  currentAuthors = currentAuthors.filter(a => a !== author);

  if (currentAuthors.length === 0) {
    await set(ref(database, projectPath), null); // Delete the project
    console.log(`Project ${id} deleted from database.`);
  } else {
    await update(ref(database, projectPath), {
      "current-authors": currentAuthors
    });
    console.log(`Removed author ${author} from current-authors.`);
  }
}

// Wait for DOM to be ready before binding buttons
window.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("open");
  const closeBtn = document.getElementById("close");

  if (openBtn) {
    openBtn.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      const author = button.getAttribute("data-author");
      const id = button.getAttribute("data-project-id");
      const title = button.getAttribute("data-title");
      const tree = JSON.parse(button.getAttribute("data-tree"));
      const co_authors = JSON.parse(button.getAttribute("data-co-authors"));

      const projectData = {
        id,
        title,
        tree,
        "co-authors": co_authors
      };

      await open_project(database, id, author, projectData);
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      const author = button.getAttribute("data-author");
      const id = button.getAttribute("data-project-id");
      alert(`Closing project for ${author}...`);
      await close_project(database, id, author);
    });
  }
});

//delete