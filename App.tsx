import React, { useState, useEffect } from 'react';
import { Page, Receipt, ExpenseItem, Trip } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import { LOCAL_STORAGE_KEYS } from './constants';
import FileUploadPage from './components/FileUploadPage';
import TripsPage from './components/TripsPage';
import ExpenseFormPage from './components/ExpenseFormPage';
import PdfPreviewPage from './components/PdfPreviewPage';
import { db } from './services/idb';

function App() {
  const [page, setPage] = useState<Page>(Page.Upload);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [expenseItems, setExpenseItems] = useLocalStorage<ExpenseItem[]>(LOCAL_STORAGE_KEYS.EXPENSE_ITEMS, []);
  const [trips, setTrips] = useLocalStorage<Trip[]>(LOCAL_STORAGE_KEYS.TRIPS, []);

  // Load receipts from IndexedDB on initial render
  useEffect(() => {
    db.receipts.toArray().then(setReceipts);
  }, []);

  const updateReceipts = async (newReceipts: Receipt[] | ((prev: Receipt[]) => Receipt[])) => {
    const receiptsToStore = newReceipts instanceof Function ? newReceipts(receipts) : newReceipts;
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
            onContinue={() => setPage(Page.Trips)}
          />
        );
      case Page.Trips:
        return (
          <TripsPage
            trips={trips}
            setTrips={setTrips}
            onBack={() => setPage(Page.Upload)}
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
            trips={trips}
            onBack={() => setPage(Page.Trips)}
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
        return <FileUploadPage receipts={receipts} setReceipts={updateReceipts} setExpenseItems={setExpenseItems} onContinue={() => setPage(Page.Trips)} />;
    }
  };

  return (
    <div className="min-h-screen text-slate-800 dark:text-slate-200">
      <header className="bg-white dark:bg-slate-800 shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            Automated Expense Reimbursement
          </h1>
        </div>
      </header>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;