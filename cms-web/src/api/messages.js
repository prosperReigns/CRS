import API from "./axios";

export const getMessages = () =>
  API.get("communication/messages/");

export const getConversations = () =>
  API.get("communication/messages/conversations/");

export const sendMessage = (data) =>
  API.post("communication/messages/", data);