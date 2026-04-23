import { useMutation } from "@tanstack/react-query";
import {
  updateAccountEmail,
  updateAccountPassword,
  type UpdateAccountEmailBody,
  type UpdateAccountPasswordBody,
} from "@/lib/auth-api";
import { useUserStore } from "@/store/use-user-store";

export function useUpdateAccountEmail() {
  const updateEmail = useUserStore((state) => state.updateEmail);

  return useMutation({
    mutationFn: (body: UpdateAccountEmailBody) => updateAccountEmail(body),
    onSuccess: (updatedUser) => {
      updateEmail(updatedUser.email);
    },
  });
}

export function useUpdateAccountPassword() {
  return useMutation({
    mutationFn: (body: UpdateAccountPasswordBody) =>
      updateAccountPassword(body),
  });
}
