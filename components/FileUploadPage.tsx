import React, { useState } from 'react';
import { Receipt, ExpenseItem } from '../types';
import { parseReceipt } from '../services/geminiService';

interface FileUploadPageProps {
  receipts: Receipt[];
  setReceipts: React.Dispatch<React.SetStateAction<Receipt[]>>;
  setExpenseItems: React.Dispatch<React.SetStateAction<ExpenseItem[]>>;
  onContinue: () => void;
}

interface UploadStatus {
  fileName: string;
  status: 'pending' | 'parsing' | 'success' | 'error';
  message?: string;
  receipt?: Receipt;
}

const FileUploadPage: React.FC<FileUploadPageProps> = ({ receipts, setReceipts, setExpenseItems, onContinue }) => {
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setIsProcessing(true);
    const initialStatuses: UploadStatus[] = Array.from(files).map(file => ({
      fileName: file.name,
      status: 'pending',
    }));
    setUploadStatuses(initialStatuses);
    
    const allNewReceipts: Receipt[] = [];
    const allNewExpenseItems: ExpenseItem[] = [];

    await Promise.all(Array.from(files).map(async (file, i) => {
      const updateStatus = (status: 'parsing' | 'success' | 'error', message?: string, receipt?: Receipt) => {
          setUploadStatuses(prev => {
              const newArr = [...prev];
              newArr[i] = {...newArr[i], status, message, receipt};
              return newArr;
          });
      };
      
      updateStatus('parsing');
      
      try {
        const base64 = await fileToBase64(file);
        const receiptId = crypto.randomUUID();
        const newReceipt: Receipt = { id: receiptId, base64, fileName: file.name };
        allNewReceipts.push(newReceipt);

        const parsedData = await parseReceipt(base64);

        const newExpenseItem: ExpenseItem = {
          id: crypto.randomUUID(),
          receiptImageIds: [receiptId],
          date: parsedData.date || new Date().toISOString().split('T')[0],
          category: parsedData.category,
          project: 'Overhead',
          description: parsedData.description,
          amount: parsedData.amount,
        };
        allNewExpenseItems.push(newExpenseItem);
        updateStatus('success', undefined, newReceipt);
      } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        updateStatus('error', message);
      }
    }));
    
    if (allNewReceipts.length > 0) {
      setReceipts(prev => [...prev, ...allNewReceipts]);
    }
    if (allNewExpenseItems.length > 0) {
      setExpenseItems(prev => [...prev, ...allNewExpenseItems]);
    }

    setIsProcessing(false);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = (reader.result as string).split(',')[1];
        resolve(result);
      };
      reader.onerror = error => reject(error);
    });
  };

  const hasReceipts = receipts.length > 0;

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-4 text-slate-700 dark:text-slate-300">Step 1: Upload Receipts</h2>
      <p className="mb-6 text-slate-500 dark:text-slate-400">
        Select one or more receipt images. The app will use AI to automatically extract the details.
      </p>

      <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center">
        <input
          type="file"
          id="file-upload"
          multiple
          accept="image/png, image/jpeg, image/jpg"
          onChange={handleFileChange}
          className="hidden"
          disabled={isProcessing}
        />
        <label
          htmlFor="file-upload"
          className={`cursor-pointer inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white ${isProcessing ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
        >
          {isProcessing ? 'Processing...' : 'Select Receipt Images'}
        </label>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">PNG, JPG up to 10MB</p>
      </div>
      
      {uploadStatuses.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-4">Upload Progress</h3>
          <div className="space-y-4">
            {uploadStatuses.map((item, index) => (
              <div key={index} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-700 rounded-md">
                {item.status === 'success' && item.receipt ? (
                  <img src={`data:image/jpeg;base64,${item.receipt.base64}`} alt={item.fileName} className="w-12 h-12 object-cover rounded-md flex-shrink-0" />
                ) : <div className="w-12 h-12 bg-slate-200 dark:bg-slate-600 rounded-md flex-shrink-0"></div>}
                <div className="flex-grow">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{item.fileName}</p>
                  {item.status === 'error' && <p className="text-xs text-red-500">{item.message}</p>}
                </div>
                <div>
                  {item.status === 'pending' && <span className="text-xs text-slate-500">Pending</span>}
                  {item.status === 'parsing' && <span className="text-xs text-blue-500">Parsing...</span>}
                  {item.status === 'success' && <span className="text-xs text-green-500">Success</span>}
                  {item.status === 'error' && <span className="text-xs text-red-500">Error</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasReceipts && (
         <div className="mt-8">
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-4">Uploaded Receipts</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {receipts.map(receipt => (
                  <div key={receipt.id} className="relative">
                      <img src={`data:image/jpeg;base64,${receipt.base64}`} alt={receipt.fileName} className="w-full h-32 object-cover rounded-lg shadow-md" />
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg truncate">
                          {receipt.fileName}
                      </div>
                  </div>
              ))}
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <button
          onClick={onContinue}
          disabled={!hasReceipts || isProcessing}
          className="px-6 py-2 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default FileUploadPage;