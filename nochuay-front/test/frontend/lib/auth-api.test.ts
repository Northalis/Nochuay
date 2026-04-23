/**
 * Unit Tests: auth-api functions
 *
 * Tests account API wrapper functions: updateAccountEmail, updateAccountPassword.
 */

jest.mock("@/lib/api", () => ({
  apiFetch: jest.fn(),
}));

import { apiFetch } from "@/lib/api";
import { updateAccountEmail, updateAccountPassword } from "@/lib/auth-api";

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe("auth-api", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("updateAccountEmail", () => {
    test("calls account email endpoint with PATCH payload", async () => {
      const mockUser = {
        id: "user-1",
        email: "updated@example.com",
        createdAt: "2025-01-01T00:00:00Z",
      };
      mockApiFetch.mockResolvedValueOnce(mockUser);

      const result = await updateAccountEmail({
        currentPassword: "secret123",
        newEmail: "updated@example.com",
      });

      expect(mockApiFetch).toHaveBeenCalledWith("/auth/account/email", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword: "secret123",
          newEmail: "updated@example.com",
        }),
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe("updateAccountPassword", () => {
    test("calls account password endpoint with PATCH payload", async () => {
      const mockResponse = { success: true };
      mockApiFetch.mockResolvedValueOnce(mockResponse);

      const result = await updateAccountPassword({
        currentPassword: "old-pass",
        newPassword: "new-pass-123",
      });

      expect(mockApiFetch).toHaveBeenCalledWith("/auth/account/password", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword: "old-pass",
          newPassword: "new-pass-123",
        }),
      });
      expect(result).toEqual(mockResponse);
    });
  });
});
