import React, { useState } from "react";

const ChatInterface = ({ client, messages, onSendMessage }) => {
  const [message, setMessage] = useState("");

  const handleSendMessage = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
    }
  };

  return (
    <div>
      <h2>Chat with {client.name}</h2>
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "5px",
          height: "70%",
          overflowY: "auto",
          padding: "10px",
          marginBottom: "10px",
        }}
      >
        {messages.length > 0 ? (
          messages.map((msg, index) => (
            <div key={index} style={{ marginBottom: "10px" }}>
              <strong>{msg.sender}:</strong> {msg.text}
            </div>
          ))
        ) : (
          <p>No messages yet.</p>
        )}
      </div>
      <div style={{ display: "flex", gap: "10px" }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          style={{ flex: 1, padding: "10px", borderRadius: "5px", border: "1px solid #ddd" }}
        />
        <button
          onClick={handleSendMessage}
          style={{
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatInterface;