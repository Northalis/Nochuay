import { apiFetch } from "@/lib/api";

export interface AccountUser {
  id: string;
  email: string;
  createdAt: string;
}

export interface UpdateAccountEmailBody {
  currentPassword: string;
  newEmail: string;
}

export interface UpdateAccountPasswordBody {
  currentPassword: string;
  newPassword: string;
}

export function updateAccountEmail(
  body: UpdateAccountEmailBody,
): Promise<AccountUser> {
  return apiFetch<AccountUser>("/auth/account/email", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function updateAccountPassword(
  body: UpdateAccountPasswordBody,
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/auth/account/password", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
