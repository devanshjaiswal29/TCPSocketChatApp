import React, { useEffect, useState } from "react";

const ClientList = ({ onSelectClient }) => {
  const [clients, setClients] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const ws = new WebSocket("ws://192.168.0.2:3000");

    ws.onmessage = (event) => {
      try {
        const updatedClients = JSON.parse(event.data);
        setClients(updatedClients);
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    ws.onerror = (err) => {
      setError("WebSocket error occurred. Falling back to API.");
      console.error(err);
    };

    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    if (error) {
      fetch("http://192.168.0.2:3000/clients")
        .then((response) => response.json())
        .then((data) => setClients(data))
        .catch((err) => console.error("HTTP fallback error:", err));
    }
  }, [error]);

  const handleClientClick = (client, index) => {
    console.log(`Selected Client: ${client.name}, Index: ${client.index}`);
    onSelectClient({ ...client, index });
  };

  return (
    <div>
      <h1>Connected Clients</h1>
      <ul>
        {clients.length > 0 ? (
          clients.map((client, index) => (
            <li
              key={client.index} // Use the unique index sent from the server
              onClick={() => handleClientClick(client, client.index)}
              style={{
                cursor: "pointer",
                padding: "10px",
                borderBottom: "1px solid #ddd",
              }}
            >
              <strong>{client.name}</strong> (Status: {client.status})
            </li>
          ))
        ) : (
          <li>No clients connected.</li>
        )}
      </ul>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default ClientList;