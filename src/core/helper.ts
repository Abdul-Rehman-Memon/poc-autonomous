import type { LabelData } from "./interface";
// barcodeUtils.ts
import JsBarcode from "jsbarcode";

export const generateBarcodeSVG = (value: string): string => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(svg, value, {
    format: "CODE128",
    displayValue: false,
    height: 40,
    width: 1,
    margin: 0,
  });
  return svg.outerHTML;
};

export function normalizeNumber(input: string): string {
  try {
    return input.replace(/\s+/g, "").replace(/\D/g, "").replace(/^0+/, "");
  } catch (error) {
    console.error("Error normalizing number:", error);
    return input; // Return the original input in case of an error
  }
}

export const renderTPRLabelAsHTML = (label: LabelData): string => {
  const barcodeSVG = generateBarcodeSVG(label.upc);
  return `
    <div style="
      width: 14.5rem;
      border: 1px solid black;
      color: black;
      font-family: Arial, sans-serif;
      font-size: 0.75rem;
      font-weight: bold;
      background-color: white;
      box-sizing: border-box;
    ">
      <div style="display:flex; flex-direction:column; border-bottom:1px solid black;">
        <div style="display:flex; justify-content:space-between; padding:0.25rem 0.5rem; font-size:10px;">
          <div>Item: ${label.originalDetails?.ITEM_CODE}</div>
          <div>${label.originalDetails?.PACK} - ${
    label.originalDetails?.SIZE
  }</div>
        </div>
        <div style="display:flex; justify-content:space-between; padding:0 0.5rem 0.25rem; font-size:10px;">
          <div>${label.description}</div>
          <div>UPC: ${label.upc}</div>
        </div>
      </div>
      <div style="background-color:#dc2626; color:white; text-align:center; font-size:10px; padding:0.125rem 0;">
        EXPIRES: ${label.originalDetails?.DEAL_END_DATE1}
      </div>
      <div style="background-color:black; color:#facc15; text-align:center; font-size:10px; padding:0.25rem 0;">
        TEMPORARY PRICE REDUCTION
      </div>
      <div style="text-align:center; color:#b91c1c; font-size:1.75rem; font-weight:800; padding:0.5rem 0;">
        BEST BUY
      </div>
      <div style="background-color:#facc15; color:black; text-align:center; font-size:2.25rem; font-weight:bold; padding:0.5rem 0;">
        $${Number(label.originalDetails?.TPR_RETAIL).toFixed(2)}
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; padding:0.25rem 0.5rem; font-size:10px;">
        <div>
          <div style="text-decoration:line-through;">Regular</div>
          <div style="text-decoration:line-through;">
            $${Number(label.originalDetails?.BASE_RETAIL).toFixed(2)}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="color:#dc2626; font-weight:800;">YOU SAVE</div>
          <div style="color:#dc2626; font-weight:800;">
            $${(
              Number(label.originalDetails?.BASE_RETAIL) -
              Number(label.originalDetails?.TPR_RETAIL)
            ).toFixed(2)}
          </div>
        </div>
      </div>
      <div style="display:flex; flex-direction:column; align-items:center; padding:0.5rem 0;">
        <div style="font-size:10px;">Barcode:</div>
        <div style="
          background-color:white;
          border:1px solid black;
          padding:0.25rem 0.5rem;
          box-sizing:border-box;
        ">
          ${barcodeSVG}
        </div>
      </div>
    </div>
  `;
};

export const renderNONTPRLabelAsHTML = (label: LabelData): string => {
  const barcodeSVG = generateBarcodeSVG(label.upc);

  return `
    <div style="
      width: 4in;
      height: 1.25in;
      border: 1px solid black;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      grid-template-rows: auto auto auto auto auto;
      font-size: 0.75rem;
      font-family: Arial, sans-serif;
      line-height: 1;
      box-sizing: border-box;
    ">
      <!-- Item Code (header row) -->
      <div style="
        grid-column: 1 / span 3;
        grid-row: 1 / span 1;
        background-color: #fcd34d;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.875rem;
        border-bottom: 1px solid black;
        box-sizing: border-box;
      ">
        ${label.originalDetails?.ITEM_CODE || ""}
      </div>

      <!-- Base Retail (spans all rows) -->
      <div style="
        grid-column: 4 / span 1;
        grid-row: 1 / span 5;
        background-color: #fcd34d;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.25rem;
        border-left: 1px solid black;
        box-sizing: border-box;
      ">
        ${Number(label.originalDetails?.BASE_RETAIL || 0).toFixed(2)}
      </div>

      <!-- Description (row 2) -->
      <div style="
        grid-column: 1 / span 3;
        grid-row: 2 / span 1;
        padding: 0 0.25rem;
        margin: 0;
        box-sizing: border-box;
      ">
        ${label.description}
      </div>

      <!-- UPC (row 3, cols 1–2) -->
      <div style="
        grid-column: 1 / span 2;
        grid-row: 3 / span 1;
        padding: 0 0.25rem;
        margin: 0;
        box-sizing: border-box;
      ">
        ${label.upc}
      </div>

      <!-- Pack – Size (row 3, col 3) -->
      <div style="
        grid-column: 3 / span 1;
        grid-row: 3 / span 1;
        padding: 0 0.25rem;
        margin: 0;
        box-sizing: border-box;
      ">
        ${label.originalDetails?.PACK} - ${label.originalDetails?.SIZE}
      </div>

      <!-- Barcode (row 4) -->
      <div style="
        grid-column: 1 / span 3;
        grid-row: 4 / span 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0;
        margin: 0;
        box-sizing: border-box;
      ">
        ${barcodeSVG}
      </div>

      <!-- PQ65 & Expiry (row 5) -->
      <div style="
        grid-column: 1 / span 3;
        grid-row: 5 / span 1;
        padding: 0 0.25rem;
        margin: 0;
        box-sizing: border-box;
        font-size: 0.7rem;
      ">
        ${label.originalDetails?.PQ65 || "Unknown"} |
        ${label.originalDetails?.DEAL_END_DATE1 || "Unknown"}
      </div>
    </div>
  `;
};

export const renderPriceLabelAsHTML = (label: LabelData): string => {
  const barcodeSVG = generateBarcodeSVG(label.upc);

  return `
    <div style="
      width: 4in;
      height: 1.25in;
      border: 1px solid black;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      grid-template-rows: auto auto auto auto auto;
      font-size: 0.75rem;
      font-family: Arial, sans-serif;
      line-height: 1;
      box-sizing: border-box;
    ">
      <!-- Item Code (header row) -->
      <div style="
        grid-column: 1 / span 3;
        grid-row: 1 / span 1;
        background-color: #fcd34d;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.875rem;
        border-bottom: 1px solid black;
        box-sizing: border-box;
      ">
        ${label.originalDetails?.ITEM_CODE || ""}
      </div>

      <!-- Base Retail (spans all rows) -->
      <div style="
        grid-column: 4 / span 1;
        grid-row: 1 / span 5;
        background-color: #fcd34d;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.25rem;
        border-left: 1px solid black;
        box-sizing: border-box;
      ">
        ${Number(label.originalDetails?.BASE_RETAIL || 0).toFixed(2)}
      </div>

      <!-- Description (row 2) -->
      <div style="
        grid-column: 1 / span 3;
        grid-row: 2 / span 1;
        padding: 0 0.25rem;
        margin: 0;
        box-sizing: border-box;
      ">
        ${label.description}
      </div>

      <!-- UPC (row 3, cols 1–2) -->
      <div style="
        grid-column: 1 / span 2;
        grid-row: 3 / span 1;
        padding: 0 0.25rem;
        margin: 0;
        box-sizing: border-box;
      ">
        ${label.upc}
      </div>

      <!-- Pack – Size (row 3, col 3) -->
      <div style="
        grid-column: 3 / span 1;
        grid-row: 3 / span 1;
        padding: 0 0.25rem;
        margin: 0;
        box-sizing: border-box;
      ">
        ${label.originalDetails?.PACK} - ${label.originalDetails?.SIZE}
      </div>

      <!-- Barcode (row 4) -->
      <div style="
        grid-column: 1 / span 3;
        grid-row: 4 / span 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0;
        margin: 0;
        box-sizing: border-box;
      ">
        ${barcodeSVG}
      </div>

    </div>
  `;
};
