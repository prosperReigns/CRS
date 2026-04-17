import API, { getErrorMessage } from "./client";
import type { Conversation, Message, User } from "../types";
import { toList } from "./utils";

export interface SendMessagePayload {
  recipient: number;
  content: string;
}

export const getMessages = async (): Promise<Message[]> => {
  try {
    const response = await API.get<Message[] | { results: Message[] }>("communication/messages/");
    return toList(response.data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load messages."));
  }
};

export const getConversationThread = async (userId: number): Promise<Message[]> => {
  try {
    const response = await API.get<Message[]>("communication/messages/thread/", { params: { user_id: userId } });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load chat messages."));
  }
};

export const getConversations = async (): Promise<Conversation[]> => {
  try {
    const response = await API.get<Conversation[] | { results: Conversation[] }>("communication/messages/conversations/");
    return toList(response.data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load conversations."));
  }
};

export const getMessageRecipients = async (): Promise<Pick<User, "id" | "username" | "first_name" | "last_name" | "role">[]> => {
  try {
    const response = await API.get<Pick<User, "id" | "username" | "first_name" | "last_name" | "role">[]>(
      "communication/messages/recipients/"
    );
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load available recipients."));
  }
};

export const sendMessage = async (data: SendMessagePayload): Promise<Message> => {
  try {
    const response = await API.post<Message>("communication/messages/", data);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to send message."));
  }
};
