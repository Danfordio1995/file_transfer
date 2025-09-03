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
 * Load roles for admin panel
 */
async function loadAdminRoles() {
  try {
    const roles = await fetchRoles();
    
    const roleTableBody = document.getElementById('roleTableBody');
    if (!roleTableBody) return;
    
    roleTableBody.innerHTML = '';
    
    if (roles.length === 0) {
      roleTableBody.innerHTML = '<tr><td colspan="5">No roles found</td></tr>';
      return;
    }
    
    roles.forEach(role => {
      const row = document.createElement('tr');
      
      row.innerHTML = `
        <td>${role.name}</td>
        <td>${role.level}</td>
        <td>${role.description}</td>
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
        openEditRoleForm(roleName);
      });
    });
    
    document.querySelectorAll('.delete-role').forEach(button => {
      button.addEventListener('click', () => {
        const roleName = button.getAttribute('data-name');
        confirmDeleteRole(roleName);
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
    // This would fetch users from the API
    console.log('Loading admin users...');
    
    // Placeholder implementation
    const userTableBody = document.getElementById('userTableBody');
    if (userTableBody) {
      userTableBody.innerHTML = '<tr><td colspan="5">User management implementation placeholder</td></tr>';
    }
  } catch (error) {
    console.error('Error loading admin users:', error);
  }
}

/**
 * Open form to edit a role
 * @param {string} roleName - Role name
 */
function openEditRoleForm(roleName) {
  // Implementation would open a form or modal to edit the role
  console.log(`Edit role: ${roleName}`);
}

/**
 * Confirm and delete a role
 * @param {string} roleName - Role name
 */
function confirmDeleteRole(roleName) {
  if (confirm(`Are you sure you want to delete the role: ${roleName}?`)) {
    // Delete the role
    console.log(`Delete role: ${roleName}`);
  }
}
