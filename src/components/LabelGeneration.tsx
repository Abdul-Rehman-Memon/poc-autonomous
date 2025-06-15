// const LabelGeneration = () => {
//   return <div>LabelGeneration</div>;
// };

// export default LabelGeneration;
import React, { useState, useRef } from "react";
import {
  Upload,
  Download,
  FileSpreadsheet,
  Eye,
  Printer,
  CheckSquare,
  Square,
  Trash2,
} from "lucide-react";
import * as XLSX from "xlsx";
import type { LabelData, ProductData } from "../core/interface";

const LabelGeneration: React.FC = () => {
  const [excelData, setExcelData] = useState<ProductData[]>([]);
  const [labels, setLabels] = useState<LabelData[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as ProductData[];

      setExcelData(jsonData);

      // Convert to label format
      const labelData: LabelData[] = jsonData.map((item, index) => {
        const isTpr = detectTprProduct(item);
        return {
          id: `label-${index}`,
          description: getDescription(item),
          price: getPrice(item, isTpr),
          originalPrice: isTpr ? getOriginalPrice(item) : undefined,
          upc: getUPC(item),
          isTpr,
          selected: false,
        };
      });

      setLabels(labelData);
      setSelectedLabels(new Set()); // Reset selection
    } catch (error) {
      console.error("Error reading file:", error);
      alert("Error reading Excel file. Please check the file format.");
    } finally {
      setIsLoading(false);
    }
  };

  const detectTprProduct = (item: ProductData): boolean => {
    return !!(
      item.TPR_RETAIL ||
      item.TPR_INDICATOR === "Y" ||
      item.TPR_INDICATOR === "1"
    );
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
    setExcelData([]);
    setLabels([]);
    setSelectedLabels(new Set());
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const createPrintableHTML = (labelsToGenerate: LabelData[]): string => {
    const labelPages = [];
    for (let i = 0; i < labelsToGenerate.length; i += 25) {
      labelPages.push(labelsToGenerate.slice(i, i + 25));
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Labels - ${new Date().toLocaleDateString()}</title>
        <style>
          * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
          }
          
          body { 
            font-family: 'Arial', sans-serif; 
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .page { 
            width: 8.5in; 
            height: 11in; 
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            grid-template-rows: repeat(5, 1fr);
            gap: 0.05in;
            padding: 0.25in;
            page-break-after: always;
            page-break-inside: avoid;
          }
          
          .page:last-child {
            page-break-after: auto;
          }
          
          .label { 
            width: 100%;
            height: 100%;
            border: 2px solid #000; 
            display: flex;
            flex-direction: column;
            position: relative;
            background: white;
            overflow: hidden;
          }
          
          .label-tpr {
            background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
            color: white;
            border-color: #dc2626;
          }
          
          .label-regular {
            background: #f8fafc;
            color: #1f2937;
            border-color: #374151;
          }
          
          .tpr-badge {
            position: absolute;
            top: 3px;
            left: 3px;
            background: #fbbf24;
            color: #1f2937;
            padding: 2px 6px;
            font-size: 10px;
            font-weight: bold;
            border-radius: 3px;
            z-index: 2;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          }
          
          .original-price {
            position: absolute;
            top: 3px;
            right: 3px;
            font-size: 12px;
            text-decoration: line-through;
            background: rgba(255,255,255,0.95);
            color: #1f2937;
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: bold;
            z-index: 2;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          }
          
          .price-section {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            font-weight: bold;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
            padding: 8px;
          }
          
          .description {
            padding: 4px 6px;
            font-size: 11px;
            text-align: center;
            background: rgba(255,255,255,0.95);
            color: #1f2937;
            border-top: 1px solid rgba(0,0,0,0.1);
            font-weight: 500;
            line-height: 1.2;
            min-height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .upc {
            padding: 2px 6px;
            font-size: 9px;
            text-align: center;
            background: rgba(255,255,255,0.9);
            color: #4b5563;
            font-family: 'Courier New', monospace;
            border-top: 1px solid rgba(0,0,0,0.1);
            letter-spacing: 0.5px;
          }
          
          @media print {
            body { margin: 0; }
            .page { margin: 0; }
            @page { 
              margin: 0; 
              size: letter;
            }
          }
          
          @media screen {
            body { 
              background: #f3f4f6; 
              padding: 20px;
            }
            .page {
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              margin-bottom: 20px;
              background: white;
            }
          }
        </style>
      </head>
      <body>
        ${labelPages
          .map(
            (page, pageIndex) => `
          <div class="page">
            ${page
              .map(
                (label) => `
              <div class="label ${label.isTpr ? "label-tpr" : "label-regular"}">
                ${label.isTpr ? '<div class="tpr-badge">BUY 1 GET 1</div>' : ""}
                ${
                  label.originalPrice && label.isTpr
                    ? `<div class="original-price">${label.originalPrice}</div>`
                    : ""
                }
                <div class="price-section">${label.price}</div>
                <div class="description">${
                  label.description.length > 35
                    ? label.description.substring(0, 35) + "..."
                    : label.description
                }</div>
                <div class="upc">${label.upc}</div>
              </div>
            `
              )
              .join("")}
            ${Array(25 - page.length)
              .fill(0)
              .map(
                () =>
                  '<div class="label" style="border: 1px dashed #ccc; background: #f9f9f9;"></div>'
              )
              .join("")}
          </div>
        `
          )
          .join("")}
        
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
      </html>
    `;
  };

  const downloadLabels = (labelsToGenerate: LabelData[], filename: string) => {
    const htmlContent = createPrintableHTML(labelsToGenerate);
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split("T")[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadSelected = () => {
    const selectedLabelData = labels.filter((label) =>
      selectedLabels.has(label.id)
    );
    if (selectedLabelData.length === 0) {
      alert("Please select at least one label to download.");
      return;
    }
    downloadLabels(
      selectedLabelData,
      `labels_selected_${selectedLabelData.length}`
    );
  };

  const downloadAll = () => {
    if (labels.length === 0) {
      alert("No labels available to download.");
      return;
    }
    downloadLabels(labels, `labels_all_${labels.length}`);
  };

  const previewLabels = (labelsToPreview: LabelData[]) => {
    const htmlContent = createPrintableHTML(labelsToPreview);
    const previewWindow = window.open("", "_blank");
    if (previewWindow) {
      previewWindow.document.write(htmlContent);
      previewWindow.document.close();
    }
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
            {labels.length > 0 && (
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
        {/* Upload Section */}
        {labels.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <div className="text-center">
              <FileSpreadsheet className="mx-auto h-16 w-16 text-blue-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Upload Excel File
              </h2>
              <p className="text-gray-600 mb-6">
                Upload your product data file to generate labels
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
                  Excel files (.xlsx, .xls) • TPR and Non-TPR formats supported
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
                    Processing file...
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
                      {labels.filter((l) => l.isTpr).length}
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

              {/* Download Controls */}
              <div className="flex gap-4 justify-center border-t pt-6">
                <button
                  onClick={downloadSelected}
                  disabled={selectedLabels.size === 0}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="h-5 w-5" />
                  Download Selected ({selectedLabels.size})
                </button>

                <button
                  onClick={downloadAll}
                  className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="h-5 w-5" />
                  Download All ({labels.length})
                </button>

                <button
                  onClick={() =>
                    previewLabels(
                      selectedLabels.size > 0
                        ? labels.filter((l) => selectedLabels.has(l.id))
                        : labels
                    )
                  }
                  className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Printer className="h-5 w-5" />
                  Preview Print
                </button>
              </div>
            </div>

            {/* Labels Display */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              {previewMode ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {labels.map((label) => (
                    <div
                      key={label.id}
                      className={`relative border-2 rounded-lg p-3 cursor-pointer transition-all aspect-[4/5] ${
                        selectedLabels.has(label.id)
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                          : "border-gray-200 hover:border-gray-300 hover:shadow-md"
                      } ${
                        label.isTpr
                          ? "bg-gradient-to-br from-red-50 to-red-100"
                          : "bg-gray-50"
                      }`}
                      onClick={() => toggleLabelSelection(label.id)}
                    >
                      <div className="h-full flex flex-col">
                        {label.isTpr && (
                          <div className="absolute top-1 left-1 bg-yellow-400 text-black text-xs px-1 py-0.5 rounded font-bold">
                            TPR
                          </div>
                        )}
                        {label.originalPrice && label.isTpr && (
                          <div className="absolute top-1 right-1 text-xs line-through text-gray-600 bg-white px-1 rounded">
                            {label.originalPrice}
                          </div>
                        )}
                        <div className="flex-1 flex items-center justify-center">
                          <div className="text-lg font-bold text-center">
                            {label.price}
                          </div>
                        </div>
                        <div
                          className="text-xs text-gray-700 text-center mb-1 truncate px-1"
                          title={label.description}
                        >
                          {label.description}
                        </div>
                        <div className="text-xs text-gray-500 font-mono text-center">
                          {label.upc}
                        </div>
                      </div>
                      {selectedLabels.has(label.id) && (
                        <CheckSquare className="absolute -top-2 -right-2 h-6 w-6 text-blue-600 bg-white rounded-full shadow-lg" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
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
                                  label.isTpr
                                    ? "bg-red-100 text-red-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {label.isTpr ? "TPR" : "Regular"}
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
