import React, { useState, useCallback, useMemo } from 'react';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Product {
  UPC: string;
  [key: string]: any;
}

interface SupplierProduct extends Product {
  TPR?: string | number;
  cost?: number;
  price?: number;
}

interface POSProduct extends Product {
  cost?: number;
  price?: number;
}

interface MatchedProduct {
  UPC: string;
  supplier: SupplierProduct;
  pos: POSProduct;
  hasTpr: boolean;
  priceUpdated: boolean;
  updatedFields: string[];
}

const App: React.FC = () => {
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
  const handleFileUpload = useCallback((file: File, type: 'supplier' | 'pos') => {
    // Set uploading state and reset progress
    if (type === 'supplier') {
      setUploadingSupplier(true);
      setSupplierProgress(0);
    } else {
      setUploadingPos(true);
      setPosProgress(0);
    }

    // Start progress simulation
    const progressInterval = simulateProgress(
      type === 'supplier' ? setSupplierProgress : setPosProgress,
      800
    );

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Complete progress and finish upload
        setTimeout(() => {
          if (type === 'supplier') {
            setSupplierProgress(100);
            setTimeout(() => {
              setSupplierData(jsonData as SupplierProduct[]);
              setSupplierFile(file);
              setUploadingSupplier(false);
              setSupplierProgress(0);
            }, 200);
          } else {
            setPosProgress(100);
            setTimeout(() => {
              setPosData(jsonData as POSProduct[]);
              setPosFile(file);
              setUploadingPos(false);
              setPosProgress(0);
            }, 200);
          }
        }, 300);
      } catch (error) {
        console.error('Error reading file:', error);
        alert('Error reading file. Please ensure it\'s a valid Excel file.');
        clearInterval(progressInterval);
        if (type === 'supplier') {
          setUploadingSupplier(false);
          setSupplierProgress(0);
        } else {
          setUploadingPos(false);
          setPosProgress(0);
        }
      }
    };
    
    reader.onerror = () => {
      alert('Error reading file. Please try again.');
      clearInterval(progressInterval);
      if (type === 'supplier') {
        setUploadingSupplier(false);
        setSupplierProgress(0);
      } else {
        setUploadingPos(false);
        setPosProgress(0);
      }
    };
    
    reader.readAsArrayBuffer(file);
  }, []);

  // Process and match products
  const processProducts = useCallback(async () => {
    if (!supplierData.length || !posData.length) return;

    setProcessing(true);
    
    // Create a Map for O(1) lookup of supplier products by UPC
    const supplierMap = new Map<string, SupplierProduct>();
    supplierData.forEach(product => {
      if (product.UPC) {
        supplierMap.set(String(product.UPC), product);
      }
    });

    const matched: MatchedProduct[] = [];
    
    // Process in chunks to avoid blocking UI
    const chunkSize = 1000;
    for (let i = 0; i < posData.length; i += chunkSize) {
      const chunk = posData.slice(i, i + chunkSize);
      
      chunk.forEach(posProduct => {
        const upc = String(posProduct.UPC);
        const supplierProduct = supplierMap.get(upc);
        
        if (supplierProduct) {
          const hasTpr = Boolean(supplierProduct.TPR && String(supplierProduct.TPR).trim() !== '');
          let priceUpdated = false;
          const updatedFields: string[] = [];

          // If no TPR, check for price updates
          if (!hasTpr) {
            // Check cost field
            if (supplierProduct.cost !== undefined && posProduct.cost !== undefined) {
              if (Number(supplierProduct.cost) !== Number(posProduct.cost)) {
                posProduct.cost = Number(supplierProduct.cost);
                priceUpdated = true;
                updatedFields.push('cost');
              }
            }
            
            // Check price field
            if (supplierProduct.price !== undefined && posProduct.price !== undefined) {
              if (Number(supplierProduct.price) !== Number(posProduct.price)) {
                posProduct.price = Number(supplierProduct.price);
                priceUpdated = true;
                updatedFields.push('price');
              }
            }
          }

          matched.push({
            UPC: upc,
            supplier: supplierProduct,
            pos: posProduct,
            hasTpr,
            priceUpdated,
            updatedFields
          });
        }
      });

      // Allow UI to update
      if (i % (chunkSize * 5) === 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }

    setMatchedProducts(matched);
    setStep(2);
    setProcessing(false);
  }, [supplierData, posData]);

  // Filter products by TPR status
  const tprProducts = useMemo(() => 
    matchedProducts.filter(p => p.hasTpr), [matchedProducts]
  );

  const nonTprProducts = useMemo(() => 
    matchedProducts.filter(p => !p.hasTpr), [matchedProducts]
  );

  const updatedProducts = useMemo(() => 
    nonTprProducts.filter(p => p.priceUpdated), [nonTprProducts]
  );

  // Download functions
  const downloadData = useCallback((data: any[], filename: string, format: 'xlsx' | 'csv') => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    
    if (format === 'xlsx') {
      XLSX.writeFile(wb, `${filename}.xlsx`);
    } else {
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, []);

  const downloadTprProducts = useCallback((format: 'xlsx' | 'csv') => {
    const data = tprProducts.map(p => ({
      UPC: p.UPC,
      TPR: p.supplier.TPR,
      ...p.supplier,
      ...p.pos
    }));
    downloadData(data, 'tpr_products', format);
  }, [tprProducts, downloadData]);

  const downloadUpdatedProducts = useCallback((format: 'xlsx' | 'csv') => {
    const data = updatedProducts.map(p => ({
      UPC: p.UPC,
      UpdatedFields: p.updatedFields.join(', '),
      ...p.pos
    }));
    downloadData(data, 'updated_products', format);
  }, [updatedProducts, downloadData]);

  const downloadNonTprProducts = useCallback((format: 'xlsx' | 'csv') => {
    const data = nonTprProducts.map(p => ({
      UPC: p.UPC,
      Status: p.priceUpdated ? 'Updated' : 'No Change',
      UpdatedFields: p.updatedFields.join(', ') || '-',
      SupplierCost: p.supplier.cost || '-',
      SupplierPrice: p.supplier.price || '-',
      POSCost: p.pos.cost || '-',
      POSPrice: p.pos.price || '-',
      ...p.supplier,
      ...p.pos
    }));
    downloadData(data, 'non_tpr_products', format);
  }, [nonTprProducts, downloadData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Supplier POS Comparison System
          </h1>
          <p className="text-gray-600">
            Upload supplier and POS Excel files to compare and update product information
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
              <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 ${
                uploadingSupplier 
                  ? 'border-green-400 bg-green-50' 
                  : supplierFile 
                    ? 'border-green-400 bg-green-50' 
                    : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
              }`}>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'supplier')}
                  className="hidden"
                  id="supplier-upload"
                  disabled={uploadingSupplier}
                />
                <label htmlFor="supplier-upload" className={`cursor-pointer ${uploadingSupplier ? 'pointer-events-none' : ''}`}>
                  {uploadingSupplier ? (
                    <div className="flex flex-col items-center">
                      <div className="relative w-16 h-16 mb-3">
                        {/* Circular progress background */}
                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="currentColor"
                            strokeWidth="4"
                            className="text-green-200"
                            fill="none"
                          />
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="currentColor"
                            strokeWidth="4"
                            className="text-green-600"
                            fill="none"
                            strokeDasharray="175.9"
                            strokeDashoffset={175.9 - (175.9 * supplierProgress) / 100}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dashoffset 0.1s ease' }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-semibold text-green-600">
                            {Math.round(supplierProgress)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-green-600 font-medium">Uploading...</p>
                      <p className="text-sm text-green-500 mt-1">Processing supplier file</p>
                    </div>
                  ) : supplierFile ? (
                    <div className="flex flex-col items-center">
                      <CheckCircle className="text-green-600 mb-2" size={48} />
                      <p className="text-green-600 font-medium">File uploaded successfully!</p>
                      <p className="text-sm text-green-500 mt-1">Click to upload a different file</p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto mb-2 text-gray-400 transition-colors group-hover:text-green-500" size={48} />
                      <p className="text-gray-600">Click to upload supplier Excel file</p>
                      <p className="text-sm text-gray-400 mt-1">Up to 40K products supported</p>
                    </div>
                  )}
                </label>
              </div>
              {supplierFile && !uploadingSupplier && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg flex items-center animate-fade-in">
                  <CheckCircle className="text-green-600 mr-2 animate-bounce" size={20} />
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
              <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 ${
                uploadingPos 
                  ? 'border-blue-400 bg-blue-50' 
                  : posFile 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'pos')}
                  className="hidden"
                  id="pos-upload"
                  disabled={uploadingPos}
                />
                <label htmlFor="pos-upload" className={`cursor-pointer ${uploadingPos ? 'pointer-events-none' : ''}`}>
                  {uploadingPos ? (
                    <div className="flex flex-col items-center">
                      <div className="relative w-16 h-16 mb-3">
                        {/* Circular progress background */}
                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="currentColor"
                            strokeWidth="4"
                            className="text-blue-200"
                            fill="none"
                          />
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="currentColor"
                            strokeWidth="4"
                            className="text-blue-600"
                            fill="none"
                            strokeDasharray="175.9"
                            strokeDashoffset={175.9 - (175.9 * posProgress) / 100}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dashoffset 0.1s ease' }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-semibold text-blue-600">
                            {Math.round(posProgress)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-blue-600 font-medium">Uploading...</p>
                      <p className="text-sm text-blue-500 mt-1">Processing POS file</p>
                    </div>
                  ) : posFile ? (
                    <div className="flex flex-col items-center">
                      <CheckCircle className="text-blue-600 mb-2" size={48} />
                      <p className="text-blue-600 font-medium">File uploaded successfully!</p>
                      <p className="text-sm text-blue-500 mt-1">Click to upload a different file</p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto mb-2 text-gray-400 transition-colors group-hover:text-blue-500" size={48} />
                      <p className="text-gray-600">Click to upload POS Excel file</p>
                      <p className="text-sm text-gray-400 mt-1">Up to 40K products supported</p>
                    </div>
                  )}
                </label>
              </div>
              {posFile && !uploadingPos && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center animate-fade-in">
                  <CheckCircle className="text-blue-600 mr-2 animate-bounce" size={20} />
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
              onClick={processProducts}
              disabled={processing}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              {processing ? 'Processing...' : 'Compare Products'}
            </button>
          </div>
        )}

        {/* Step 2: Results */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm font-medium text-gray-500">Total Matched</h3>
                <p className="text-2xl font-bold text-blue-600">{matchedProducts.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm font-medium text-gray-500">With TPR</h3>
                <p className="text-2xl font-bold text-green-600">{tprProducts.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm font-medium text-gray-500">Without TPR</h3>
                <p className="text-2xl font-bold text-orange-600">{nonTprProducts.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm font-medium text-gray-500">Price Updated</h3>
                <p className="text-2xl font-bold text-purple-600">{updatedProducts.length}</p>
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
                        onClick={() => downloadTprProducts('xlsx')}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm flex items-center"
                      >
                        <Download className="mr-1" size={16} />
                        Download XLSX
                      </button>
                      <button
                        onClick={() => downloadTprProducts('csv')}
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
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UPC</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TPR</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier Cost</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier Price</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">POS Cost</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">POS Price</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {tprProducts.map((product, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{product.UPC}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 font-medium">{product.supplier.TPR}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{product.supplier.cost || '-'}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{product.supplier.price || '-'}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{product.pos.cost || '-'}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{product.pos.price || '-'}</td>
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
                    <div className="flex space-x-2">
                      <button
                        onClick={() => downloadNonTprProducts('xlsx')}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm flex items-center"
                      >
                        <Download className="mr-1" size={16} />
                        Download XLSX
                      </button>
                      <button
                        onClick={() => downloadNonTprProducts('csv')}
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
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UPC</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated Fields</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier Cost</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier Price</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">POS Cost</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">POS Price</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {nonTprProducts.map((product, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{product.UPC}</td>
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
                              {product.updatedFields.length > 0 ? product.updatedFields.join(', ') : '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{product.supplier.cost || '-'}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{product.supplier.price || '-'}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{product.pos.cost || '-'}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{product.pos.price || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2 text-sm text-gray-500 text-center">
                    Showing all {nonTprProducts.length} products without TPR ({updatedProducts.length} updated)
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

        {processing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Processing Products</h3>
                <p className="text-gray-600">This may take a moment for large datasets...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;