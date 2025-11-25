import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import useLocalStorage from "../hooks/useLocalStorage";

interface AuthContextType {
  authToken: string | null;
  userEmail: string | null;
  login: (token: string, email: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [storedAuthToken, setStoredAuthToken] = useLocalStorage<string | null>(
    "authToken",
    null,
  );
  const [storedUserEmail, setStoredUserEmail] = useLocalStorage<string | null>(
    "userEmail",
    null,
  );

  const [authToken, setAuthToken] = useState<string | null>(storedAuthToken);
  const [userEmail, setUserEmail] = useState<string | null>(storedUserEmail);

  useEffect(() => {
    setAuthToken(storedAuthToken);
    setUserEmail(storedUserEmail);
  }, [storedAuthToken, storedUserEmail]);

  const login = useCallback(
    (token: string, email: string) => {
      setAuthToken(token);
      setUserEmail(email);
      setStoredAuthToken(token);
      setStoredUserEmail(email);
    },
    [setStoredAuthToken, setStoredUserEmail],
  );

  const logout = useCallback(() => {
    setAuthToken(null);
    setUserEmail(null);
    setStoredAuthToken(null);
    setStoredUserEmail(null);
  }, [setStoredAuthToken, setStoredUserEmail]);

  const isAuthenticated = !!authToken;

  return (
    <AuthContext.Provider
      value={{ authToken, userEmail, login, logout, isAuthenticated }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
