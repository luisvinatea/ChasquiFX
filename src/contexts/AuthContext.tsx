/**
 * Authentication Context Provider
 * Manages global authentication state across the React application
 */

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ComponentType,
  ReactNode,
} from "react";
import {
  signInUser,
  signUpUser,
  signOutUser,
  verifyToken,
  isAuthenticated,
} from "../services/mongoDbClient";

// Types
interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  createdAt?: string;
  lastLogin?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string; user?: User }>;
  signup: (
    email: string,
    password: string,
    name?: string
  ) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => Promise<{ success: boolean }>;
  clearError: () => void;
  refreshUser: () => Promise<{
    success: boolean;
    error?: string;
    user?: User;
  }>;
}

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Action types
const AUTH_ACTIONS = {
  AUTH_START: "AUTH_START",
  AUTH_SUCCESS: "AUTH_SUCCESS",
  AUTH_ERROR: "AUTH_ERROR",
  LOGOUT: "LOGOUT",
  CLEAR_ERROR: "CLEAR_ERROR",
  SET_LOADING: "SET_LOADING",
} as const;

type AuthAction =
  | { type: "AUTH_START" }
  | { type: "AUTH_SUCCESS"; payload: { user: User } }
  | { type: "AUTH_ERROR"; payload: { error: string } }
  | { type: "LOGOUT" }
  | { type: "CLEAR_ERROR" }
  | { type: "SET_LOADING"; payload: { isLoading: boolean } };

// Reducer function
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case AUTH_ACTIONS.AUTH_START:
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case AUTH_ACTIONS.AUTH_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

    case AUTH_ACTIONS.AUTH_ERROR:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload.error,
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload.isLoading,
      };

    default:
      return state;
  }
}

// Create context
const AuthContext = createContext<AuthContextType | null>(null);

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize authentication state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      dispatch({
        type: AUTH_ACTIONS.SET_LOADING,
        payload: { isLoading: true },
      });

      // Check if user is already authenticated
      if (isAuthenticated()) {
        // Verify token is still valid
        const result = await verifyToken();

        if (result.valid && result.user) {
          dispatch({
            type: AUTH_ACTIONS.AUTH_SUCCESS,
            payload: { user: result.user },
          });
        } else {
          // Token is invalid, clear auth state
          dispatch({ type: AUTH_ACTIONS.LOGOUT });
        }
      } else {
        dispatch({
          type: AUTH_ACTIONS.SET_LOADING,
          payload: { isLoading: false },
        });
      }
    } catch (error) {
      console.error("Auth initialization error:", error);
      dispatch({
        type: AUTH_ACTIONS.AUTH_ERROR,
        payload: { error: "Failed to initialize authentication" },
      });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      dispatch({ type: AUTH_ACTIONS.AUTH_START });

      const result = await signInUser(email, password);

      if (result.error) {
        dispatch({
          type: AUTH_ACTIONS.AUTH_ERROR,
          payload: { error: result.error },
        });
        return { success: false, error: result.error };
      }

      dispatch({
        type: AUTH_ACTIONS.AUTH_SUCCESS,
        payload: { user: result.user },
      });

      return { success: true, user: result.user };
    } catch (error) {
      const errorMessage = (error as Error).message || "Login failed";
      dispatch({
        type: AUTH_ACTIONS.AUTH_ERROR,
        payload: { error: errorMessage },
      });
      return { success: false, error: errorMessage };
    }
  };

  const signup = async (email: string, password: string, name?: string) => {
    try {
      dispatch({ type: AUTH_ACTIONS.AUTH_START });

      const result = await signUpUser(email, password, name || "");

      if (result.error) {
        dispatch({
          type: AUTH_ACTIONS.AUTH_ERROR,
          payload: { error: result.error },
        });
        return { success: false, error: result.error };
      }

      dispatch({
        type: AUTH_ACTIONS.AUTH_SUCCESS,
        payload: { user: result.user },
      });

      return { success: true, user: result.user };
    } catch (error) {
      const errorMessage = (error as Error).message || "Signup failed";
      dispatch({
        type: AUTH_ACTIONS.AUTH_ERROR,
        payload: { error: errorMessage },
      });
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await signOutUser();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear local state even if API call fails
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      return { success: true };
    }
  };

  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  const refreshUser = async () => {
    try {
      const result = await verifyToken();

      if (result.valid && result.user) {
        dispatch({
          type: AUTH_ACTIONS.AUTH_SUCCESS,
          payload: { user: result.user },
        });
        return { success: true, user: result.user };
      } else {
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
        return { success: false, error: "Token invalid" };
      }
    } catch (error) {
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      return { success: false, error: (error as Error).message };
    }
  };

  // Context value
  const value: AuthContextType = {
    // State
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,

    // Actions
    login,
    signup,
    logout,
    clearError,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

// HOC to protect components that require authentication
export function withAuth<P extends object>(Component: ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return <div>Loading...</div>; // You can customize this loading component
    }

    if (!isAuthenticated) {
      return <div>Please log in to access this page.</div>; // You can redirect to login page
    }

    return <Component {...props} />;
  };
}
