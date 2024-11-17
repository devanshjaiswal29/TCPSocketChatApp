import React, { useState, useEffect } from "react";
import ClientList from "./components/ClientList";
import ChatInterface from "./components/ChatInterface";

const App = () => {
  const [selectedClient, setSelectedClient] = useState(null);
  const [chatHistories, setChatHistories] = useState({});
  const [ws, setWs] = useState(null); // Centralized WebSocket connection

  // Setup WebSocket connection
  useEffect(() => {
    const webSocket = new WebSocket("ws://localhost:3001");

    // WebSocket events
    webSocket.onopen = () => {
      console.log("WebSocket connected");
    };

    webSocket.onmessage = (event) => {
      try {
        // Assuming the message format is "1:Hey"
        const message = event.data;
        
        // Split the message by ':' to get the key and message parts
        const [key, messageText] = message.split(':');
    
        // Create a message object
        const messageObject = {
          key: key.trim(),      // Remove extra spaces, if any
          message: messageText.trim()  // Remove extra spaces, if any
        };
    
        handleReceivedMessage(messageObject);  // Pass the parsed object
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
    

    webSocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    webSocket.onclose = () => {
      console.log("WebSocket disconnected");
    };

    setWs(webSocket);

    return () => {
      webSocket.close();
    };
  }, []);

  // Handle received messages
  const handleReceivedMessage = (messageObject) => {
    console.log("Received message:", messageObject);
    
    // Ensure key exists and is valid
    setChatHistories((prevHistories) => {
      // Ensure that the key is the client index, not just a generic string
      const updatedHistories = { ...prevHistories };

      // If there's no existing history for this key, create an empty array
      if (!updatedHistories[messageObject.key]) {
        updatedHistories[messageObject.key] = [];
      }

      // Append the new message to the chat history of the specific client
      updatedHistories[messageObject.key].push({
        sender: messageObject.key,
        text: messageObject.message,
      });

      return updatedHistories;
    });
};


  // Handle sending messages
  const handleSendMessage = (clientIndex, message) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const messageObject = {
        key: clientIndex, // Identify the client
        message: message,
      };

      ws.send(JSON.stringify(messageObject));
      console.log("Sent message:", messageObject);

      // Update chat history locally
      setChatHistories((prevHistories) => ({
        ...prevHistories,
        [clientIndex]: [
          ...(prevHistories[clientIndex] || []),
          { sender: "You", text: message },
        ],
      }));
    } else {
      console.error("WebSocket is not connected or message is empty.");
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div style={{ width: "30%", borderRight: "1px solid #ddd", padding: "20px" }}>
        <ClientList onSelectClient={setSelectedClient} />
      </div>
      <div style={{ flex: 1, padding: "20px" }}>
        {selectedClient ? (
          <ChatInterface
            client={selectedClient}
            messages={chatHistories[selectedClient.index] || []}
            onSendMessage={(message) => handleSendMessage(selectedClient.index, message)}
          />
        ) : (
          <p>Select a client to start chatting.</p>
        )}
      </div>
    </div>
  );
};

export default App;
