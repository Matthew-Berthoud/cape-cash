import React, { useState, useEffect, useCallback } from "react";
import { ExpenseItem, Receipt } from "../types";

declare global {
  interface Window {
    jspdf: any;
  }
}

interface PdfPreviewPageProps {
  expenseItems: ExpenseItem[];
  receipts: Receipt[];
  onBack: () => void;
}

const generatePdfDoc = async (
  expenseItems: ExpenseItem[],
  receipts: Receipt[],
) => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const tableColumn = [
    "Date",
    "Category",
    "Customer/Project",
    "Description",
    "Amount",
  ];
  const tableRows: (string | number)[][] = [];

  let totalAmount = 0;
  expenseItems.forEach((item) => {
    const amount = typeof item.amount === "number" ? item.amount : 0;
    const expenseData = [
      item.date,
      item.category,
      item.project,
      item.description,
      amount.toFixed(2),
    ];
    tableRows.push(expenseData);
    totalAmount += amount;
  });

  // Add total row
  tableRows.push(["", "", "", "Total", totalAmount.toFixed(2)]);

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 20,
    didDrawPage: () => {
      doc.text("Expense Report", 14, 15);
    },
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    footStyles: { fillColor: [211, 211, 211], textColor: 0, fontStyle: "bold" },
  });

  const allReceiptIds = new Set(
    expenseItems.flatMap((item) => item.receiptImageIds),
  );
  const uniqueReceipts = receipts.filter((r) => allReceiptIds.has(r.id));

  for (const receipt of uniqueReceipts) {
    const imgData = `data:image/jpeg;base64,${receipt.base64}`;

    const loadImage = (src: string): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
      });

    try {
      await loadImage(imgData); // wait for image to be valid
      doc.addPage();
      const imgProps = doc.getImageProperties(imgData);
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const usableWidth = pdfWidth - margin * 2;
      const usableHeight = pdfHeight - margin * 2;

      const ratio = Math.min(
        usableWidth / imgProps.width,
        usableHeight / imgProps.height,
      );
      const imgWidth = imgProps.width * ratio;
      const imgHeight = imgProps.height * ratio;

      const x = (pdfWidth - imgWidth) / 2;
      const y = (pdfHeight - imgHeight) / 2;

      doc.addImage(imgData, "JPEG", x, y, imgWidth, imgHeight);
    } catch (error) {
      console.error(
        "Could not add image to PDF, it might be corrupted.",
        error,
      );
      doc.addPage();
      doc.text(`Error loading receipt image: ${receipt.fileName}`, 15, 15);
    }
  }

  return doc;
};

const PdfPreviewPage: React.FC<PdfPreviewPageProps> = ({
  expenseItems,
  receipts,
  onBack,
}) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let objectUrl: string | null = null; // Store URL for cleanup

    const generatePreview = async () => {
      if (expenseItems.length === 0) {
        setPdfUrl(null);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const doc = await generatePdfDoc(expenseItems, receipts);

        // 1. Output as a 'blob' instead of 'datauristring'
        const blob = doc.output("blob");

        // 2. Create an object URL from the blob
        objectUrl = URL.createObjectURL(blob);

        // 3. Set this URL in state
        setPdfUrl(objectUrl);
      } catch (error) {
        console.error("Failed to generate PDF preview:", error);
        setPdfUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    generatePreview();

    // 4. Cleanup function: Revoke the object URL
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [expenseItems, receipts]); // Re-run when items or receipts change

  const handleDownload = async () => {
    if (!pdfUrl) return;
    try {
      const doc = await generatePdfDoc(expenseItems, receipts);
      doc.save("expense-report.pdf");
    } catch (error) {
      console.error("Failed to generate PDF for download:", error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-6 text-slate-700 dark:text-slate-300">
        Step 3: Preview & Download
      </h2>

      <div className="bg-slate-100 dark:bg-slate-900 rounded-md p-4 min-h-[70vh]">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-slate-500 dark:text-slate-400">
              Generating PDF...
            </p>
          </div>
        ) : pdfUrl ? (
          <iframe
            src={pdfUrl}
            title="Expense Report"
            className="w-full h-[70vh] border-0 rounded-md"
          ></iframe>
        ) : (
          <div className="flex justify-center items-center h-full">
            <p className="text-slate-500 dark:text-slate-400">
              No expenses to display.
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-slate-300 dark:border-slate-600 text-base font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600"
        >
          Back
        </button>
        <button
          onClick={handleDownload}
          disabled={!pdfUrl || isLoading}
          className="px-6 py-2 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Download PDF
        </button>
      </div>
    </div>
  );
};

export default PdfPreviewPage;

