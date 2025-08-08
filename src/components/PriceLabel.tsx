import React from "react";
import Barcode from "react-barcode";

type LabelProps = {
  itemCode: string;
  description: string;
  upc: string;
  pack: string;
  size: string;
  baseRetail: number;
};

const Label: React.FC<LabelProps> = ({
  itemCode,
  description,
  upc,
  pack,
  size,
  baseRetail,
}) => {
  return (
    <div className="w-[4in] h-[1.25in] border border-black grid grid-cols-4 grid-rows-3 text-xs font-sans leading-none">
      {/* ITEM_CODE (Column 7) */}
      <div className="col-span-3 row-span-1 bg-yellow-300 font-bold flex items-center justify-center text-sm border-b border-black">
        {itemCode}
      </div>

      {/* BASE_RETAIL (Column 17) */}
      <div className="col-span-1 row-span-5 bg-yellow-300 font-bold flex items-center justify-center text-4xl border-l border-black">
        {baseRetail}
      </div>

      {/* DESCRIPTION */}
      <div className="col-span-3 px-1 m-0 p-0">{description}</div>

      {/* UPC and PACK - SIZE */}
      <div className="col-span-2 px-1 m-0 p-0">{upc}</div>
      <div className="col-span-1 px-1 m-0 p-0">
        {pack} - {size}
      </div>

      {/* Barcode */}
      <div className="col-span-3 px-1 m-0 p-0 flex flex-col items-center">
        <Barcode
          displayValue={false}
          value={upc}
          height={40}
          width={1.25}
          fontSize={10}
        />
      </div>
    </div>
  );
};

export default Label;
