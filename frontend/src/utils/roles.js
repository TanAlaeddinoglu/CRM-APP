export function isAdmin(user) {
  return user?.role === "ADMIN";
}

export function isUser(user) {
  return user?.role === "USER";
}
