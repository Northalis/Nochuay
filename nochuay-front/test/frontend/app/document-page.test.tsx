import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DocumentPage from "@/app/(main)/documents/[id]/page";
import { useQuery } from "@tanstack/react-query";
import { useSidebarTree, useUpdatePage, pageKeys } from "@/hooks/use-pages";
import { useUserStore } from "@/store/use-user-store";

const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

jest.mock("next/dynamic", () => {
  return () => () => <div data-testid="blocknote-editor" />;
});

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
}));

jest.mock("@/hooks/use-pages", () => ({
  pageKeys: {
    detail: (userID: string | null, id: string) => ["pages", userID, id],
  },
  useSidebarTree: jest.fn(),
  useUpdatePage: jest.fn(),
}));

jest.mock("@/store/use-user-store", () => ({
  useUserStore: jest.fn(),
}));

jest.mock("@/lib/breadcrumb", () => ({
  buildBreadcrumbSegments: jest.fn(() => []),
}));

jest.mock("@/components/layout/BreadcrumbNavigator", () => {
  return function BreadcrumbNavigator() {
    return <nav data-testid="breadcrumb" />;
  };
});

const mockUseQuery = useQuery as jest.Mock;
const mockUseSidebarTree = useSidebarTree as jest.Mock;
const mockUseUpdatePage = useUpdatePage as jest.Mock;
const mockUseUserStore = useUserStore as jest.Mock;

const mockMutation = { mutate: jest.fn() };

describe("DocumentPage", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    mockUseUserStore.mockImplementation((selector?: (state: any) => unknown) =>
      selector
        ? selector({ user: { id: "user-1" } })
        : { user: { id: "user-1" } },
    );

    mockUseSidebarTree.mockReturnValue({ data: [] });
    mockUseUpdatePage.mockReturnValue(mockMutation);
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  test("debounces title updates", async () => {
    mockUseQuery.mockReturnValue({
      data: { id: "page-1", title: "Initial", content: "[]" },
      isLoading: false,
      error: null,
      queryKey: pageKeys.detail("user-1", "page-1"),
    });

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<DocumentPage params={Promise.resolve({ id: "page-1" })} />);

    const input = await screen.findByLabelText("Page title");

    await user.clear(input);
    await user.type(input, "New Title");

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockMutation.mutate).toHaveBeenCalledWith(
      { id: "page-1", title: "New Title" },
      expect.any(Object),
    );
  });

  test("commits title on blur", async () => {
    mockUseQuery.mockReturnValue({
      data: { id: "page-1", title: "Initial", content: "[]" },
      isLoading: false,
      error: null,
      queryKey: pageKeys.detail("user-1", "page-1"),
    });

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<DocumentPage params={Promise.resolve({ id: "page-1" })} />);

    const input = await screen.findByLabelText("Page title");

    await user.clear(input);
    await user.type(input, "Blur Commit");
    await user.tab();

    expect(mockMutation.mutate).toHaveBeenCalledWith(
      { id: "page-1", title: "Blur Commit" },
      expect.any(Object),
    );
  });
});
