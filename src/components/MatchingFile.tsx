import React, { useState, useCallback, useMemo } from "react";
import { Upload, Download, FileSpreadsheet, CheckCircle } from "lucide-react";
import * as XLSX from "xlsx";
import type {
  SupplierProduct,
  POSProduct,
  MatchedProduct,
  SheetData,
} from "./../core/interface";
import CircularProgress from "./CircleProgress";
import { normalizeNumber } from "./../core/helper";
import ProgressModal from "./ProgressModal";

const MatchingFile: React.FC = () => {
  const [supplierFile, setSupplierFile] = useState<File | null>(null);
  const [posFile, setPosFile] = useState<File | null>(null);
  const [supplierData, setSupplierData] = useState<SupplierProduct[]>([]);
  const [posData, setPosData] = useState<POSProduct[]>([]);
  const [matchedProducts, setMatchedProducts] = useState<MatchedProduct[]>([]);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState(1);
  const [uploadingSupplier, setUploadingSupplier] = useState(false);
  const [uploadingPos, setUploadingPos] = useState(false);
  const [supplierProgress, setSupplierProgress] = useState(0);
  const [posProgress, setPosProgress] = useState(0);

  // Simulate upload progress
  const simulateProgress = (
    setProgress: (progress: number) => void,
    duration: number = 800
  ) => {
    let progress = 0;
    const increment = 100 / (duration / 50);

    const interval = setInterval(() => {
      progress += increment + Math.random() * 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
      }
      setProgress(Math.min(progress, 100));
    }, 50);

    return interval;
  };

  // File upload handlers
  const handleFileUpload = useCallback(
    (file: File, type: "supplier" | "pos") => {
      // Set uploading state and reset progress
      if (type === "supplier") {
        setUploadingSupplier(true);
        setSupplierProgress(0);
      } else {
        setUploadingPos(true);
        setPosProgress(0);
      }

      // Start progress simulation
      const progressInterval = simulateProgress(
        type === "supplier" ? setSupplierProgress : setPosProgress,
        800
      );

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          // Get header row (first row) manually
          const range = XLSX.utils.decode_range(worksheet["!ref"]!);
          const headers: string[] = [];

          for (let col = range.s.c; col <= range.e.c; ++col) {
            const cellAddress = XLSX.utils.encode_cell({
              r: range.s.r,
              c: col,
            });
            const cell = worksheet[cellAddress];
            headers.push(cell ? String(cell.v).trim() : `UNKNOWN_${col}`);
          }

          // Parse with headers and include empty cells (defval sets empty to null or '')
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: headers,
            defval: "", // or use null to keep actual nulls
            range: range.s.r + 1, // Skip header row (already passed in `header`)
          });

          // Complete progress and finish upload
          setTimeout(() => {
            switch (type) {
              case "supplier":
                setSupplierProgress(100);
                setTimeout(() => {
                  setSupplierData(jsonData as SupplierProduct[]);
                  setSupplierFile(file);
                  setUploadingSupplier(false);
                  setSupplierProgress(0);
                }, 200);

                break;
              case "pos":
                setPosProgress(100);
                setTimeout(() => {
                  setPosData(jsonData as POSProduct[]);
                  setPosFile(file);
                  setUploadingPos(false);
                  setPosProgress(0);
                }, 200);
                break;
            }
          }, 300);
        } catch (error) {
          console.error("Error reading file:", error);
          alert("Error reading file. Please ensure it's a valid Excel file.");
          clearInterval(progressInterval);
          switch (type) {
            case "supplier":
              setUploadingSupplier(false);
              setSupplierProgress(0);
              break;
            case "pos":
              setUploadingPos(false);
              setPosProgress(0);
              break;
          }
        }
      };

      reader.onerror = () => {
        alert("Error reading file. Please try again.");
        clearInterval(progressInterval);
        switch (type) {
          case "supplier":
            setUploadingSupplier(false);
            setSupplierProgress(0);
            break;
          case "pos":
            setUploadingPos(false);
            setPosProgress(0);
            break;
        }
      };

      reader.readAsArrayBuffer(file);
    },
    []
  );

  // Process and match products

  const processProducts = useCallback(
    async (filter: "cost" | "retail" | "all" = "all") => {
      if (!supplierData.length || !posData.length) return;

      setProcessing(true);

      // Normalize UPCs and map supplier products
      const supplierMap = new Map<string, SupplierProduct>();
      supplierData.forEach((product) => {
        if (product.UPC !== undefined && product.UPC !== null) {
          const normalizedUPC = normalizeNumber(product.UPC);
          supplierMap.set(normalizedUPC, product);
        }
      });

      const matched: MatchedProduct[] = [];
      const nonTpr: MatchedProduct[] = [];

      const chunkSize = 1000;

      for (let i = 0; i < posData.length; i += chunkSize) {
        const chunk = posData.slice(i, i + chunkSize);

        chunk.forEach((posProduct) => {
          if (posProduct.Barcode !== undefined && posProduct.Barcode !== null) {
            const upc = normalizeNumber(String(posProduct.Barcode));
            const supplierProduct = supplierMap.get(upc);
            if (supplierProduct) {
              const hasTpr = Boolean(
                supplierProduct.TPR_RETAIL &&
                  String(supplierProduct.TPR_RETAIL).trim() !== ""
              );

              let priceUpdated = false;
              const updatedFields: string[] = [];
              const updatedProductPrices = { ...posProduct };

              // Apply filters
              const checkCost = filter === "cost" || filter === "all";
              const checkRetail = filter === "retail" || filter === "all";

              if (!hasTpr) {
                if (
                  checkCost &&
                  supplierProduct.BASE_UNIT_COST !== undefined &&
                  posProduct.Cost !== undefined &&
                  Number(supplierProduct.BASE_UNIT_COST) !==
                    Number(posProduct.Cost)
                ) {
                  updatedProductPrices.Cost = Number(
                    supplierProduct.BASE_UNIT_COST
                  );
                  priceUpdated = true;
                  updatedFields.push("BASE_UNIT_COST");
                }

                if (
                  checkRetail &&
                  supplierProduct.BASE_RETAIL !== undefined &&
                  posProduct.Price !== undefined &&
                  Number(supplierProduct.BASE_RETAIL) !==
                    Number(posProduct.Price)
                ) {
                  updatedProductPrices.Price = Number(
                    supplierProduct.BASE_RETAIL
                  );
                  priceUpdated = true;
                  updatedFields.push("BASE_RETAIL");
                }
              }

              const matchedProduct: MatchedProduct = {
                UPC: upc,
                supplier: supplierProduct,
                pos: posProduct,
                updatedProductPrices,
                hasTpr,
                priceUpdated,
                updatedFields,
              };

              matched.push(matchedProduct);

              // Store non-TPR products that are price-updated
              if (!hasTpr && priceUpdated) {
                nonTpr.push(matchedProduct);
              }
            }
          }
        });

        // Keep UI responsive
        if (i % (chunkSize * 5) === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1));
        }
      }

      setMatchedProducts(matched);
      setStep(2);
      setProcessing(false);
    },
    [supplierData, posData]
  );

  // Filter products by TPR status
  const tprProducts = useMemo(
    () => matchedProducts.filter((p) => p.hasTpr),
    [matchedProducts]
  );

  const nonTprProducts = useMemo(
    () => matchedProducts.filter((p) => !p.hasTpr),
    [matchedProducts]
  );

  const updatedProducts = useMemo(
    () => nonTprProducts.filter((p) => p.priceUpdated),
    [nonTprProducts]
  );

  const downloadData = useCallback(
    (
      sheets: [SheetData, SheetData?], // first required, second optional
      filename: string,
      format: "xlsx" | "csv"
    ) => {
      const wb = XLSX.utils.book_new();

      sheets.forEach((sheet) => {
        if (!sheet) return; // Safeguard for optional second sheet
        const ws = XLSX.utils.json_to_sheet(sheet.data);
        XLSX.utils.book_append_sheet(wb, ws, sheet.sheetName);
      });

      if (format === "xlsx") {
        XLSX.writeFile(wb, `${filename}.xlsx`);
      } else {
        const [firstSheet] = sheets;
        const csv = XLSX.utils.sheet_to_csv(
          XLSX.utils.json_to_sheet(firstSheet.data)
        );
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filename}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    },
    []
  );
  const downloadTprProducts = useCallback(
    (format: "xlsx" | "csv") => {
      const data = tprProducts.map((p) => {
        // Start with all supplier columns
        const result = { ...p.supplier };

        return result;
      });
      downloadData(
        [
          {
            sheetName: "TPR Products",
            data,
          },
        ],
        "tpr_products",
        format
      );
    },
    [tprProducts, downloadData]
  );

  const downloadNonTprProducts = useCallback(
    (format: "xlsx" | "csv") => {
      const data = nonTprProducts.map((p) => {
        const result = {
          STATUS: p.priceUpdated ? "Updated" : "No Change",
          UPDATED_FIELDS: p.updatedFields.join(", ") || "-",
          ...p.supplier,
          ...p.pos,
        };

        return result;
      });

      const matchedData = nonTprProducts
        .filter((p) => p.priceUpdated)
        .map((p) => {
          const result = {
            STATUS: "Updated",
            UPDATED_FIELDS: p.updatedFields.join(", ") || "-",
            ...p.supplier,
            ...p.pos,
          };
          return result;
        });

      downloadData(
        [
          {
            sheetName: "Non-TPR Products Filtered",
            data: matchedData,
          },
          {
            sheetName: "Non-TPR Products",
            data,
          },
        ],
        "non_tpr_products",
        format
      );
    },
    [nonTprProducts, downloadData]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Supplier POS Comparison System
          </h1>
          <p className="text-gray-600">
            Upload supplier and POS Excel files to compare and update product
            information
          </p>
        </div>

        {/* Step 1: File Upload */}
        {step === 1 && (
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Supplier File Upload */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <FileSpreadsheet className="mr-2 text-green-600" />
                Supplier File
              </h2>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 ${
                  uploadingSupplier
                    ? "border-green-400 bg-green-50"
                    : supplierFile
                    ? "border-green-400 bg-green-50"
                    : "border-gray-300 hover:border-green-400 hover:bg-green-50"
                }`}
              >
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) =>
                    e.target.files?.[0] &&
                    handleFileUpload(e.target.files[0], "supplier")
                  }
                  className="hidden"
                  id="supplier-upload"
                  disabled={uploadingSupplier}
                />
                <label
                  htmlFor="supplier-upload"
                  className={`cursor-pointer ${
                    uploadingSupplier ? "pointer-events-none" : ""
                  }`}
                >
                  {uploadingSupplier ? (
                    <div className="flex flex-col items-center">
                      <CircularProgress
                        progress={supplierProgress}
                        color="green"
                      />
                      <p className="text-green-600 font-medium">Uploading...</p>
                      <p className="text-sm text-green-500 mt-1">
                        Processing supplier file
                      </p>
                    </div>
                  ) : supplierFile ? (
                    <div className="flex flex-col items-center">
                      <CheckCircle className="text-green-600 mb-2" size={48} />
                      <p className="text-green-600 font-medium">
                        File uploaded successfully!
                      </p>
                      <p className="text-sm text-green-500 mt-1">
                        Click to upload a different file
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Upload
                        className="mx-auto mb-2 text-gray-400 transition-colors group-hover:text-green-500"
                        size={48}
                      />
                      <p className="text-gray-600">
                        Click to upload supplier Excel file
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        Up to 40K products supported
                      </p>
                    </div>
                  )}
                </label>
              </div>
              {supplierFile && !uploadingSupplier && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg flex items-center animate-fade-in">
                  <CheckCircle
                    className="text-green-600 mr-2 animate-bounce"
                    size={20}
                  />
                  <span className="text-green-800">
                    {supplierFile.name} ({supplierData.length} products)
                  </span>
                </div>
              )}
            </div>

            {/* POS File Upload */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <FileSpreadsheet className="mr-2 text-blue-600" />
                POS File
              </h2>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 ${
                  uploadingPos
                    ? "border-blue-400 bg-blue-50"
                    : posFile
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                }`}
              >
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) =>
                    e.target.files?.[0] &&
                    handleFileUpload(e.target.files[0], "pos")
                  }
                  className="hidden"
                  id="pos-upload"
                  disabled={uploadingPos}
                />
                <label
                  htmlFor="pos-upload"
                  className={`cursor-pointer ${
                    uploadingPos ? "pointer-events-none" : ""
                  }`}
                >
                  {uploadingPos ? (
                    <div className="flex flex-col items-center">
                      <CircularProgress progress={posProgress} color="blue" />
                      <p className="text-blue-600 font-medium">Uploading...</p>
                      <p className="text-sm text-blue-500 mt-1">
                        Processing POS file
                      </p>
                    </div>
                  ) : posFile ? (
                    <div className="flex flex-col items-center">
                      <CheckCircle className="text-blue-600 mb-2" size={48} />
                      <p className="text-blue-600 font-medium">
                        File uploaded successfully!
                      </p>
                      <p className="text-sm text-blue-500 mt-1">
                        Click to upload a different file
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Upload
                        className="mx-auto mb-2 text-gray-400 transition-colors group-hover:text-blue-500"
                        size={48}
                      />
                      <p className="text-gray-600">
                        Click to upload POS Excel file
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        Up to 40K products supported
                      </p>
                    </div>
                  )}
                </label>
              </div>
              {posFile && !uploadingPos && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center animate-fade-in">
                  <CheckCircle
                    className="text-blue-600 mr-2 animate-bounce"
                    size={20}
                  />
                  <span className="text-blue-800">
                    {posFile.name} ({posData.length} products)
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Process Button */}
        {step === 1 && supplierData.length > 0 && posData.length > 0 && (
          <div className="text-center mb-6">
            <button
              onClick={() => processProducts()}
              disabled={processing}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              {processing ? "Processing..." : "Compare Products"}
            </button>
          </div>
        )}

        {/* Step 2: Results */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm font-medium text-gray-500">
                  Total Matched
                </h3>
                <p className="text-2xl font-bold text-blue-600">
                  {matchedProducts.length}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm font-medium text-gray-500">With TPR</h3>
                <p className="text-2xl font-bold text-green-600">
                  {tprProducts.length}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm font-medium text-gray-500">
                  Without TPR
                </h3>
                <p className="text-2xl font-bold text-orange-600">
                  {nonTprProducts.length}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm font-medium text-gray-500">
                  Price Updated
                </h3>
                <p className="text-2xl font-bold text-purple-600">
                  {updatedProducts.length}
                </p>
              </div>
            </div>

            {/* All Matched Products - TPR Section */}
            {tprProducts.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800">
                      Products with TPR ({tprProducts.length})
                    </h2>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => downloadTprProducts("xlsx")}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm flex items-center"
                      >
                        <Download className="mr-1" size={16} />
                        Download XLSX
                      </button>
                      <button
                        onClick={() => downloadTprProducts("csv")}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm flex items-center"
                      >
                        <Download className="mr-1" size={16} />
                        Download CSV
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="h-80 overflow-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            UPC
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            TPR_RETAIL
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            TPR_TYPE
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            CATEGORY DESCRIPTION
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {tprProducts.map((product, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {product.UPC}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 font-medium">
                              {product.supplier.TPR_RETAIL || "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {product.supplier.TPR_TYPE || "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {product.supplier.CATEGORY_DESCRIPTION || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2 text-sm text-gray-500 text-center">
                    Showing all {tprProducts.length} products with TPR
                  </div>
                </div>
              </div>
            )}

            {/* All Matched Products - Non-TPR Section */}
            {nonTprProducts.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800">
                      Products without TPR ({nonTprProducts.length})
                    </h2>
                    <div className="flex space-x-2 ">
                      <div className="mb-4 flex items-center space-x-2">
                        <label htmlFor="filter" className="font-medium">
                          Show:
                        </label>
                        <select
                          id="filter"
                          className="border px-4 py-2 rounded-lg text-sm flex items-center"
                          onChange={(e) =>
                            processProducts(
                              e.target.value as "cost" | "retail" | "all"
                            )
                          }
                        >
                          <option value="all">All Products</option>
                          <option value="cost">Only Cost‑Changed</option>
                          <option value="retail">Only Retail‑Changed</option>
                        </select>
                      </div>

                      <button
                        onClick={() => downloadNonTprProducts("xlsx")}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm flex items-center"
                      >
                        <Download className="mr-1" size={16} />
                        Download XLSX
                      </button>
                      <button
                        onClick={() => downloadNonTprProducts("csv")}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm flex items-center"
                      >
                        <Download className="mr-1" size={16} />
                        Download CSV
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="h-80 overflow-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            UPC
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Updated Fields
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Supplier BASE_UNIT_COST
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            POS BASE_UNIT_COST
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Supplier BASE_RETAIL
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            POS BASE_RETAIL
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {nonTprProducts.map((product, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {product.UPC}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              {product.priceUpdated ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Updated
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  No Change
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-purple-600 font-medium">
                              {product.updatedFields.length > 0
                                ? product.updatedFields.join(", ")
                                : "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {product.supplier.BASE_UNIT_COST || "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {product.pos.Cost || "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {product.supplier.BASE_RETAIL || "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {product.pos.Price || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2 text-sm text-gray-500 text-center">
                    Showing all {nonTprProducts.length} products without TPR (
                    {updatedProducts.length} updated)
                  </div>
                </div>
              </div>
            )}

            {/* Reset Button */}
            <div className="text-center">
              <button
                onClick={() => {
                  setStep(1);
                  setMatchedProducts([]);
                  setSupplierData([]);
                  setPosData([]);
                  setSupplierFile(null);
                  setPosFile(null);
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
              >
                Start Over
              </button>
            </div>
          </div>
        )}

        {processing && <ProgressModal />}
      </div>
    </div>
  );
};

export default MatchingFile;
