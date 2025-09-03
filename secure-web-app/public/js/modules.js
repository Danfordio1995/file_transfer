// Module management functions for admin

/**
 * Load all modules for admin panel
 */
async function loadAdminModules() {
  try {
    const modules = await fetchAllModules();
    
    const moduleTableBody = document.getElementById('moduleTableBody');
    if (!moduleTableBody) return;
    
    moduleTableBody.innerHTML = '';
    
    if (modules.length === 0) {
      moduleTableBody.innerHTML = '<tr><td colspan="5">No modules found</td></tr>';
      return;
    }
    
    modules.forEach(module => {
      const row = document.createElement('tr');
      
      row.innerHTML = `
        <td>${module.id}</td>
        <td>${module.name}</td>
        <td>${module.scriptName}</td>
        <td><span class="status-badge ${module.isActive ? 'active' : 'inactive'}">${module.isActive ? 'Active' : 'Inactive'}</span></td>
        <td>
          <button class="btn btn-small edit-module" data-id="${module.id}">Edit</button>
          <button class="btn btn-small toggle-module" data-id="${module.id}" data-active="${module.isActive}">
            ${module.isActive ? 'Disable' : 'Enable'}
          </button>
        </td>
      `;
      
      moduleTableBody.appendChild(row);
    });
    
    // Add event listeners to buttons
    document.querySelectorAll('.edit-module').forEach(button => {
      button.addEventListener('click', () => {
        const moduleId = button.getAttribute('data-id');
        openEditModuleForm(moduleId);
      });
    });
    
    document.querySelectorAll('.toggle-module').forEach(button => {
      button.addEventListener('click', () => {
        const moduleId = button.getAttribute('data-id');
        const isActive = button.getAttribute('data-active') === 'true';
        toggleModuleStatus(moduleId, !isActive);
      });
    });
  } catch (error) {
    console.error('Error loading admin modules:', error);
  }
}

/**
 * Open form to edit a module
 * @param {string} moduleId - Module ID
 */
async function openEditModuleForm(moduleId) {
  try {
    const module = await fetchModuleDetails(moduleId);
    
    // Implementation would open a form or modal to edit the module
    console.log(`Edit module: ${moduleId}`, module);
  } catch (error) {
    console.error(`Error fetching module ${moduleId}:`, error);
  }
}

/**
 * Toggle a module's active status
 * @param {string} moduleId - Module ID
 * @param {boolean} isActive - New active status
 */
async function toggleModuleStatus(moduleId, isActive) {
  try {
    await updateModule(moduleId, { isActive });
    
    // Refresh the module list
    loadAdminModules();
  } catch (error) {
    console.error(`Error updating module ${moduleId}:`, error);
  }
}
