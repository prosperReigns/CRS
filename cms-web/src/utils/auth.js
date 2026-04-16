export const setAuth = (data) => {
  localStorage.setItem("token", data.access);
  localStorage.setItem("user", JSON.stringify(data.user));
};

export const getUser = () => {
  return JSON.parse(localStorage.getItem("user"));
};

export const logout = () => {
  localStorage.clear();
};