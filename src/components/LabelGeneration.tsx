import React, { useState, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  Eye,
  Printer,
  CheckSquare,
  Square,
  Trash2,
  AlertCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import type { LabelData, ProductData } from "../core/interface";
import NONTPRLabel from "./NONTPRLabel";
import TPRLabel from "./TPRLabel";
import {
  renderNONTPRLabelAsHTML,
  renderTPRLabelAsHTML,
  renderPriceLabelAsHTML,
} from "../core/helper";
import PriceLabel from "./PriceLabel";

const LabelGeneration: React.FC = () => {
  // Extended local label type so we can store the explicit label type
  type ExtendedLabelData = LabelData & {
    labelType: "NON_TPR" | "TPR" | "PRICE";
  };

  const [labels, setLabels] = useState<ExtendedLabelData[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [showLabelTypeSelection, setShowLabelTypeSelection] = useState(true);
  const [selectedLabelType, setSelectedLabelType] = useState<
    "NON_TPR" | "TPR" | "PRICE" | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Required columns for each label type
  const REQUIRED_COLUMNS = {
    NON_TPR: [
      "ITEM_CODE",
      "DESCRIPTION", // or 'Item Name'
      "UPC", // or 'Barcode' or 'Code'
      "PACK",
      "SIZE",
      "BASE_RETAIL", // or 'Price' or 'RETAIL'
      "PQ65", // Product Quantity
    ],
    TPR: [
      "ITEM_CODE",
      "DESCRIPTION", // or 'Item Name'
      "UPC", // or 'Barcode' or 'Code'
      "PACK",
      "SIZE",
      "BASE_RETAIL", // or 'Price' (Non-TPR Price)
      "TPR_RETAIL", // TPR Price
      "DEAL_END_DATE1", // Expiry Date
    ],
    PRICE: [
      "ITEM_CODE",
      "DESCRIPTION", // or 'Item Name'
      "UPC", // or 'Barcode' or 'Code'
    ],
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedLabelType) {
      alert("Please select a label type first.");
      return;
    }

    setIsLoading(true);
    setFileName(file.name);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as ProductData[];

      // Validate columns based on pre-selected label type
      const missingColumns = validateColumns(
        jsonData,
        selectedLabelType as "NON_TPR" | "TPR" | "PRICE"
      );

      if (missingColumns.length > 0) {
        const columnList = missingColumns.join(", ");
        alert(
          `Missing required columns for ${selectedLabelType} labels: ${columnList}\n\nPlease ensure your Excel file contains all required columns.`
        );
        setIsLoading(false);
        return;
      }

      // If validation passes, generate labels directly
      const labelData: ExtendedLabelData[] = jsonData.map((item, index) => {
        const isTpr = selectedLabelType === "TPR";
        const labelType =
          selectedLabelType === "PRICE" ? "PRICE" : isTpr ? "TPR" : "NON_TPR";
        return {
          id: `label-${index}-${Math.random().toString(36).slice(2, 8)}`,
          description: getDescription(item),
          price: getPrice(item, isTpr), // for PRICE, will use BASE_RETAIL when present, else $0.00
          originalPrice: isTpr ? getOriginalPrice(item) : undefined,
          upc: getUPC(item),
          isTpr,
          selected: false,
          originalDetails: item,
          labelType,
        } as ExtendedLabelData;
      });

      setLabels(labelData);
      setSelectedLabels(new Set()); // Reset selection
      setShowLabelTypeSelection(false);
    } catch (error) {
      console.error("Error reading file:", error);
      alert("Error reading Excel file. Please check the file format.");
    } finally {
      setIsLoading(false);
    }
  };

  const validateColumns = (
    data: ProductData[],
    labelType: "NON_TPR" | "TPR" | "PRICE"
  ): string[] => {
    if (data.length === 0) return [];

    const sampleRow = data[0];
    const availableColumns = Object.keys(sampleRow);
    const requiredColumns = REQUIRED_COLUMNS[labelType];
    const missingColumns: string[] = [];

    requiredColumns.forEach((requiredCol) => {
      let found = false;

      // Check for exact match first
      if (availableColumns.includes(requiredCol)) {
        found = true;
      } else {
        // Check for alternative column names
        switch (requiredCol) {
          case "DESCRIPTION":
            if (availableColumns.includes("Item Name")) found = true;
            break;
          case "UPC":
            if (
              availableColumns.includes("Barcode") ||
              availableColumns.includes("Code")
            )
              found = true;
            break;
          case "BASE_RETAIL":
            if (
              availableColumns.includes("Price") ||
              availableColumns.includes("RETAIL")
            )
              found = true;
            break;
        }
      }

      if (!found) {
        missingColumns.push(requiredCol);
      }
    });

    return missingColumns;
  };

  const generateLabels = (labelType: "NON_TPR" | "TPR" | "PRICE") => {
    setSelectedLabelType(labelType);
    setShowLabelTypeSelection(false);
    // The actual label generation now happens in handleFileUpload after validation
  };

  const getDescription = (item: ProductData): string => {
    return item.DESCRIPTION || item["Item Name"] || "Product Description";
  };

  const getPrice = (item: ProductData, isTpr: boolean): string => {
    if (isTpr && item.TPR_RETAIL) {
      return `$${Number(item.TPR_RETAIL).toFixed(2)}`;
    }
    const price = item.BASE_RETAIL || item.Price || item.RETAIL;
    return price ? `$${Number(price).toFixed(2)}` : "$0.00";
  };

  const getOriginalPrice = (item: ProductData): string => {
    const price = item.BASE_RETAIL || item.Price;
    return price ? `$${Number(price).toFixed(2)}` : "$0.00";
  };

  const getUPC = (item: ProductData): string => {
    return item.UPC || item.Barcode || item.Code || "000000000000";
  };

  const toggleLabelSelection = (labelId: string) => {
    const newSelected = new Set(selectedLabels);
    if (newSelected.has(labelId)) {
      newSelected.delete(labelId);
    } else {
      newSelected.add(labelId);
    }
    setSelectedLabels(newSelected);
  };

  const selectAllLabels = () => {
    if (selectedLabels.size === labels.length) {
      setSelectedLabels(new Set());
    } else {
      setSelectedLabels(new Set(labels.map((l) => l.id)));
    }
  };

  const clearData = () => {
    setLabels([]);
    setSelectedLabels(new Set());
    setFileName("");
    setShowLabelTypeSelection(true);
    setSelectedLabelType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const createPrintableHTML = (labelsToRender: ExtendedLabelData[]): string => `
<!DOCTYPE html>
<html>
<head>
  <title>Labels - ${new Date().toLocaleDateString()}</title>
  <style>
    /* 1) Full-bleed, no printer margins */
    @page { size: letter landscape; margin: 0; }
    html, body {
      margin: 0; padding: 0;
      width: 100%; height: 100%;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-family: Arial, sans-serif;
    }

    /* 2) Wrapping flex container */
    .labels-container {
      display: flex;
      flex-wrap: wrap;
      align-content: flex-start;
      gap: 0.05in;      /* tiny gap for cut-lines */
      padding: 0;       /* no extra padding */
    }

    /* 3) Prevent any label from splitting across pages */
    .label {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    /* 4) Make each inner label HTML fill its flex item */
    .label > div {
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <div class="labels-container">
    ${labelsToRender
      .map((label) => {
        let html = "";
        switch (label.labelType) {
          case "TPR":
            html = renderTPRLabelAsHTML(label);
            break;
          case "PRICE":
            html = renderPriceLabelAsHTML(label);
            break;
          case "NON_TPR":
            html = renderNONTPRLabelAsHTML(label);
            break;
        }
        return `<div class="label">${html}</div>`;
      })
      .join("")}
  </div>
</body>
</html>
`;

  const printLabels = (labelsToPrint: ExtendedLabelData[]) => {
    if (labelsToPrint.length === 0) {
      alert("No labels available to print.");
      return;
    }

    const htmlContent = createPrintableHTML(labelsToPrint);

    const blob = new Blob([htmlContent], { type: "text/html" });

    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, "_blank");
    if (printWindow) {
      printWindow.focus();
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.onafterprint = () => {
            printWindow.close();
            URL.revokeObjectURL(url);
          };
        }, 500);
      };
    }
  };

  const printSelected = () => {
    const selectedLabelData = labels.filter((label) =>
      selectedLabels.has(label.id)
    );
    if (selectedLabelData.length === 0) {
      alert("Please select at least one label to print.");
      return;
    }
    printLabels(selectedLabelData);
  };

  const printAll = () => {
    printLabels(labels);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Label Generator
              </h1>
              <p className="text-gray-600 mt-1">
                Generate professional price labels from Excel data
              </p>
            </div>
            {(labels.length > 0 || selectedLabelType) && (
              <button
                onClick={clearData}
                className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Clear Data
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Label Type Selection - Show First */}
        {showLabelTypeSelection && !selectedLabelType && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <div className="text-center">
              <AlertCircle className="mx-auto h-16 w-16 text-orange-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Select Label Type
              </h2>
              <p className="text-gray-600 mb-6">
                Choose which type of labels you want to generate before
                uploading your file.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {/* NON-TPR Option */}
                <div className="border border-gray-200 rounded-lg p-6 hover:border-green-400 hover:shadow-lg transition-all">
                  <div className="text-center mb-4">
                    <div className="bg-green-100 text-green-800 inline-flex px-3 py-1 text-sm font-semibold rounded-full mb-3">
                      NON-TPR LABELS
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      Regular Price Labels
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Generate standard price labels for regular products
                    </p>
                  </div>

                  <div className="text-left mb-6">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Required Columns:
                    </h4>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• ITEM_CODE</li>
                      <li>• DESCRIPTION (or Item Name)</li>
                      <li>• UPC (or Barcode/Code)</li>
                      <li>• PACK</li>
                      <li>• SIZE</li>
                      <li>• BASE_RETAIL (or Price/RETAIL)</li>
                      <li>• PQ65 (Product Quantity)</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => generateLabels("NON_TPR")}
                    className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Select NON-TPR Labels
                  </button>
                </div>

                {/* TPR Option */}
                <div className="border border-gray-200 rounded-lg p-6 hover:border-red-400 hover:shadow-lg transition-all">
                  <div className="text-center mb-4">
                    <div className="bg-red-100 text-red-800 inline-flex px-3 py-1 text-sm font-semibold rounded-full mb-3">
                      TPR LABELS
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      Temporary Price Reduction
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Generate sale/promotional price labels with original
                      pricing
                    </p>
                  </div>

                  <div className="text-left mb-6">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Required Columns:
                    </h4>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• ITEM_CODE</li>
                      <li>• DESCRIPTION (or Item Name)</li>
                      <li>• UPC (or Barcode/Code)</li>
                      <li>• PACK</li>
                      <li>• SIZE</li>
                      <li>• BASE_RETAIL (Non-TPR Price)</li>
                      <li>• TPR_RETAIL (TPR Price)</li>
                      <li>• DEAL_END_DATE1 (Expiry Date)</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => generateLabels("TPR")}
                    className="w-full bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Select TPR Labels
                  </button>
                </div>

                {/* PRICE Option */}
                <div className="border border-gray-200 rounded-lg p-6 hover:border-yellow-400 hover:shadow-lg transition-all">
                  <div className="text-center mb-4">
                    <div className="bg-yellow-100 text-yellow-800 inline-flex px-3 py-1 text-sm font-semibold rounded-full mb-3">
                      PRICE LABELS
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      Price-only Label
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Minimal label (ITEM_CODE, DESCRIPTION, UPC). Visual is
                      same as NON-TPR.
                    </p>
                  </div>

                  <div className="text-left mb-6">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Required Columns:
                    </h4>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• ITEM_CODE</li>
                      <li>• DESCRIPTION (or Item Name)</li>
                      <li>• UPC (or Barcode/Code)</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => generateLabels("PRICE")}
                    className="w-full bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                  >
                    Select PRICE Labels
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload Section - Show After Label Type Selection */}
        {selectedLabelType && labels.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <div className="text-center">
              <FileSpreadsheet className="mx-auto h-16 w-16 text-blue-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Upload Excel File
              </h2>
              <p className="text-gray-600 mb-2">
                Upload your product data file to generate{" "}
                <span className="font-semibold text-blue-600">
                  {selectedLabelType}
                </span>{" "}
                labels
              </p>
              <p className="text-sm text-gray-500 mb-6">
                The system will validate that all required columns are present
                in your file
              </p>

              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-12 hover:border-blue-400 transition-colors cursor-pointer bg-gray-50 hover:bg-gray-100"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg text-gray-600 mb-2">
                  {fileName || "Click to upload or drag and drop"}
                </p>
                <p className="text-sm text-gray-500">
                  Excel files (.xlsx, .xls) • {selectedLabelType} format
                  required
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />

              {isLoading && (
                <div className="mt-6 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600 text-lg">
                    Processing and validating file...
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        {labels.length > 0 && (
          <div className="space-y-6">
            {/* Stats and Controls */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="grid grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {labels.length}
                    </div>
                    <div className="text-sm text-gray-600">Total Products</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600">
                      {labels.filter((l) => l.labelType === "TPR").length}
                    </div>
                    <div className="text-sm text-gray-600">TPR Products</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {selectedLabels.size}
                    </div>
                    <div className="text-sm text-gray-600">Selected</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {Math.ceil(selectedLabels.size / 25)}
                    </div>
                    <div className="text-sm text-gray-600">Pages Needed</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={selectAllLabels}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {selectedLabels.size === labels.length ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    {selectedLabels.size === labels.length
                      ? "Deselect All"
                      : "Select All"}
                  </button>

                  <button
                    onClick={() => setPreviewMode(!previewMode)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      previewMode
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <Eye className="h-4 w-4" />
                    {previewMode ? "List View" : "Preview Mode"}
                  </button>
                </div>
              </div>

              {/* Download and Print Controls */}
              <div className="flex gap-4 justify-center border-t pt-6">
                <button
                  onClick={printSelected}
                  disabled={selectedLabels.size === 0}
                  className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <Printer className="h-5 w-5" />
                  Print Selected ({selectedLabels.size})
                </button>

                <button
                  onClick={printAll}
                  className="flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Printer className="h-5 w-5" />
                  Print All ({labels.length})
                </button>
              </div>
            </div>

            {/* Labels Display */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              {previewMode ? (
                <div
                  className={
                    labels[0]?.labelType === "TPR"
                      ? "grid grid-cols-5 gap-1"
                      : "grid grid-cols-3 gap-1"
                  }
                >
                  {labels.map((label, index) => (
                    <div
                      key={label.id}
                      className={`relative border-1 p-0 cursor-pointer transition-all ${
                        selectedLabels.has(label.id)
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                          : "border-gray-200 hover:border-gray-300 hover:shadow-md"
                      } ${
                        label.labelType === "TPR"
                          ? "bg-gradient-to-br from-red-50 to-red-100"
                          : label.labelType === "PRICE"
                          ? "bg-yellow-50"
                          : "bg-gray-50"
                      }`}
                      onClick={() => toggleLabelSelection(label.id)}
                    >
                      <div className="h-full flex flex-col">
                        {label.labelType === "TPR" && (
                          <div className="absolute top-1 left-1 bg-yellow-400 text-black text-xs px-1 py-0.5 rounded font-bold">
                            TPR
                          </div>
                        )}
                        {label.originalPrice && label.labelType === "TPR" && (
                          <div className="absolute top-1 right-1 text-xs line-through text-gray-600 bg-white px-1 rounded">
                            {label.originalPrice}
                          </div>
                        )}

                        <div
                          className={
                            label.labelType === "TPR"
                              ? "grid grid-cols-5 gap-1"
                              : "grid grid-cols-3 gap-1"
                          }
                        >
                          {label.labelType === "NON_TPR" && (
                            // NON_TPR visual used for both NON_TPR and PRICE labels (as requested)
                            <NONTPRLabel
                              key={index}
                              itemCode={
                                label.originalDetails?.ITEM_CODE || "null"
                              }
                              baseRetail={
                                Number(label.originalDetails?.BASE_RETAIL) ||
                                0.0
                              }
                              description={label.description || "null"}
                              upc={label.upc}
                              pack={label.originalDetails?.PACK || "null"}
                              size={label.originalDetails?.SIZE || "null"}
                              pq65={label.originalDetails?.PQ65 || "null"}
                              recordStatusDate="2025-06-29"
                            />
                          )}
                          {label.labelType === "TPR" && (
                            <TPRLabel
                              key={index}
                              itemCode={
                                label.originalDetails?.ITEM_CODE || "null"
                              }
                              description={label.description || "null"}
                              size={label.originalDetails?.SIZE || "null"}
                              pack={label.originalDetails?.PACK || "null"}
                              upc={label.upc}
                              baseRetail={
                                Number(label.originalDetails?.BASE_RETAIL) || 0
                              }
                              tprRetail={
                                Number(label.originalDetails?.TPR_RETAIL) || 0
                              }
                              expires={
                                label.originalDetails?.DEAL_END_DATE1 || "null"
                              }
                              recordStatusDate="06/29/2025"
                            />
                          )}
                          {
                            // PRICE visual used for both NON_TPR and PRICE labels (as requested)
                            label.labelType === "PRICE" && (
                              <PriceLabel
                                key={index}
                                itemCode={
                                  label.originalDetails?.ITEM_CODE || "null"
                                }
                                description={label.description || "null"}
                                upc={label.upc}
                                pack={label.originalDetails?.PACK || "null"}
                                size={label.originalDetails?.SIZE || "null"}
                                baseRetail={
                                  Number(label.originalDetails?.BASE_RETAIL) ||
                                  0.0
                                }
                              />
                            )
                          }
                        </div>
                      </div>

                      {selectedLabels.has(label.id) && (
                        <CheckSquare className="absolute -top-2 -right-2 h-6 w-6 text-blue-600 bg-white rounded-full shadow-lg" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                // The table mode remains unchanged
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-6 py-3 text-left">
                            <button
                              onClick={selectAllLabels}
                              className="flex items-center gap-2 hover:bg-gray-100 p-1 rounded"
                            >
                              {selectedLabels.size === labels.length ? (
                                <CheckSquare className="h-5 w-5 text-blue-600" />
                              ) : (
                                <Square className="h-5 w-5" />
                              )}
                            </button>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            UPC
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {labels.map((label) => (
                          <tr
                            key={label.id}
                            className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                              selectedLabels.has(label.id) ? "bg-blue-50" : ""
                            }`}
                            onClick={() => toggleLabelSelection(label.id)}
                          >
                            <td className="px-6 py-4">
                              {selectedLabels.has(label.id) ? (
                                <CheckSquare className="h-5 w-5 text-blue-600" />
                              ) : (
                                <Square className="h-5 w-5 text-gray-400" />
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                              {label.description}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-lg text-green-600">
                                  {label.price}
                                </span>
                                {label.originalPrice && (
                                  <span className="text-xs text-gray-500 line-through">
                                    {label.originalPrice}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                              {label.upc}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                                  label.labelType === "TPR"
                                    ? "bg-red-100 text-red-800"
                                    : label.labelType === "PRICE"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {label.labelType === "TPR"
                                  ? "TPR"
                                  : label.labelType === "PRICE"
                                  ? "PRICE"
                                  : "Regular"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabelGeneration;
