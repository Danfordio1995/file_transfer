// Fixed admin.js
// Admin functions for the application

/**
 * Load all admin data
 */
function loadAdminData() {
  loadAdminModules();
  loadAdminRoles();
  loadAdminUsers();
}

/**
 * Load modules for admin panel
 */
async function loadAdminModules() {
  try {
    console.log('Loading admin modules...');
    const modules = await fetchAllModules();
    console.log('Fetched modules:', modules);
    
    const moduleTableBody = document.getElementById('moduleTableBody');
    if (!moduleTableBody) {
      console.error('moduleTableBody element not found');
      return;
    }
    
    moduleTableBody.innerHTML = '';
    
    if (!modules || modules.length === 0) {
      moduleTableBody.innerHTML = '<tr><td colspan="5">No modules found</td></tr>';
      return;
    }
    
    // Force render each module in the table
    modules.forEach(module => {
      console.log('Rendering module:', module);
      const row = document.createElement('tr');
      
      row.innerHTML = `
        <td>${module.id || ''}</td>
        <td>${module.name || ''}</td>
        <td>${module.scriptName || ''}</td>
        <td><span class="status-badge ${module.isActive ? 'active' : 'inactive'}">${module.isActive ? 'Active' : 'Inactive'}</span></td>
        <td>
          <button class="btn btn-small edit-module" data-id="${module.id || ''}">Edit</button>
          <button class="btn btn-small toggle-module" data-id="${module.id || ''}" data-active="${module.isActive || false}">
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
        alert('Edit module: ' + moduleId);
      });
    });
    
    document.querySelectorAll('.toggle-module').forEach(button => {
      button.addEventListener('click', () => {
        const moduleId = button.getAttribute('data-id');
        const isActive = button.getAttribute('data-active') === 'true';
        alert('Toggle module ' + moduleId + ' to ' + (!isActive ? 'active' : 'inactive'));
      });
    });
  } catch (error) {
    console.error('Error loading admin modules:', error);
  }
}

/**
 * Load roles for admin panel
 */
async function loadAdminRoles() {
  try {
    console.log('Loading admin roles...');
    const roles = await fetchRoles();
    
    const roleTableBody = document.getElementById('roleTableBody');
    if (!roleTableBody) {
      console.error('roleTableBody element not found');
      return;
    }
    
    roleTableBody.innerHTML = '';
    
    if (!roles || roles.length === 0) {
      roleTableBody.innerHTML = '<tr><td colspan="5">No roles found</td></tr>';
      return;
    }
    
    roles.forEach(role => {
      const row = document.createElement('tr');
      
      row.innerHTML = `
        <td>${role.name || ''}</td>
        <td>${role.level || ''}</td>
        <td>${role.description || ''}</td>
        <td>${role.permissions ? role.permissions.length : 0}</td>
        <td>
          <button class="btn btn-small edit-role" data-name="${role.name}">Edit</button>
          ${role.name !== 'admin' && role.name !== 'manager' && role.name !== 'user' ?
            `<button class="btn btn-small delete-role" data-name="${role.name}">Delete</button>` :
            ''}
        </td>
      `;
      
      roleTableBody.appendChild(row);
    });
    
    // Add event listeners to buttons
    document.querySelectorAll('.edit-role').forEach(button => {
      button.addEventListener('click', () => {
        const roleName = button.getAttribute('data-name');
        alert('Edit role: ' + roleName);
      });
    });
    
    document.querySelectorAll('.delete-role').forEach(button => {
      button.addEventListener('click', () => {
        const roleName = button.getAttribute('data-name');
        alert('Delete role: ' + roleName);
      });
    });
  } catch (error) {
    console.error('Error loading admin roles:', error);
  }
}

/**
 * Load users for admin panel
 */
async function loadAdminUsers() {
  try {
    console.log('Loading admin users...');
    
    const userTableBody = document.getElementById('userTableBody');
    if (userTableBody) {
      userTableBody.innerHTML = '<tr><td colspan="5">User management implementation placeholder</td></tr>';
    }
  } catch (error) {
    console.error('Error loading admin users:', error);
  }
}

// API Helper: Fetch all modules
async function fetchAllModules() {
  try {
    console.log('Fetching all modules from API...');
    const response = await apiRequest('/modules', 'GET');
    console.log('API response:', response);
    return response.modules || [];
  } catch (error) {
    console.error('Error fetching all modules:', error);
    return [];
  }
}
