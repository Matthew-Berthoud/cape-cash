import React, { useState } from "react";
import { ExpenseItem, Receipt, Trip } from "../types";
import { CATEGORIES, PROJECTS, PER_DIEM_CATEGORIES } from "../constants";
import ConfirmModal from "./ConfirmModal";
import ManageReceiptsModal from "./ManageReceiptsModal";

interface ExpenseFormPageProps {
  expenseItems: ExpenseItem[];
  receipts: Receipt[];
  trips: Trip[];
  setExpenseItems: React.Dispatch<React.SetStateAction<ExpenseItem[]>>;
  setReceipts: React.Dispatch<React.SetStateAction<Receipt[]>>;
  onBack: () => void;
  onContinue: () => void;
}

const TrashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z"
      clipRule="evenodd"
    />
  </svg>
);

const SplitIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
    <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h6a2 2 0 002-2H5z" />
  </svg>
);

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const ExpenseFormPage: React.FC<ExpenseFormPageProps> = ({
  expenseItems,
  receipts,
  trips,
  setExpenseItems,
  setReceipts,
  onBack,
  onContinue,
}) => {
  const [itemToDelete, setItemToDelete] = useState<ExpenseItem | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(
    null,
  );

  const handleUpdate = (
    id: string,
    field: keyof ExpenseItem,
    value: string | number,
  ) => {
    setExpenseItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]:
                field === "amount"
                  ? value === ""
                    ? ""
                    : Number(value)
                  : value,
            }
          : item,
      ),
    );
  };

  const checkAndCapAmount = (item: ExpenseItem) => {
    if (
      typeof item.amount !== "number" ||
      !item.tripId ||
      item.tripId === "N/A"
    ) {
      return item.amount;
    }
    const trip = trips.find((t) => t.id === item.tripId);
    if (!trip || trip.project !== item.project || !trip.perDiemRates) {
      return item.amount;
    }

    let maxAmount: number | null = null;
    const itemDate = new Date(item.date);
    const itemMonthName = MONTH_NAMES[itemDate.getMonth()];

    if (PER_DIEM_CATEGORIES.LODGING.includes(item.category)) {
      const rate = trip.perDiemRates.lodgingByMonth.find(
        (r) => r.month === itemMonthName,
      );
      if (rate) maxAmount = rate.value;
    } else if (PER_DIEM_CATEGORIES.MEALS.includes(item.category)) {
      maxAmount = trip.perDiemRates.mie;
    }

    if (maxAmount !== null && item.amount > maxAmount) {
      return maxAmount;
    }
    return item.amount;
  };

  const handleAmountBlur = (item: ExpenseItem) => {
    const cappedAmount = checkAndCapAmount(item);
    if (cappedAmount !== item.amount) {
      handleUpdate(item.id, "amount", cappedAmount);
    }
  };

  const handleConfirmDelete = (itemToDelete: ExpenseItem) => {
    const receiptsToCheck = itemToDelete.receiptImageIds;
    const newExpenseItems = expenseItems.filter(
      (item) => item.id !== itemToDelete.id,
    );
    setExpenseItems(newExpenseItems);

    const orphanedReceiptIds = receiptsToCheck.filter(
      (receiptId) =>
        !newExpenseItems.some((item) =>
          item.receiptImageIds.includes(receiptId),
        ),
    );

    if (orphanedReceiptIds.length > 0) {
      setReceipts((prevReceipts) =>
        prevReceipts.filter((r) => !orphanedReceiptIds.includes(r.id)),
      );
    }

    setItemToDelete(null);
  };

  const handleSplitRow = (sourceItem: ExpenseItem) => {
    const newId = crypto.randomUUID();
    const newExpenseItem: ExpenseItem = {
      id: newId,
      receiptImageIds: [...sourceItem.receiptImageIds],
      date: sourceItem.date,
      category: CATEGORIES[0],
      project: sourceItem.project,
      description: "",
      amount: "",
      tripId: sourceItem.tripId,
    };

    const sourceIndex = expenseItems.findIndex(
      (item) => item.id === sourceItem.id,
    );
    const newExpenseItems = [...expenseItems];
    newExpenseItems.splice(sourceIndex + 1, 0, newExpenseItem);
    setExpenseItems(newExpenseItems);
  };

  const handleAddRow = () => {
    const newId = crypto.randomUUID();
    const newExpenseItem: ExpenseItem = {
      id: newId,
      receiptImageIds: [],
      date: new Date().toISOString().split("T")[0],
      category: CATEGORIES[0],
      project: "Overhead",
      description: "",
      amount: "",
      tripId: "N/A",
    };
    setExpenseItems((prev) => [...prev, newExpenseItem]);
  };

  const handleSaveReceipts = (expenseId: string, newReceiptIds: string[]) => {
    setExpenseItems((prev) =>
      prev.map((item) =>
        item.id === expenseId
          ? { ...item, receiptImageIds: newReceiptIds }
          : item,
      ),
    );
    setEditingExpense(null);
  };

  const showTripColumn = trips.length > 0;

  return (
    <>
      <ConfirmModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => itemToDelete && handleConfirmDelete(itemToDelete)}
        title="Delete Expense"
      >
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Are you sure you want to delete this expense? Associated receipts will
          be deleted if no other expenses are linked to them.
        </p>
      </ConfirmModal>

      {editingExpense && (
        <ManageReceiptsModal
          isOpen={!!editingExpense}
          onClose={() => setEditingExpense(null)}
          onSave={(newReceiptIds) =>
            handleSaveReceipts(editingExpense.id, newReceiptIds)
          }
          allReceipts={receipts}
          selectedReceiptIds={editingExpense.receiptImageIds}
        />
      )}

      <div className="max-w-7xl mx-auto bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-6 text-slate-700 dark:text-slate-300">
          Step 3: Review and Edit Expenses
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider"
                >
                  Receipt
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider"
                >
                  Date
                </th>
                {showTripColumn && (
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider"
                  >
                    Trip
                  </th>
                )}
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider"
                >
                  Category
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider"
                >
                  Customer/Project
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider"
                >
                  Description
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider"
                >
                  Amount
                </th>
                <th scope="col" className="relative px-3 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {expenseItems.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="flex -space-x-4">
                        {item.receiptImageIds
                          .map((id) => receipts.find((r) => r.id === id))
                          .filter(Boolean)
                          .slice(0, 3)
                          .map((receipt) => (
                            <img
                              key={receipt!.id}
                              src={`data:image/jpeg;base64,${receipt!.base64}`}
                              alt="receipt"
                              className="h-10 w-10 rounded-md object-cover ring-2 ring-white dark:ring-slate-800"
                            />
                          ))}
                      </div>
                      <button
                        onClick={() => setEditingExpense(item)}
                        className="flex items-center justify-center h-10 w-10 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M10 3a1 1 0 011 1v4h4a1 1 0 110 2h-4v4a1 1 0 11-2 0v-4H5a1 1 0 110-2h4V4a1 1 0 011-1z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <input
                      type="date"
                      value={item.date}
                      onChange={(e) =>
                        handleUpdate(item.id, "date", e.target.value)
                      }
                      className="w-40 p-1 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600"
                    />
                  </td>
                  {showTripColumn && (
                    <td className="px-3 py-2 whitespace-nowrap">
                      <select
                        value={item.tripId || "N/A"}
                        onChange={(e) =>
                          handleUpdate(item.id, "tripId", e.target.value)
                        }
                        className="w-48 p-1 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600"
                      >
                        <option value="N/A">N/A</option>
                        {trips.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.purpose}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <select
                      value={item.category}
                      onChange={(e) =>
                        handleUpdate(item.id, "category", e.target.value)
                      }
                      className="w-48 p-1 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <select
                      value={item.project}
                      onChange={(e) =>
                        handleUpdate(item.id, "project", e.target.value)
                      }
                      className="w-48 p-1 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600"
                    >
                      {PROJECTS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        handleUpdate(item.id, "description", e.target.value)
                      }
                      className="w-full min-w-[10rem] p-1 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600"
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <input
                      type="number"
                      value={item.amount}
                      onChange={(e) =>
                        handleUpdate(item.id, "amount", e.target.value)
                      }
                      onBlur={() => handleAmountBlur(item)}
                      className="w-32 p-1 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600"
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleSplitRow(item)}
                        title="Split Item"
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <SplitIcon />
                      </button>
                      <button
                        onClick={() => setItemToDelete(item)}
                        title="Delete Item"
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <button
            onClick={handleAddRow}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600"
          >
            Add Row
          </button>
        </div>

        <div className="mt-8 flex justify-between">
          <button
            onClick={onBack}
            className="px-6 py-2 border border-slate-300 dark:border-slate-600 text-base font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600"
          >
            Back
          </button>
          <button
            onClick={onContinue}
            className="px-6 py-2 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Continue
          </button>
        </div>
      </div>
    </>
  );
};

export default ExpenseFormPage;
