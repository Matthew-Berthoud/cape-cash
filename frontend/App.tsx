import { useState, useEffect } from "react";
import { Page, Receipt, ExpenseItem } from "./types";
import useLocalStorage from "./hooks/useLocalStorage";
import { LOCAL_STORAGE_KEYS } from "./constants";
import FileUploadPage from "./components/FileUploadPage";
import ExpenseFormPage from "./components/ExpenseFormPage";
import PdfPreviewPage from "./components/PdfPreviewPage";
import { db } from "./services/idb";
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from './context/AuthContext';

function App() {
  const { isAuthenticated, login, logout, userEmail } = useAuth();
  const [page, setPage] = useState<Page>(Page.Upload);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [expenseItems, setExpenseItems] = useLocalStorage<ExpenseItem[]>(
    LOCAL_STORAGE_KEYS.EXPENSE_ITEMS,
    [],
  );

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      // For now, directly log in with the Google access token and a placeholder email.
      // In a real application, this token would be sent to the backend for verification
      // and to obtain user details, including the email.
      // The backend would then issue its own session token.
      console.log('Google login successful:', tokenResponse);
      const userEmail = 'placeholder@blackcape.io'; // This should come from backend after token verification
      login(tokenResponse.access_token, userEmail);
    },
    onError: (errorResponse) => console.log('Google login failed:', errorResponse),
  });

  // Load receipts from IndexedDB on initial render
  useEffect(() => {
    db.receipts.toArray().then(setReceipts);
  }, []);

  const updateReceipts = async (
    newReceipts: Receipt[] | ((prev: Receipt[]) => Receipt[]),
  ) => {
    const receiptsToStore =
      newReceipts instanceof Function ? newReceipts(receipts) : newReceipts;
    setReceipts(receiptsToStore);
    await db.receipts.clear();
    await db.receipts.bulkAdd(receiptsToStore);
  };

  const renderPage = () => {
    switch (page) {
      case Page.Upload:
        return (
          <FileUploadPage
            receipts={receipts}
            setReceipts={updateReceipts}
            setExpenseItems={setExpenseItems}
            onContinue={() => setPage(Page.Form)}
          />
        );
      case Page.Form:
        return (
          <ExpenseFormPage
            receipts={receipts}
            setReceipts={updateReceipts}
            expenseItems={expenseItems}
            setExpenseItems={setExpenseItems}
            onBack={() => setPage(Page.Upload)}
            onContinue={() => setPage(Page.Preview)}
          />
        );
      case Page.Preview:
        return (
          <PdfPreviewPage
            receipts={receipts}
            expenseItems={expenseItems}
            onBack={() => setPage(Page.Form)}
          />
        );
      default:
        return (
          <FileUploadPage
            receipts={receipts}
            setReceipts={updateReceipts}
            setExpenseItems={setExpenseItems}
            onContinue={() => setPage(Page.Form)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen text-slate-800 dark:text-slate-200">
      <header className="bg-white dark:bg-slate-800 shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            Automated Expense Reimbursement
          </h1>
          <div>
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <span className="text-slate-700 dark:text-slate-300">{userEmail}</span>
                <button
                  onClick={logout}
                  className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => googleLogin()}
                className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              >
                Login with Google
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isAuthenticated ? (
          renderPage()
        ) : (
          <div className="flex justify-center items-center h-96">
            <p className="text-xl text-slate-700 dark:text-slate-300">
              Please log in with your Google account to use the application.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
