const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const PORT = 3000;

// Database connection settings
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'todolist',
  };


  async function retrieveListItems() {
    try {
      // Create a connection to the database
      const connection = await mysql.createConnection(dbConfig);

      // Query to select all items from the database
      const query = 'SELECT id, text FROM items';

      // Execute the query
      const [rows] = await connection.execute(query);

      // Close the connection
      await connection.end();

      // Return the retrieved items as a JSON array
      return rows;
    } catch (error) {
      console.error('Error retrieving list items:', error);
      throw error; // Re-throw the error
    }
  }

// Stub function for generating HTML rows
async function getHtmlRows() {
    // Example data - replace with actual DB data later
    /*
    const todoItems = [
        { id: 1, text: 'First todo item' },
        { id: 2, text: 'Second todo item' }
    ];*/

    const todoItems = await retrieveListItems();

    // Generate HTML for each item
    return todoItems.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.text}</td>
            <td><button class="delete-btn">×</button></td>
        </tr>
    `).join('');
// ... (общие настройки как выше)

async function updateItem(id, text) {
  const connection = await mysql.createConnection(dbConfig);
  await connection.execute(
    'UPDATE items SET text = ? WHERE id = ?',
    [text, id]
  );
  await connection.end();
}

// Modified request handler with template replacement
async function handleRequest(req, res) {
    if (req.url === '/') {
        try {
            const html = await fs.promises.readFile(
                path.join(__dirname, 'index.html'), 
                'utf8'
            );

            // Replace template placeholder with actual content
            const processedHtml = html.replace('{{rows}}', await getHtmlRows());

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(processedHtml);
        } catch (err) {
            console.error(err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error loading index.html');
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Route not found');
    }
  // ... (другие обработчики)

  else if (req.url.startsWith('/api/items/') && req.method === 'PUT') {
    const id = req.url.split('/')[3];
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
      try {
        const { text } = JSON.parse(body);
        await updateItem(id, text);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id, text }));
      } catch (error) {
        console.error(error);
        res.writeHead(500);
        res.end('Error updating item');
      }
    });
  }
}

// Create and start server
const server = http.createServer(handleRequest);
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));