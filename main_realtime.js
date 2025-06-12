import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getFirestore, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getcredentials } from "/credentials.js";

// Firebase configuration
const firebaseConfig= getcredentials();
console.log(firebaseConfig)

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


// BUILDING THE TREE FROM METADATA
function sanitizeKey(key) {
  return key.replace(/[.#$[\]/]/g, '_');
}

function buildFlexibleTree(nodes) {
  const tree = {};

  nodes.forEach((node) => {
    const parts = node.path.split('/');
    let current = tree;

    for (let i = 0; i < parts.length; i++) {
      const isFile = i === parts.length - 1 && 'content' in node;
      let part = sanitizeKey(parts[i]);

      if (isFile) {
        current[part] = {
          content: node.content,
          "last-modifier": node.user_id,
          id: node.file_id
        };
      } else {
        if (!current[part]) {
          current[part] = {};
        }

        // Se è una cartella esplicitamente elencata nei metadati (senza contenuto),
        // allora aggiungiamo l'id solo al primo passaggio
        if (
          i === parts.length - 1 &&      // ultima parte del path
          !('content' in node) &&        // non è un file
          !('id' in current[part])       // evitiamo sovrascritture
        ) {
          current[part].id = node.file_id;
        }

        current = current[part];
      }
    }
  });

  return tree;
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
    console.log("open_project");
    console.log(projectData);

    await set(ref(database, projectPath), {
      ...projectData,
      "current-authors": [author]
    });

      console.log("open_project tree");
    console.log(projectData.tree);

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


// Update project 
async function update_project(database, id, user_id, file_id, content, tree) {
  const projectPath = `active_projects/${id}`;

  
}

// DELETE project PERMANENTLY
async function delete_project(database, id) {
  const projectPath = `active_projects/${id}`;
  await set(ref(database, projectPath), null);
  console.log(`Project ${id} deleted from Realtime database.`);

  
  const firestore = getFirestore();
  const docRef = doc(firestore, "projects", id);
  await deleteDoc(docRef);
  console.log(`Project ${id} deleted from Firestore.`);
  
}


window.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("open");
  const closeBtn = document.getElementById("close");
  const updateBtn = document.getElementById("update");
  const deleteBtn = document.getElementById("delete"); // FIXED: id corretto

  if (openBtn) {
    openBtn.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      const author = button.getAttribute("data-author");
      const id = button.getAttribute("data-project-id");
      const title = button.getAttribute("data-title");
      const file_system = JSON.parse(button.getAttribute("data-tree"));
      const co_authors = JSON.parse(button.getAttribute("data-co-authors"));
      const tree = buildFlexibleTree(file_system);

      const projectData = { id, title, tree, "co-authors": co_authors };

      console.log("projectData:", projectData);
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

  if (updateBtn) {
    updateBtn.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      const user_id = button.getAttribute("data-author");
      const file_id = button.getAttribute("data-file-id");
      const file_name = button.getAttribute("data-file-name");
      const id = button.getAttribute("data-project-id");
      const file_system = JSON.parse(button.getAttribute("data-tree"));
      const tree = buildFlexibleTree(file_system);

      console.log("Tree:", tree);
      alert(`Updating project for ${user_id}...`);
      await update_project(database, id, user_id, file_id, file_name, tree);
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      const id = button.getAttribute("data-project-id");
      const author = button.getAttribute("data-author");

      alert(`Deleting project ${id}...`);
      await delete_project(database, id, author);
    });
  }
});






//delete