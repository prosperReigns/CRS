import API from "./axios";

const toList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);
const resolveReceiverId = (data) => data.receiver ?? data.recipient;

const unwrapError = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  throw new Error(detail || fallback);
};

export const getMessages = async () => {
  try {
    const response = await API.get("communication/messages/");
    return toList(response.data);
  } catch (error) {
    unwrapError(error, "Failed to load messages.");
  }
};

export const getConversations = async () => {
  try {
    const response = await API.get("communication/messages/conversations/");
    return toList(response.data);
  } catch (error) {
    unwrapError(error, "Failed to load conversations.");
  }
};

export const sendMessage = async (data) => {
  try {
    const payload = {
      content: data.content,
      receiver: resolveReceiverId(data),
    };
    const response = await API.post("communication/messages/", payload);
    return response.data;
  } catch (error) {
    unwrapError(error, "Failed to send message.");
  }
};
