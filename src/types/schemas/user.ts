export interface User {
  id: string;
  role: "SUPER" | "ADMIN" | "USER";
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}