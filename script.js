const dashboard = document.getElementById("dashboard");
const filter = document.getElementById("departmentFilter");
const departmentViewRadio = document.getElementById("departmentView");
const clientViewRadio = document.getElementById("clientView");
const departmentFilterContainer = document.getElementById("departmentFilterContainer"); // Updated to use ID
const clientFilter = document.getElementById("clientFilter");
const clientFilterContainer = document.getElementById("clientFilterContainer");

// Constants for localStorage keys
const LOCAL_STORAGE_CURRENT_VIEW_KEY = "currentView";
const LOCAL_STORAGE_SELECTED_DEPARTMENT_KEY = "selectedDepartment";
// const LOCAL_STORAGE_SELECTED_CLIENT_KEY = "selectedClientFilter"; // Not used anymore

let config = null;
let currentView = "department"; // Default view
let teamTasksData = []; // Store fetched data globally

// Load config from the JSON file
async function loadConfig() {
  const response = await fetch("config.json");
  if (!response.ok) {
    throw new Error(`HTTP error loading config! status: ${response.status}`);
  }
  config = await response.json();
  return config;
}

async function fetchTeamTasks() {
  try {
    const url = config.apiUrl;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    teamTasksData = Array.isArray(data) ? data : []; // Store data globally
    return teamTasksData;
  } catch (error) {
    console.error("Failed to fetch team tasks:", error);
    teamTasksData = []; // Ensure it's an empty array on error
    return [];
  }
}

// Setup tab visibility refresh
function setupTabVisibilityRefresh() {
  let hidden, visibilityChange;

  // Different browsers have different property names
  if (typeof document.hidden !== "undefined") {
    hidden = "hidden";
    visibilityChange = "visibilitychange";
  } else if (typeof document.msHidden !== "undefined") {
    hidden = "msHidden";
    visibilityChange = "msvisibilitychange";
  } else if (typeof document.webkitHidden !== "undefined") {
    hidden = "webkitHidden";
    visibilityChange = "webkitvisibilitychange";
  }

  // Exit if API not supported without console warning
  if (typeof document[hidden] === "undefined") return;

  // Add event listener for visibility change
  document.addEventListener(
    visibilityChange,
    function () {
      if (!document[hidden]) location.reload();
    },
    false
  );
}

// Initialize
async function initializeDashboard() {
  await fetchTeamTasks(); // Fetch data and store it in teamTasksData

  populateDepartments();
  populateClientsFilter(); // Populate client filter
  setupViewSwitcher(); // Setup event listeners for view switching

  // Initial render based on the default or selected view
  const savedView = localStorage.getItem(LOCAL_STORAGE_CURRENT_VIEW_KEY) || "department";
  currentView = savedView;
  if (currentView === "department") {
    departmentViewRadio.checked = true;
    departmentFilterContainer.style.display = ""; // Show department filter
    clientFilterContainer.style.display = "none"; // Hide client filter
    const savedDepartment = localStorage.getItem(LOCAL_STORAGE_SELECTED_DEPARTMENT_KEY) || "all";
    filter.value = savedDepartment;
    renderDepartmentView(savedDepartment);
  } else {
    clientViewRadio.checked = true;
    departmentFilterContainer.style.display = "none"; // Hide department filter
    clientFilterContainer.style.display = ""; // Show client filter
    clientFilter.value = "all"; // Default to "all"
    renderClientView("all"); // Render with "all" clients
  }

  filter.addEventListener("change", e => {
    const selectedDepartment = e.target.value;
    localStorage.setItem(LOCAL_STORAGE_SELECTED_DEPARTMENT_KEY, selectedDepartment);
    renderDepartmentView(selectedDepartment);
  });

  clientFilter.addEventListener("change", e => {
    const selectedClient = e.target.value;
    // localStorage.setItem(LOCAL_STORAGE_SELECTED_CLIENT_KEY, selectedClient); // Removed persistence
    renderClientView(selectedClient);
  });

  // No need to re-apply savedDepartment here as it's handled by the initial view logic
}

function setupViewSwitcher() {
  departmentViewRadio.addEventListener("change", () => {
    if (departmentViewRadio.checked) {
      currentView = "department";
      localStorage.setItem(LOCAL_STORAGE_CURRENT_VIEW_KEY, currentView);
      departmentFilterContainer.style.display = ""; // Show department filter
      clientFilterContainer.style.display = "none"; // Hide client filter
      const savedDepartment = localStorage.getItem(LOCAL_STORAGE_SELECTED_DEPARTMENT_KEY) || "all";
      filter.value = savedDepartment;
      renderDepartmentView(savedDepartment);
    }
  });

  clientViewRadio.addEventListener("change", () => {
    if (clientViewRadio.checked) {
      currentView = "client";
      localStorage.setItem(LOCAL_STORAGE_CURRENT_VIEW_KEY, currentView);
      departmentFilterContainer.style.display = "none"; // Hide department filter
      clientFilterContainer.style.display = ""; // Show client filter
      // Ensure client filter is populated if not already
      if (clientFilter.options.length <= 1 && teamTasksData.length > 0) {
        populateClientsFilter();
      }
      clientFilter.value = "all"; // Default to "all"
      renderClientView("all"); // Render with "all" clients
    }
  });
}

// Populate department filter dropdown
function populateDepartments() {
  // Clear existing options except "Toate"
  while (filter.options.length > 1) {
    filter.remove(1);
  }
  const departments = [...new Set(teamTasksData.map(p => p.departament))];
  departments.sort().forEach(dept => {
    // Sort departments alphabetically
    if (dept) {
      // Ensure department is not null or empty
      const option = document.createElement("option");
      option.value = dept;
      option.textContent = dept;
      filter.appendChild(option);
    }
  });
}

// Populate client filter dropdown
function populateClientsFilter() {
  // Clear existing options except "Toti Clientii"
  while (clientFilter.options.length > 1) {
    clientFilter.remove(1);
  }
  const clientNamesForFilter = new Set();
  teamTasksData.forEach(colleague => {
    if (Array.isArray(colleague.sarcini)) {
      colleague.sarcini.forEach(task => {
        const clientName = task.client || "Nespecificat"; // Ensure Nespecificat is captured
        clientNamesForFilter.add(clientName);
      });
    }
  });

  const sortedClients = [...clientNamesForFilter].sort((a, b) => {
    if (a === "Nespecificat") return 1; // Push "Nespecificat" to the end
    if (b === "Nespecificat") return -1;
    return a.localeCompare(b); // Sort other clients alphabetically
  });

  sortedClients.forEach(clientName => {
    const option = document.createElement("option");
    option.value = clientName;
    option.textContent = clientName;
    clientFilter.appendChild(option);
  });
}

function normalizeNameToFilename(name) {
  return (
    name
      .toLowerCase()
      .replace(/ /g, "")
      .replace(/[ăâîșț]/g, match => {
        const map = { ă: "a", â: "a", î: "i", ș: "s", ț: "t" };
        return map[match] || match;
      })
      .replace(/-/g, "") + ".jpeg"
  );
}

// Create dashboard (Department View)
function renderDepartmentView(dept = "all") {
  dashboard.innerHTML = ""; // clear old cards
  dashboard.className = "dashboard"; // Reset to default grid display
  let placeholderCounter = 0;

  teamTasksData // Use the globally stored data
    .filter(({ departament }) => dept === "all" || departament === dept)
    .forEach(({ nume, sarcini, departament }) => {
      const card = document.createElement("div");
      card.className = "card";
      card.setAttribute("data-department", departament);

      const img = document.createElement("img");
      const normalizedFilename = normalizeNameToFilename(nume);
      const imagePath = `assets/${normalizedFilename}`;

      // Simplified image handling
      img.onerror = () => {
        placeholderCounter += 1;
        img.src = `https://i.pravatar.cc/150?img=${placeholderCounter}`;
      };
      img.src = imagePath;
      img.alt = `${nume}'s photo`;

      const title = document.createElement("h3");
      title.textContent = nume;

      const list = document.createElement("ul");
      list.className = "task-list";
      if (Array.isArray(sarcini)) {
        sarcini.forEach(task => {
          if (task.descriere) {
            const li = document.createElement("li");
            li.textContent = task.descriere;
            list.appendChild(li);
          }
        });
      } else {
        console.warn(`Expected sarcini to be an array, but got:`, sarcini);
      }

      card.appendChild(img);
      card.appendChild(title);
      card.appendChild(list);
      dashboard.appendChild(card);
    });
}

// Render Client View based on selected client
function renderClientView(selectedClient = "all") {
  dashboard.innerHTML = ""; // Clear dashboard
  dashboard.className = "dashboard client-view-active"; // Add a class for client view specific styling

  const clientsData = {}; // Object to hold tasks grouped by client

  // Group tasks by client first, then by colleague
  teamTasksData.forEach(colleague => {
    if (Array.isArray(colleague.sarcini)) {
      colleague.sarcini.forEach(task => {
        const clientName = task.client || "Nespecificat";
        // Filter by selected client if not "all"
        if (selectedClient !== "all" && clientName !== selectedClient) {
          return; // Skip this task if it's not for the selected client
        }

        if (!clientsData[clientName]) {
          clientsData[clientName] = {};
        }
        if (!clientsData[clientName][colleague.nume]) {
          clientsData[clientName][colleague.nume] = {
            department: colleague.departament, // Store department if needed later
            tasks: []
          };
        }
        // Avoid duplicate task descriptions for the same colleague under the same client
        if (!clientsData[clientName][colleague.nume].tasks.some(t => t.descriere === task.descriere)) {
          clientsData[clientName][colleague.nume].tasks.push(task);
        }
      });
    }
  });

  if (Object.keys(clientsData).length === 0) {
    if (selectedClient === "all") {
      dashboard.innerHTML = "<p>Nu sunt sarcini de afișat pentru clienți.</p>";
      const tasksWithoutClient = teamTasksData.some(
        colleague => Array.isArray(colleague.sarcini) && colleague.sarcini.some(task => typeof task.client === "undefined")
      );
      if (tasksWithoutClient && teamTasksData.flatMap(c => c.sarcini).length > 0) {
        dashboard.innerHTML += "<p>Notă: Unele sarcini nu au specificat un client.</p>";
      }
    } else {
      dashboard.innerHTML = `<p>Nu sunt sarcini de afișat pentru clientul: ${selectedClient}.</p>`;
    }
    return;
  }

  const sortedClientNames = Object.keys(clientsData).sort();

  sortedClientNames.forEach(clientName => {
    const clientSection = document.createElement("div");
    clientSection.className = "client-section";

    const clientHeader = document.createElement("h2");
    clientHeader.className = "client-name";
    clientHeader.textContent = clientName;
    clientSection.appendChild(clientHeader);

    const clientColleaguesList = document.createElement("div");
    clientColleaguesList.className = "client-colleagues-list";

    const colleaguesForThisClient = clientsData[clientName];
    const sortedColleagueNames = Object.keys(colleaguesForThisClient).sort();

    sortedColleagueNames.forEach(colleagueName => {
      const colleagueEntry = document.createElement("div");
      colleagueEntry.className = "client-colleague-entry";

      const colleagueNameElement = document.createElement("h4"); // Using h4 for colleague name
      colleagueNameElement.className = "client-colleague-name";
      colleagueNameElement.textContent = colleagueName;

      colleagueEntry.appendChild(colleagueNameElement);

      const taskList = document.createElement("ul");
      taskList.className = "task-list synthetic-task-list"; // Add new class for specific styling

      const tasks = colleaguesForThisClient[colleagueName].tasks;
      if (tasks.length > 0) {
        tasks.forEach(task => {
          if (task.descriere) {
            const li = document.createElement("li");
            li.textContent = task.descriere;
            taskList.appendChild(li);
          }
        });
      } else {
        const li = document.createElement("li");
        li.textContent = "Nicio sarcină specifică pentru acest client.";
        li.style.fontStyle = "italic";
        taskList.appendChild(li);
      }
      colleagueEntry.appendChild(taskList);
      clientColleaguesList.appendChild(colleagueEntry);
    });

    clientSection.appendChild(clientColleaguesList);
    dashboard.appendChild(clientSection);
  });
}

// Start the application
(async function () {
  await loadConfig();
  await initializeDashboard();
  setupTabVisibilityRefresh();
})();
