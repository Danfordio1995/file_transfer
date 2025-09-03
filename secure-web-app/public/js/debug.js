document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('testStandard').addEventListener('click', async () => {
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      
      try {
        // Make a standard fetch request with JSON content type
        const response = await fetch('/api/auth/debug', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        document.getElementById('requestInfo').textContent = JSON.stringify(data, null, 2);
      } catch (error) {
        document.getElementById('requestInfo').textContent = 'Error: ' + error.message;
      }
    });
    
    document.getElementById('testRaw').addEventListener('click', async () => {
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      
      try {
        // Make a raw fetch request to mimic a form submission
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        
        const response = await fetch('/api/auth/debug', {
          method: 'POST',
          body: formData
        });
        
        const data = await response.json();
        document.getElementById('requestInfo').textContent = JSON.stringify(data, null, 2);
      } catch (error) {
        document.getElementById('requestInfo').textContent = 'Error: ' + error.message;
      }
    });
    
    document.getElementById('realLogin').addEventListener('click', async () => {
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      
      try {
        // Try a real login
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          document.getElementById('requestInfo').textContent = 'LOGIN SUCCESS!\n\n' + JSON.stringify(data, null, 2);
        } else {
          document.getElementById('requestInfo').textContent = 'LOGIN FAILED:\n\n' + JSON.stringify(data, null, 2);
        }
      } catch (error) {
        document.getElementById('requestInfo').textContent = 'Error: ' + error.message;
      }
    });
});
