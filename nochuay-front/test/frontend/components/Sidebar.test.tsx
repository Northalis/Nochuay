import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Sidebar from "@/components/layout/Sidebar";
import {
  useSidebarTree,
  useCreatePage,
  usePageSearch,
  useTrashPages,
  useRestorePage,
  useDeletePagePermanently,
} from "@/hooks/use-pages";
import {
  useUpdateAccountEmail,
  useUpdateAccountPassword,
} from "@/hooks/use-account";
import { useUserStore } from "@/store/use-user-store";
import { useSidebarStore } from "@/store/use-sidebar-store";
import { useThemeStore } from "@/store/use-theme-store";

const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

jest.mock("@/hooks/use-pages", () => ({
  useSidebarTree: jest.fn(),
  useCreatePage: jest.fn(),
  usePageSearch: jest.fn(),
  useTrashPages: jest.fn(),
  useRestorePage: jest.fn(),
  useDeletePagePermanently: jest.fn(),
}));

jest.mock("@/hooks/use-account", () => ({
  useUpdateAccountEmail: jest.fn(),
  useUpdateAccountPassword: jest.fn(),
}));

jest.mock("@/store/use-user-store", () => ({
  useUserStore: jest.fn(),
}));

jest.mock("@/store/use-sidebar-store", () => ({
  useSidebarStore: jest.fn(),
}));

jest.mock("@/store/use-theme-store", () => ({
  useThemeStore: jest.fn(),
}));

const mockUseSidebarTree = useSidebarTree as jest.Mock;
const mockUseCreatePage = useCreatePage as jest.Mock;
const mockUsePageSearch = usePageSearch as jest.Mock;
const mockUseTrashPages = useTrashPages as jest.Mock;
const mockUseRestorePage = useRestorePage as jest.Mock;
const mockUseDeletePagePermanently = useDeletePagePermanently as jest.Mock;

const mockUseUpdateAccountEmail = useUpdateAccountEmail as jest.Mock;
const mockUseUpdateAccountPassword = useUpdateAccountPassword as jest.Mock;

const mockUseUserStore = useUserStore as jest.Mock;
const mockUseSidebarStore = useSidebarStore as jest.Mock;
const mockUseThemeStore = useThemeStore as jest.Mock;

function renderSidebar() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <Sidebar onClose={jest.fn()} />
    </QueryClientProvider>,
  );
}

describe("Sidebar", () => {
  const mockUserState = {
    user: { id: "user-1", email: "alex@nochuay.dev" },
    logout: jest.fn(),
  };
  const mockSidebarState = {
    reset: jest.fn(),
    expandedIds: new Set<string>(),
    toggle: jest.fn(),
    expand: jest.fn(),
    renamingId: null,
    setRenamingId: jest.fn(),
  };
  const mockThemeState = {
    mode: "light",
    setMode: jest.fn(),
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    mockUseSidebarTree.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    mockUseCreatePage.mockReturnValue({ mutate: jest.fn(), isPending: false });
    mockUseTrashPages.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    mockUseRestorePage.mockReturnValue({ mutate: jest.fn(), isPending: false });
    mockUseDeletePagePermanently.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    });

    mockUseUpdateAccountEmail.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    });
    mockUseUpdateAccountPassword.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    });

    mockUseUserStore.mockImplementation((selector?: (state: any) => unknown) =>
      selector ? selector(mockUserState) : mockUserState,
    );

    mockUseSidebarStore.mockImplementation(
      (selector?: (state: any) => unknown) =>
        selector ? selector(mockSidebarState) : mockSidebarState,
    );

    mockUseThemeStore.mockImplementation(
      (selector?: (state: any) => unknown) =>
        selector ? selector(mockThemeState) : mockThemeState,
    );

    mockUsePageSearch.mockImplementation((query: string, enabled: boolean) => {
      if (!enabled || query.length === 0) {
        return { data: [], isLoading: false, isError: false };
      }
      if (query === "road") {
        return {
          data: [{ id: "page-1", title: "Roadmap", icon: null }],
          isLoading: false,
          isError: false,
        };
      }
      return { data: [], isLoading: false, isError: false };
    });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  test("opens settings and switches to preference tab", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    renderSidebar();

    await user.click(screen.getByRole("button", { name: "Settings" }));

    expect(screen.getByText("Settings")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Preference" }));

    expect(screen.getByText("Theme")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Dark" }));

    expect(mockThemeState.setMode).toHaveBeenCalledWith("dark");
  });

  test("search modal shows results and navigates", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    renderSidebar();

    await user.click(screen.getByRole("button", { name: "Search" }));

    const input = screen.getByPlaceholderText("Search pages by title...");
    await user.type(input, "road");

    act(() => {
      jest.advanceTimersByTime(300);
    });

    const result = await screen.findByText("Roadmap");
    await user.click(result);

    expect(push).toHaveBeenCalledWith("/documents/page-1");
  });

  test("search modal shows empty state when no results", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    renderSidebar();

    await user.click(screen.getByRole("button", { name: "Search" }));

    const input = screen.getByPlaceholderText("Search pages by title...");
    await user.type(input, "missing");

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(await screen.findByText("No pages found.")).toBeInTheDocument();
  });
});
