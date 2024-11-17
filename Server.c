#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <winsock2.h>
#include <process.h> // For _beginthreadex

#pragma comment(lib, "ws2_32.lib")

#define PORT 12345
#define MAX_CLIENTS 10
#define BUFFER_SIZE 1024

typedef struct
{
    SOCKET socket;
    char name[30];
    int assignedNumber;
} Client;

Client *clientList[MAX_CLIENTS];
int clientCount = 0;
CRITICAL_SECTION clientListLock;

// Update assigned numbers for all clients
void updateAssignedNumbers()
{
    for (int i = 0; i < clientCount; i++)
    {
        clientList[i]->assignedNumber = i + 1;
    }
}

// Notify all clients about a status change
void broadcastStatus(const char *message)
{
    EnterCriticalSection(&clientListLock);
    for (int i = 0; i < clientCount; i++)
    {
        send(clientList[i]->socket, message, strlen(message), 0);
    }
    LeaveCriticalSection(&clientListLock);
}

// Client handler function
unsigned __stdcall clientHandler(void *arg)
{
    Client *client = (Client *)arg;
    char buffer[BUFFER_SIZE];

    // Ask for the client's name
    recv(client->socket, client->name, sizeof(client->name), 0);
    client->name[strcspn(client->name, "\n")] = '\0';

    // Notify all about the new client
    char joinMessage[BUFFER_SIZE];
    sprintf(joinMessage, "%d %s 1\n", client->assignedNumber, client->name);
    printf("%s", joinMessage);
    fflush(stdout);

    // Main chat loop
    while (1)
    {
        int bytesRead = recv(client->socket, buffer, sizeof(buffer), 0);
        if (bytesRead <= 0)
        {
            break; // Client disconnected
        }

        buffer[strcspn(buffer, "\n")] = 0;
        int recipientIndex = atoi(buffer) - 1;

        EnterCriticalSection(&clientListLock);
        if (recipientIndex < 0 || recipientIndex >= clientCount)
        {
            LeaveCriticalSection(&clientListLock);
            send(client->socket, "Invalid selection.\n", 19, 0);
            continue;
        }
        Client *recipient = clientList[recipientIndex];
        LeaveCriticalSection(&clientListLock);

        // Chat loop
        while (1)
        {
            memset(buffer, 0, BUFFER_SIZE);
            int bytesRead = recv(client->socket, buffer, BUFFER_SIZE, 0);
            if (bytesRead <= 0)
            {
                break;
            }

            buffer[strcspn(buffer, "\n")] = 0;
            if (strcmp(buffer, "exit") == 0)
            {
                send(client->socket, "Exiting chat.\n", 15, 0);
                return 0;
            }

            char message[BUFFER_SIZE];
            sprintf(message, "%d:%s\n", client->assignedNumber, buffer);
            send(recipient->socket, message, strlen(message), 0);
            break;
        }
    }

    // Handle client disconnect
    closesocket(client->socket);
    EnterCriticalSection(&clientListLock);
    for (int i = 0; i < clientCount; i++)
    {
        if (clientList[i] == client)
        {
            for (int j = i; j < clientCount - 1; j++)
            {
                clientList[j] = clientList[j + 1];
            }
            clientCount--;
            break;
        }
    }
    updateAssignedNumbers();
    LeaveCriticalSection(&clientListLock);

    sprintf(joinMessage, "%d %s 0\n", client->assignedNumber, client->name);
    printf("%s", joinMessage);
    fflush(stdout);
    free(client);
    return 0;
}

int main()
{
    WSADATA wsaData;
    SOCKET serverSocket, clientSocket;
    struct sockaddr_in serverAddr, clientAddr;
    int addrSize = sizeof(clientAddr);

    // Initialize Winsock
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0)
    {
        printf("Winsock initialization failed\n");
        return 1;
    }

    // Create server socket
    serverSocket = socket(AF_INET, SOCK_STREAM, 0);
    if (serverSocket == INVALID_SOCKET)
    {
        printf("Socket creation failed: %d\n", WSAGetLastError());
        WSACleanup();
        return 1;
    }

    // Set up server address
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_port = htons(PORT);
    serverAddr.sin_addr.s_addr = INADDR_ANY;

    // Bind server socket
    if (bind(serverSocket, (struct sockaddr *)&serverAddr, sizeof(serverAddr)) == SOCKET_ERROR)
    {
        printf("Bind failed: %d\n", WSAGetLastError());
        closesocket(serverSocket);
        WSACleanup();
        return 1;
    }

    // Listen for incoming connections
    if (listen(serverSocket, MAX_CLIENTS) == SOCKET_ERROR)
    {
        printf("Listen failed: %d\n", WSAGetLastError());
        closesocket(serverSocket);
        WSACleanup();
        return 1;
    }

    InitializeCriticalSection(&clientListLock);

    // Main loop
    while (1)
    {
        clientSocket = accept(serverSocket, (struct sockaddr *)&clientAddr, &addrSize);
        if (clientSocket == INVALID_SOCKET)
        {
            printf("Accept failed: %d\n", WSAGetLastError());
            continue;
        }

        if (clientCount >= MAX_CLIENTS)
        {
            printf("Max clients reached. Connection refused.\n");
            closesocket(clientSocket);
            continue;
        }

        Client *newClient = (Client *)malloc(sizeof(Client));
        newClient->socket = clientSocket;
        newClient->assignedNumber = clientCount + 1;

        EnterCriticalSection(&clientListLock);
        clientList[clientCount++] = newClient;
        LeaveCriticalSection(&clientListLock);

        _beginthreadex(NULL, 0, clientHandler, (void *)newClient, 0, NULL);
    }

    DeleteCriticalSection(&clientListLock);
    closesocket(serverSocket);
    WSACleanup();
    return 0;
}
