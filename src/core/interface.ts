export interface Product {
  UPC: string;
  [key: string]: any;
}

export interface SupplierProduct extends Product {
  TPR?: string | number;
  BASE_UNIT_COST?: number;
  BASE_RETAIL?: number;
}

export interface POSProduct extends Product {
    BASE_UNIT_COST?: number;
    BASE_RETAIL?: number;
}

export interface MatchedProduct {
  UPC: string;
  supplier: SupplierProduct;
  pos: POSProduct;
  hasTpr: boolean;
  priceUpdated: boolean;
  updatedFields: string[];
}

export interface CircularProgressProps {
  progress: number;
  color: string; // Optional color prop with default value
}
