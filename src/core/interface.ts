export interface Product {
  [key: string]: any;
}

export interface SupplierProduct extends Product {
  UPC: string;
  TPR_RETAIL: number;

  CATEGORY?: string;
  CATEGORY_DESCRIPTION?: string;
  SUB_CATEGORY?: string;
  SUB_CATEGORY_DESCRIPTION?: string;
  BRAND_CODE?: string;
  DEAL?: string;
  ITEM_CODE?: string;
  NEW_ITEM_INDICATOR?: number;
  DEAL2?: string;
  PACK?: string;
  SIZE?: string;
  DESCRIPTION?: string;
  PLT?: string;
  COMP_RETAIL?: number;
  BASE_RETAIL_MULTIPLE?: number;
  BASE_RETAIL?: number;
  BASE_RETAIL_TYPE?: string;
  RECORD_STATUS_DATE?: string;
  BASE_PRICE_INDICATOR?: number;
  BASE_PRICE_GP?: number;
  BASE_UNIT_COST?: number;
  BASE_CASE_COST?: number;
  COST_IND?: string;
  BASE_OVERRIDE_MULTIPLE?: number;
  BASE_OVERRIDE?: number;
  BASE_OVERRIDE_TYPE?: string;
  OVERRIDE_INDICATOR?: number;
  OVERRIDE_GP?: number;
  TPR_RETAIL_MULTIPLE?: number;
  TPR_TYPE?: number;
  TPR_INDICATOR?: number;
  TPR_GP?: number;
  DEAL_TYPE1?: string;
  DEAL_CASE_AMT1?: number;
  DEAL_START_DATE1?: string;
  DEAL_END_DATE1?: string;
  DEAL_UNIT_COST1?: number;
  DEAL_CASE_COST1?: number;
  DEAL_TYPE2?: string;
  DEAL_CASE_AMT2?: number;
  DEAL_START_DATE2?: string;
  DEAL_END_DATE2?: string;
  DEAL_UNIT_COST2?: number;
  DEAL_CASE_COST2?: number;
  DEAL_TYPE3?: string;
  DEAL_CASE_AMT3?: number;
  DEAL_START_DATE3?: string;
  DEAL_END_DATE3?: string;
  DEAL_UNIT_COST3?: number;
  DEAL_CASE_COST3?: number;
  DEAL_TYPE4?: string;
  DEAL_CASE_AMT4?: number;
  DEAL_START_DATE4?: string;
  DEAL_END_DATE4?: string;
  DEAL_UNIT_COST4?: number;
  DEAL_CASE_COST4?: number;
  DEAL_TYPE5?: string;
  DEAL_CASE_AMT5?: number;
  DEAL_START_DATE5?: string;
  DEAL_END_DATE5?: string;
  DEAL_UNIT_COST5?: number;
  DEAL_CASE_COST5?: number;
  T_O?: string;
  PRM_STORE_NUMBER?: string;
  GSC_RETAIL?: number;
  SPEC_REFLECT?: string;
  SPEC_DATE?: string;
}

export interface POSProduct extends Product {
  Barcode: string;
  Cost?: number;
  Price?: number;

  Code?: string;
  ItemCode?: string;
  Item_Name?: string;
  Percent?: number; // originally `%`, renamed to `Percent` without `%`
  OnHand?: number;
  CasePrice?: number;
  EBT?: boolean;
  Department?: string;
  SubDepartment?: string;
  Tax?: number;
  MixMatch?: string;
  Vendor?: string;
  PLUGroup?: string;
  MarginGoal?: number;
  Action?: string;
  Status?: string;
}

export interface MatchedProduct {
  UPC: string;
  supplier: SupplierProduct;
  pos: POSProduct;
  hasTpr: boolean;
  priceUpdated: boolean;
  updatedProductPrices: any;
  updatedFields: string[];
}

export interface CircularProgressProps {
  progress: number;
  color: string; // Optional color prop with default value
}

export type SheetData = {
  sheetName: string;
  data: any[];
};
