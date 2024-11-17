const { spawn } = require('child_process');
const readline = require('readline');
const WebSocket = require('ws');

// Spawn the Client.exe executable
const clientProcess = spawn('./Client.exe');

// Interface for user input and output
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// WebSocket server setup
const wss = new WebSocket.Server({ port: 3001 });
let userName = ''; // Store the user's name

console.log('WebSocket server running on ws://localhost:3001');

// Handle incoming WebSocket connections
wss.on('connection', (ws) => {
    console.log('WebSocket client connected.');

    // Relay data from the C client process to WebSocket clients
    clientProcess.stdout.on('data', (data) => {
        const message = data.toString().trim();
        console.log(`C Client Output: ${message}`);
        ws.send(message); // Send to WebSocket clients
    });

    // Relay messages from WebSocket to the C client process
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data); // Parse the incoming JSON string
            console.log(`WebSocket received: ${JSON.stringify(message)}`); // Log the full message
            console.log(`${message.key} & ${message.message}`); // Log specific fields
    
            // Uncomment these lines to send data to the C client process:
            clientProcess.stdin.write(message.key+ '\n' + message.message + '\n');
        } catch (error) {
            console.error("Error parsing JSON:", error);
        }
    });
    

    // Handle WebSocket disconnection
    ws.on('close', () => {
        console.log('WebSocket client disconnected.');
    });
});

// Prompt the user for their name
rl.question('Enter your name: ', (name) => {
    userName = name.trim();
    console.log(`Hello, ${userName}!`);
    clientProcess.stdin.write(`${userName}\n`); // Send name to C client process
});

// Handle errors from the C client process
clientProcess.stderr.on('data', (data) => {
    console.error(`C Client Error: ${data.toString()}`);
});

// Handle when the C client process exits
clientProcess.on('close', (code) => {
    console.log(`C Client process exited with code ${code}`);
    rl.close();
    process.exit(0);
});
