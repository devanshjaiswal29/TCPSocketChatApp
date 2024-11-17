#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <winsock2.h>
#include <windows.h>
#include <pthread.h>

#define SERVER_IP "192.168.0.2"
#define SERVER_PORT 12345
#define BUFFER_SIZE 1048576

#pragma comment(lib, "ws2_32.lib") // Link with Winsock library

// Function to receive messages from the server
void *receiveMessages(void *socketDescriptor)
{
    SOCKET sock = *(SOCKET *)socketDescriptor;
    char buffer[BUFFER_SIZE];
    while (1)
    {
        memset(buffer, 0, BUFFER_SIZE);
        int bytesRead = recv(sock, buffer, BUFFER_SIZE, 0);
        if (bytesRead <= 0)
        {
            printf("Disconnected from server.\n");
            fflush(stdout); // Ensure output is flushed
            closesocket(sock);
            WSACleanup();
            exit(1);
        }
        printf("%s", buffer);
        fflush(stdout); // Ensure output is flushed
    }
    return NULL;
}

int main()
{
    WSADATA wsaData;
    SOCKET clientSocket;
    struct sockaddr_in serverAddr;
    char message[BUFFER_SIZE];
    pthread_t recvThread;

    // Initialize Winsock
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0)
    {
        printf("WSAStartup failed. Error Code: %d\n", WSAGetLastError());
        return 1;
    }

    // Create client socket
    clientSocket = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (clientSocket == INVALID_SOCKET)
    {
        printf("Socket creation failed. Error Code: %d\n", WSAGetLastError());
        WSACleanup();
        return 1;
    }

    // Set up server address
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_port = htons(SERVER_PORT);
    serverAddr.sin_addr.s_addr = inet_addr(SERVER_IP);

    // Connect to the server
    if (connect(clientSocket, (struct sockaddr *)&serverAddr, sizeof(serverAddr)) == SOCKET_ERROR)
    {
        printf("Connection to server failed. Error Code: %d\n", WSAGetLastError());
        closesocket(clientSocket);
        WSACleanup();
        return 1;
    }

    // Start thread to receive messages
    pthread_create(&recvThread, NULL, receiveMessages, (void *)&clientSocket);
    pthread_detach(recvThread);

    // Main loop to send messages to the server
    while (1)
    {
        fgets(message, BUFFER_SIZE, stdin);
        if (strcmp(message, "exit\n") == 0)
        {
            break;
        }
        send(clientSocket, message, strlen(message), 0);
    }

    closesocket(clientSocket);
    WSACleanup();
    return 0;
}
