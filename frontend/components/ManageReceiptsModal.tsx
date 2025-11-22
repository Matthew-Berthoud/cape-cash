import { useState, useEffect } from "react";
import { Receipt } from "../types";

interface ManageReceiptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedIds: string[]) => void;
  allReceipts: Receipt[];
  selectedReceiptIds: string[];
}

const ManageReceiptsModal: React.FC<ManageReceiptsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  allReceipts,
  selectedReceiptIds,
}) => {
  const [currentSelection, setCurrentSelection] = useState<Set<string>>(
    new Set(selectedReceiptIds),
  );

  useEffect(() => {
    setCurrentSelection(new Set(selectedReceiptIds));
  }, [selectedReceiptIds, isOpen]);

  if (!isOpen) return null;

  const handleToggle = (receiptId: string) => {
    setCurrentSelection((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(receiptId)) {
        newSelection.delete(receiptId);
      } else {
        newSelection.add(receiptId);
      }
      return newSelection;
    });
  };

  const handleSave = () => {
    onSave(Array.from(currentSelection));
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
      aria-modal="true"
      role="dialog"
    >
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-medium leading-6 text-slate-900 dark:text-slate-100">
            Manage Associated Receipts
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Select the receipts for this expense item.
          </p>
        </div>

        <div className="p-6 overflow-y-auto">
          {allReceipts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {allReceipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="relative cursor-pointer"
                  onClick={() => handleToggle(receipt.id)}
                >
                  <img
                    src={`data:image/jpeg;base64,${receipt.base64}`}
                    alt={receipt.fileName}
                    className={`w-full h-32 object-cover rounded-lg transition-all ${currentSelection.has(receipt.id) ? "ring-4 ring-indigo-500" : "ring-2 ring-transparent"}`}
                  />
                  <div
                    className="absolute top-2 right-2 bg-white dark:bg-slate-800 rounded-full h-6 w-6 flex items-center justify-center cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(receipt.id);
                    }}
                  >
                    <input
                      type="checkbox"
                      readOnly
                      checked={currentSelection.has(receipt.id)}
                      className="h-4 w-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 pointer-events-none"
                    />
                  </div>
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 rounded-b-lg truncate"
                    title={receipt.fileName}
                  >
                    {receipt.fileName}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-500 dark:text-slate-400">
              No receipts have been uploaded yet.
            </p>
          )}
        </div>

        <div className="bg-slate-50 dark:bg-slate-700 px-6 py-4 flex justify-end space-x-3 rounded-b-lg">
          <button
            type="button"
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-600"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageReceiptsModal;
