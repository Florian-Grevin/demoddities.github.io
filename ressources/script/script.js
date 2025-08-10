const jsonPath = 'ressources/data.json';
let jsonProjects = [];

fetch(jsonPath)
  .then(response => {
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    return response.json();
  })
  .then(data => {
    const projectsByCategory = data.projects;

    for (const category in projectsByCategory) {
      const projects = projectsByCategory[category];

      projects.forEach(project => {
        project.name = category;
        jsonProjects.push(project);
      });
    }

    const demoContainer = document.querySelector('.demo');

    if (demoContainer) {
      const appElements = demoContainer.querySelectorAll('.app');

      appElements.forEach((element, index) => {
        const project = jsonProjects[index];

        if (project && project.src) {
          element.style.backgroundImage = `url("ressources/assets/projets/${project.src}.webp")`;
          element.classList.add('projects');

          const newTitleLink = document.createElement('a');
          newTitleLink.href = `${project.src}.html`;
          newTitleLink.className = 'app-title';

          const span = document.createElement('span');
          span.textContent = project.name;
          newTitleLink.appendChild(span);

          const oldTitle = element.querySelector('.app-title');
          if (oldTitle) {
            oldTitle.replaceWith(newTitleLink);
          }
        }
      });
    }
  })
  .catch(error => {
    const errorDisplay = document.getElementById('jsonDisplay');
    if (errorDisplay) {
      errorDisplay.textContent = `Erreur de chargement : ${error.message}`;
    }
    console.error('Erreur lors du chargement du JSON :', error);
  });