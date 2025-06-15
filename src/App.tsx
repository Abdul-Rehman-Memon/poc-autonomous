import { useState } from "react";
import MatchingFile from "./components/MatchingFile";
import LabelGeneration from "./components/LabelGeneration";

const App = () => {
  const [activeTab, setActiveTab] = useState<"matching" | "label">("matching");

  return (
    <div className="p-6 font-sans">
      {/* Tab Buttons */}
      <div className="mb-4 flex space-x-4">
        <button
          onClick={() => setActiveTab("matching")}
          className={`px-4 py-2 rounded-md transition duration-200 ${
            activeTab === "matching"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          Matching File
        </button>

        <button
          onClick={() => setActiveTab("label")}
          className={`px-4 py-2 rounded-md transition duration-200 ${
            activeTab === "label"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          Label Generation
        </button>
      </div>

      {/* Tab Content */}
      <div className="border rounded-md p-4 shadow-sm bg-white">
        {activeTab === "matching" ? <MatchingFile /> : <LabelGeneration />}
      </div>
    </div>
  );
};

export default App;
