const { spawn } = require('child_process');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');

// Initialize Express server
const app = express();
app.use(cors()); // Enable CORS if frontend and backend are on different origins
const PORT = 3000;

// Start the Express server
const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Spawn the C executable
const cProcess = spawn('./Server.exe');

// Array to store client data
const clients = [];

// Setup WebSocket server
const wss = new WebSocketServer({ server });

// Express route to get the current client list
app.get('/clients', (req, res) => {
    console.log(clients);
    res.json(clients); // Fallback API for non-WebSocket clients
});

// Function to broadcast the updated client list to all connected WebSocket clients
const broadcastClients = () => {
    const clientListJSON = JSON.stringify(clients);
    wss.clients.forEach((ws) => {
        if (ws.readyState === ws.OPEN) {
            ws.send(clientListJSON); // Send updated client list to each connected client
        }
    });
};

// Log any output from the C process
cProcess.stdout.on('data', (data) => {
    const output = data.toString().split('\n');

    output.forEach((line) => {
        if (line.trim() === '') return; // Skip empty lines

        const parts = line.split(' ');

        if (parts.length === 3) {
            const index = parseInt(parts[0].trim(), 10); // Convert to zero-based index
            const name = parts[1].trim();
            const status = parseInt(parts[2].trim(), 10);
            console.log(index+"  --  "+name+"  --  "+status);
            if (status === 0) {
                if (index >= 0 && index < clients.length) {
                    console.log(`Removing client at index ${index}:, clients[index]`);
                    clients.splice(index-1, 1); // Remove client
                    for (let i = index - 1; i < clients.length; i++) {
                        clients[i].index--;
                    }
                } else {
                    console.error(`Invalid index for removal: ${index}`);
                }
            } else {
                clients.push({index, name, status }); // Add or update client
            }
        }
    });

    broadcastClients(); // Broadcast updated client list
    console.log('Updated clients:', clients);
});

// Log errors from the C process
cProcess.stderr.on('data', (data) => {
    console.error(`C Error: ${data}`);
});

// Handle process exit
cProcess.on('close', (code) => {
    console.log(`C Process exited with code ${code}`);
});

// WebSocket connection handler
wss.on('connection', (ws) => {
    //console.log('A WebSocket client connected.: '+clients);

    // Send the initial client list to the new WebSocket client
    ws.send(JSON.stringify(clients));

    ws.on('close', () => {
        console.log('A WebSocket client disconnected.');
    });
});