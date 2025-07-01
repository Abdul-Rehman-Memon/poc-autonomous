import React from "react";
import Barcode from "react-barcode";

interface TPRLabelProps {
  itemCode: string;
  description: string;
  size: string;
  pack: string;
  upc: string;
  baseRetail: number;
  tprRetail: number;
  expires: string;
  recordStatusDate: string;
}

const TPRLabel: React.FC<TPRLabelProps> = ({
  itemCode,
  description,
  size,
  pack,
  upc,
  baseRetail,
  tprRetail,
  expires,
  // recordStatusDate,
}) => {
  return (
    <div className="w-58 border border-black text-black text-xs font-bold bg-white">
      {/* Header */}
      <div className="flex flex-col border-b border-black">
        <div className="flex justify-between px-2 py-1 text-[10px]">
          <div>{`Item: ${itemCode}`}</div>
          <div>{`${pack} - ${size}`}</div>
        </div>
        <div className="flex justify-between px-2 pb-1 text-[10px]">
          <div>{description}</div>
          <div>{`UPC: ${upc}`}</div>
        </div>
      </div>

      {/* EXPIRATION + HEADER */}
      <div className="bg-red-600 text-white text-[10px] text-center py-0.5">
        EXPIRES: {expires}
      </div>
      <div className="bg-black text-yellow-400 text-center py-1 text-[10px]">
        TEMPORARY PRICE REDUCTION
      </div>

      {/* Best Buy */}
      <div className="text-center text-red-700 text-3xl font-extrabold py-2">
        BEST BUY
      </div>

      {/* Price */}
      <div className="bg-yellow-400 text-black text-center text-4xl font-bold py-2">
        {tprRetail.toFixed(2)}
      </div>

      {/* Bottom section */}
      <div className="flex justify-between items-center px-2 py-1 text-[10px]">
        <div className="text-black">
          <div className="line-through">Regular</div>
          <div className="line-through">${baseRetail.toFixed(2)}</div>
        </div>
        <div className="text-right">
          <div className="text-red-600 font-extrabold">YOU SAVE</div>
          <div className="text-red-600 font-extrabold">
            ${(baseRetail - tprRetail).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Barcode */}
      <div className="flex flex-col items-center py-2">
        <div className="text-[10px]">Barcode:</div>
        <div className="bg-white border border-black px-1 py-1 text-sm ">
          <Barcode
            displayValue={false}
            value={upc}
            height={40}
            width={1}
            fontSize={10}
          />
        </div>
      </div>
    </div>
  );
};

export default TPRLabel;
