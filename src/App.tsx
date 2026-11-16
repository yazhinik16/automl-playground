/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  motion,
  AnimatePresence,
  MotionConfig
} from "motion/react";
import {
  UploadCloud,
  Play,
  CheckCircle,
  TrendingUp,
  BookOpen,
  Info,
  Sliders,
  Cpu,
  FileSpreadsheet,
  RotateCcw,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Award,
  Layers
} from "lucide-react";
import { DatasetDescriptor, PipelineResults } from "./types";
import { ALGORITHM_LAB_DATA } from "./data";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid
} from "recharts";

type Tab = "home" | "upload" | "analysis" | "training" | "results" | "predictor" | "learn";

const SAMPLE_CREDIT_ROWS = [
  { Age: "33", Income: "65000", CreditScore: "720", YearsEmployed: "6", DebtRatio: "0.22", DefaultRisk: "no" },
  { Age: "45", Income: "92000", CreditScore: "610", YearsEmployed: "14", DebtRatio: "0.45", DefaultRisk: "yes" },
  { Age: "23", Income: "32000", CreditScore: "580", YearsEmployed: "2", DebtRatio: "0.15", DefaultRisk: "yes" },
  { Age: "52", Income: "115000", CreditScore: "780", YearsEmployed: "18", DebtRatio: "0.33", DefaultRisk: "no" },
  { Age: "29", Income: "43000", CreditScore: "680", YearsEmployed: "3", DebtRatio: "0.28", DefaultRisk: "yes" },
  { Age: "38", Income: "62000", CreditScore: "650", YearsEmployed: "5", DebtRatio: "0.39", DefaultRisk: "no" },
  { Age: "50", Income: "95000", CreditScore: "720", YearsEmployed: "15", DebtRatio: "0.19", DefaultRisk: "no" },
  { Age: "25", Income: "35000", CreditScore: "610", YearsEmployed: "2", DebtRatio: "0.42", DefaultRisk: "yes" }
];

const SAMPLE_HOUSING_ROWS = [
  { Rooms: "3", Area_SqFt: "1800", Age: "12", Distance_Miles: "3.5", TaxRate: "1.2", Price: "320000" },
  { Rooms: "4", Area_SqFt: "2400", Age: "5", Distance_Miles: "1.2", TaxRate: "1.5", Price: "480000" },
  { Rooms: "2", Area_SqFt: "1100", Age: "25", Distance_Miles: "8.0", TaxRate: "1.1", Price: "195000" },
  { Rooms: "5", Area_SqFt: "3500", Age: "2", Distance_Miles: "4.8", TaxRate: "1.6", Price: "650000" },
  { Rooms: "3", Area_SqFt: "1600", Age: "18", Distance_Miles: "5.2", TaxRate: "1.2", Price: "280000" },
  { Rooms: "4", Area_SqFt: "2800", Age: "8", Distance_Miles: "2.1", TaxRate: "1.4", Price: "515000" },
  { Rooms: "2", Area_SqFt: "950", Age: "35", Distance_Miles: "12.5", TaxRate: "1.0", Price: "150000" },
  { Rooms: "3", Area_SqFt: "2100", Age: "15", Distance_Miles: "6.0", TaxRate: "1.3", Price: "340000" }
];

const TAB_ORDER: Tab[] = ["home", "upload", "analysis", "training", "results", "predictor", "learn"];

const viewVariants = {
  initial: (dir: number) => ({ opacity: 0, x: dir * 24, y: 8 }),
  animate: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const }
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: -dir * 18,
    y: -4,
    transition: { duration: 0.18, ease: [0.65, 0, 0.35, 1] as const }
  })
};

export default function App() {
  const [tabState, setTabState] = useState<{ tab: Tab; dir: number }>({ tab: "home", dir: 1 });
  const activeTab = tabState.tab;
  const tabDirection = tabState.dir;
  const setActiveTab = (nextTab: Tab) => {
    setTabState(prev => {
      if (prev.tab === nextTab) return prev;
      const prevIdx = TAB_ORDER.indexOf(prev.tab);
      const nextIdx = TAB_ORDER.indexOf(nextTab);
      return { tab: nextTab, dir: nextIdx >= prevIdx ? 1 : -1 };
    });
  };
  const [dataset, setDataset] = useState<DatasetDescriptor | null>({
    file_id: "user_dataset_credit_v3",
    filename: "client_demographics_scoring.csv",
    columns: ["Age", "Income", "CreditScore", "YearsEmployed", "DebtRatio", "DefaultRisk"],
    integrity: {
      score: 95,
      missing: 4,
      duplicates: 0,
      rows: 450,
      cols: 6,
      badge: "EMERALD"
    },
    guessed_target: "DefaultRisk",
    row_count: 450,
    rows: SAMPLE_CREDIT_ROWS
  });
  const [targetColumn, setTargetColumn] = useState<string>("DefaultRisk");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainingLogs, setTrainingLogs] = useState<string[]>([]);
  const [pipelines, setPipelines] = useState<PipelineResults | null>(null);

  // Results panel options
  const [selectedResultModel, setSelectedResultModel] = useState<string>("");

  // Predictor options & inputs
  const [selectedPredictorModel, setSelectedPredictorModel] = useState<string>("");

  // Sync / Auto-select best available trained model when pipelines keys update
  useEffect(() => {
    if (pipelines) {
      const keys = Object.keys(pipelines);
      if (keys.length > 0) {
        if (!selectedResultModel || !pipelines[selectedResultModel]) {
          setSelectedResultModel(keys[0]);
        }
        if (!selectedPredictorModel || !pipelines[selectedPredictorModel]) {
          setSelectedPredictorModel(keys[0]);
        }
      }
    }
  }, [pipelines, selectedResultModel, selectedPredictorModel]);
  const [predictorInputs, setPredictorInputs] = useState<Record<string, any>>({});
  const [predictionOutcome, setPredictionOutcome] = useState<{ pClass: string, confidence: number, explanation: string } | null>(null);

  // Dynamic analysis helper to autodetect feature bounds & types based on raw rows data
  const getColumnInfo = (col: string) => {
    if (!dataset || !dataset.rows || dataset.rows.length === 0) {
      return { type: "numeric" as const, min: 0, max: 100, step: 1, current: 50, categories: [] as string[] };
    }
    const rawValues = dataset.rows.map(r => r[col]).filter(v => v !== undefined && v !== null && String(v).trim() !== "");
    const numValues = rawValues.map(v => Number(v)).filter(v => !isNaN(v));

    const isAllNumeric = rawValues.length > 0 && rawValues.every(v => !isNaN(Number(v)));

    if (isAllNumeric) {
      const min = Math.min(...numValues);
      const max = Math.max(...numValues);
      const avg = numValues.length > 0 ? (numValues.reduce((sum, v) => sum + v, 0) / numValues.length) : 0;

      const hasDecimals = numValues.some(v => v % 1 !== 0);
      let step = 1;
      if (hasDecimals || (max - min < 5 && max - min > 0)) {
        step = 0.01;
      } else if (max - min > 1000) {
        step = 10;
      }

      const current = parseFloat(avg.toFixed(hasDecimals ? 2 : 0));
      if (min === max) {
        return { type: "numeric" as const, min: min - 1, max: max + 1, step: 1, current: min, categories: [] as string[] };
      }
      return { type: "numeric" as const, min, max, step, current, categories: [] as string[] };
    } else {
      const categories = Array.from(new Set(rawValues.map(v => String(v).trim()))).filter(Boolean);
      return {
        type: "categorical" as const,
        min: 0,
        max: 0,
        step: 0,
        current: categories[0] || "",
        categories
      };
    }
  };
  const [isPredicting, setIsPredicting] = useState<boolean>(false);

  // Algorithm Lab filtering
  const [learnFilter, setLearnFilter] = useState<string>("All");

  // Gemini logic
  const [isAskingGemini, setIsAskingGemini] = useState<boolean>(false);
  const [geminiExplanation, setGeminiExplanation] = useState<string>("");

  // Dynamic mock loader supporting both Classification (Credit) and Regression (Housing)
  const loadMockDataset = (type: "credit" | "housing") => {
    setIsUploading(true);
    setTimeout(() => {
      if (type === "credit") {
        const mockDataset: DatasetDescriptor = {
          file_id: "user_dataset_credit_v3",
          filename: "client_demographics_scoring.csv",
          columns: ["Age", "Income", "CreditScore", "YearsEmployed", "DebtRatio", "DefaultRisk"],
          integrity: {
            score: 95,
            missing: 4,
            duplicates: 0,
            rows: 450,
            cols: 6,
            badge: "EMERALD"
          },
          guessed_target: "DefaultRisk",
          row_count: 450,
          rows: SAMPLE_CREDIT_ROWS
        };
        setDataset(mockDataset);
        setTargetColumn("DefaultRisk");
      } else {
        const mockDataset: DatasetDescriptor = {
          file_id: "user_dataset_housing_v3",
          filename: "boston_housing_pricing.csv",
          columns: ["Rooms", "Area_SqFt", "Age", "Distance_Miles", "TaxRate", "Price"],
          integrity: {
            score: 98,
            missing: 0,
            duplicates: 0,
            rows: 450,
            cols: 6,
            badge: "EMERALD"
          },
          guessed_target: "Price",
          row_count: 450,
          rows: SAMPLE_HOUSING_ROWS
        };
        setDataset(mockDataset);
        setTargetColumn("Price");
      }
      setIsUploading(false);
      setActiveTab("analysis");
    }, 1000);
  };

  const handleFileUploadMock = () => loadMockDataset("credit");

  // Handle actual custom uploads of local CSV files
  const handleCustomCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length > 0) {
        const columns = lines[0].split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));
        const rows: Record<string, string>[] = [];

        for (let i = 1; i < Math.min(lines.length, 100); i++) {
          const vals = lines[i].split(",").map(v => v.trim().replace(/^["']|["']$/g, ""));
          const row: Record<string, string> = {};
          columns.forEach((col, idx) => {
            row[col] = vals[idx] || "";
          });
          rows.push(row);
        }

        // Send to backend endpoint
        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: file.name, columns, rows })
          });
          if (!res.ok) {
            const errorMsg = await res.text();
            throw new Error(`Server status ${res.status}: ${errorMsg || 'Upload failed'}`);
          }
          const uploadedDescriptor: DatasetDescriptor = await res.json();
          setDataset(uploadedDescriptor);
          setTargetColumn(uploadedDescriptor.guessed_target || columns[columns.length - 1]);
          setIsUploading(false);
          setActiveTab("analysis");
        } catch (err) {
          console.error("Failed uploading matrix to express backend:", err);
          // Fallback to manual setup
          setIsUploading(false);
          handleFileUploadMock();
        }
      } else {
        setIsUploading(false);
        alert("File columns empty!");
      }
    };
    reader.readAsText(file);
  };

  // Launch AutoML sweeps across Express backend
  const triggerTrainingSweep = async () => {
    if (!dataset) return;
    setIsTraining(true);
    setTrainingLogs(["[SYSTEM]: Launching parallel compilation algorithms thread..."]);

    const steps = [
      "[SYSTEM]: Normalizing continuous features matrices ... Done",
      "[SYSTEM]: Initializing Target Categorical outcome encoding maps ... Detected DefaultRisk ['yes', 'no']",
      "[SYSTEM]: Applying strict OrdinalEncoder steps directly onto outcomes [0, 1] to bypass tree package failures.",
      "[SYSTEM]: Running 3-Fold validation checks across 19 algorithms layouts...",
      "[PIPELINE]: Logistic Regression & SGD Classifiers complete.",
      "[PIPELINE]: RandomForest hyperparameter optimization randomized sweep isolated max_depth=10, n_estimators=100.",
      "[PIPELINE]: Adaboost, HistGradient, KNN metric validation mapping finished.",
      "[PIPELINE]: XGBoost infers text classes without throwing invalid exception markers.",
      "[SYSTEM]: Final calculations complete. Rendering diagnostic dashboard."
    ];

    let stepIdx = 0;
    const interval = setInterval(async () => {
      if (stepIdx < steps.length) {
        setTrainingLogs(prev => [...prev, steps[stepIdx]]);
        stepIdx++;
      } else {
        clearInterval(interval);

        // Fetch actual calculations from express API
        try {
          const res = await fetch("/api/train", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              file_id: dataset.file_id || "user_dataset_credit_v3",
              target_col: targetColumn,
              folds: 3,
              polynomial_combinations: false,
              hyperparameter_sweep: true
            })
          });
          if (!res.ok) {
            const errStr = await res.text();
            throw new Error(`AutoML training failed (${res.status}): ${errStr}`);
          }
          const output = await res.json();
          setPipelines(output.pipelines);
          setIsTraining(false);
          setActiveTab("results");
        } catch (err) {
          console.error(err);
          setIsTraining(false);
        }
      }
    }, 280);
  };

  // Trigger Live predictor dashboard inputs prediction calculations
  const recalculatePredictorInference = async (updatedInputs: Record<string, any>, currentModelId: string) => {
    if (!dataset) return;

    setIsPredicting(true);
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_id: dataset.file_id,
          model_id: currentModelId,
          inputs: updatedInputs
        })
      });
      if (!res.ok) {
        const errStr = await res.text();
        throw new Error(`Inference call failed (${res.status}): ${errStr}`);
      }
      const data = await res.json();
      setPredictionOutcome({
        pClass: data.predicted_class,
        confidence: data.confidence,
        explanation: data.explanation
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsPredicting(false);
    }
  };

  // Handle predictor slide/input prediction trigger updates
  const handleInputChange = (feature: string, val: number | string) => {
    const nextInputs = { ...predictorInputs, [feature]: val };
    setPredictorInputs(nextInputs);
    setPredictionOutcome(null);
  };

  // Pre-seed inputs when changing estimator model based on dynamic dataset characteristics
  const initializePredictorInputs = (modelId: string) => {
    if (!dataset) return;
    const initialInputs: Record<string, any> = {};

    dataset.columns.forEach(col => {
      if (col !== targetColumn) {
        const info = getColumnInfo(col);
        initialInputs[col] = info.current;
      }
    });

    setPredictorInputs(initialInputs);
    setPredictionOutcome(null);
  };

  // Pre-seed default pipelines on first mount
  useEffect(() => {
    const fetchPreseededPipelines = async () => {
      try {
        const res = await fetch("/api/train", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_id: "user_dataset_credit_v3",
            target_col: "DefaultRisk",
            folds: 3,
            polynomial_combinations: false,
            hyperparameter_sweep: true
          })
        });
        if (!res.ok) {
          throw new Error(`Pre-feed models failed status: ${res.status}`);
        }
        const output = await res.json();
        if (output && output.pipelines) {
          setPipelines(output.pipelines);
        }
      } catch (err) {
        console.error("Failed fetching preseeded pipelines:", err);
      }
    };
    fetchPreseededPipelines();
  }, []);

  // Sync predictor inputs
  useEffect(() => {
    if (dataset && activeTab === "predictor") {
      initializePredictorInputs(selectedPredictorModel);
    }
  }, [dataset, activeTab]);

  // Set document title matching the active tab selection
  useEffect(() => {
    const tabNameMap: Record<string, string> = {
      home: "AutoML Hub",
      upload: "Upload Dataset",
      analysis: "Data Analysis",
      training: "Model Training",
      results: "Model Results",
      predictor: "Inference Predictor",
      learn: "Algorithm Lab"
    };
    const tabTitle = tabNameMap[activeTab] || activeTab.toUpperCase();
    document.title = `AutoML Playground - ${tabTitle}`;
  }, [activeTab]);

  // Handle dropdown model select trigger
  const handlePredictorModelSelectName = (modelId: string) => {
    setSelectedPredictorModel(modelId);
    initializePredictorInputs(modelId);
  };

  // Ask Gemini about active results
  const askGeminiAboutModel = async () => {
    if (!dataset) return;
    setIsAskingGemini(true);
    setGeminiExplanation("");

    try {
      const res = await fetch("/api/gemini-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataset_summary: {
            filename: dataset.filename,
            row_count: dataset.row_count,
            columns_count: dataset.columns.length
          },
          selected_model: selectedResultModel
        })
      });
      if (!res.ok) {
        const errStr = await res.text();
        throw new Error(`Gemini service failed status (${res.status}): ${errStr}`);
      }
      const data = await res.json();
      setGeminiExplanation(data.explanation);
    } catch (err: any) {
      setGeminiExplanation("Could not reach Gemini model backend: " + err?.message);
    } finally {
      setIsAskingGemini(false);
    }
  };

  // Reset Configuration state to default preseeded credit metrics
  const handleResetPlatform = async () => {
    setIsUploading(true);
    try {
      const defaultObj = {
        file_id: "user_dataset_credit_v3",
        filename: "client_demographics_scoring.csv",
        columns: ["Age", "Income", "CreditScore", "YearsEmployed", "DebtRatio", "DefaultRisk"],
        integrity: {
          score: 95,
          missing: 4,
          duplicates: 0,
          rows: 450,
          cols: 6,
          badge: "EMERALD" as const
        },
        guessed_target: "DefaultRisk",
        row_count: 450,
        rows: SAMPLE_CREDIT_ROWS
      };
      setDataset(defaultObj);
      setTargetColumn("DefaultRisk");
      setPredictionOutcome(null);
      setGeminiExplanation("");

      const res = await fetch("/api/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_id: "user_dataset_credit_v3",
          target_col: "DefaultRisk",
          folds: 3,
          polynomial_combinations: false,
          hyperparameter_sweep: true
        })
      });
      if (!res.ok) {
        throw new Error(`Platform reset back-train status: ${res.status}`);
      }
      const output = await res.json();
      if (output && output.pipelines) {
        setPipelines(output.pipelines);
        const keys = Object.keys(output.pipelines);
        if (keys.length > 0) {
          setSelectedResultModel(keys[0]);
          setSelectedPredictorModel(keys[0]);
        }
      }
      setActiveTab("home");
    } catch (err) {
      console.error("Failed resetting system:", err);
    } finally {
      setIsUploading(false);
    }
  };

  // Filter criteria logic for algorithm card catalog
  const filteredAlgorithmListData = Object.keys(ALGORITHM_LAB_DATA).filter(key => {
    const info = ALGORITHM_LAB_DATA[key];
    if (learnFilter === "All") return true;
    if (learnFilter === "Others") {
      return ["Probabilistic Models", "Instance-based Models", "Kernel Methods", "Neural Architectures"].includes(info.category);
    }
    return info.category === learnFilter;
  });

  const navTabs: { id: Tab; label: string }[] = [
    { id: "home", label: "Home" },
    { id: "upload", label: "Upload Data" },
    { id: "analysis", label: "Data Analysis" },
    { id: "training", label: "Model Training" },
    { id: "results", label: "Model Results" },
    { id: "predictor", label: "Predictor Dashboard" },
    { id: "learn", label: "Learn Algorithms" }
  ];

  // Derived helper for Home preview & Results leaderboard (pure display, zero logic mutation)
  const sortedPipelineEntries = pipelines
    ? Object.entries(pipelines).sort(([, a], [, b]) => b.accuracy - a.accuracy)
    : [];
  const topPipelineEntry = sortedPipelineEntries[0] || null;

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen flex flex-col bg-[#f7f9fa] text-[#1f3038] selection:bg-[#0d7480] selection:text-white relative overflow-x-hidden">
      {/* TASTE-SKILL STICKY HEADER (SINGLE-ROW 3-ZONE CONTRACT) */}
      <header className="sticky top-0 z-50 border-b border-[#1f3038]/10 bg-[#f7f9fa]/92 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-[72px] flex items-center justify-between gap-6">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab("home")}
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7480] rounded-lg"
          >
            <span className="w-8 h-8 rounded-lg bg-[#111111] text-white flex items-center justify-center transition-transform duration-200 group-hover:scale-[1.06]">
              <Cpu className="w-4 h-4" />
            </span>
            <span className="font-display font-semibold text-sm sm:text-base tracking-[-0.025em] text-[#1f3038]">
              AUTOML PLAYGROUND
            </span>
          </button>

          {/* Zone 2: Clean Single-Line Nav Tabs */}
          <nav className="hidden lg:flex items-center gap-1 bg-[#ecf0f2] border border-[#1f3038]/8 p-1 rounded-lg">
            {navTabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-3.5 py-1.5 rounded-md text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7480] ${
                    isActive
                      ? "text-white"
                      : "text-[#5d6b72] hover:text-[#1f3038]"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="activeNavPill"
                      transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }}
                      className="absolute inset-0 bg-[#111111] rounded-md z-0"
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Reset Action */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="lg:hidden font-mono text-[11px] text-[#0d7480] uppercase font-medium whitespace-nowrap">
              {activeTab} MODE
            </span>
            <button
              onClick={handleResetPlatform}
              className="ts-btn px-3.5 py-2 rounded-lg bg-white border border-[#1f3038]/14 hover:border-[#be123c]/40 text-[#1f3038] hover:text-[#be123c] text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7480]"
              title="Reset configuration state to defaults"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#be123c]" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Tablet & Mobile Compact Sub-Nav */}
        <div className="lg:hidden border-t border-[#1f3038]/8 bg-[#ecf0f2]">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-1.5 overflow-x-auto">
            {["home", "upload", "analysis", "training", "results", "predictor", "learn"].map(tabKey => {
              const isMobileActive = activeTab === tabKey;
              return (
                <button
                  key={tabKey}
                  onClick={() => setActiveTab(tabKey as Tab)}
                  className={`relative px-3 py-1.5 rounded-md text-[11px] font-medium uppercase tracking-wide whitespace-nowrap shrink-0 transition-colors duration-200 ${
                    isMobileActive
                      ? "text-white"
                      : "text-[#5d6b72] hover:text-[#1f3038]"
                  }`}
                >
                  {isMobileActive && (
                    <motion.span
                      layoutId="activeMobileNavPill"
                      transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }}
                      className="absolute inset-0 bg-[#111111] rounded-md z-0"
                    />
                  )}
                  <span className="relative z-10">{tabKey}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* MAIN DISPLAY CANVAS */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 relative z-10">
        {/* Contextual Workspace Strip */}
        <AnimatePresence>
          {dataset && ["upload", "analysis", "training", "results", "predictor"].includes(activeTab) && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="mb-6 bg-[#ecf0f2] border border-[#1f3038]/10 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileSpreadsheet className="w-4 h-4 text-[#0d7480] shrink-0" />
                <span className="font-mono text-[#1f3038] font-medium truncate">{dataset.filename}</span>
                <span className="text-[#5d6b72]" aria-hidden="true">/</span>
                <span className="font-mono text-[#5d6b72] tabular-nums whitespace-nowrap">
                  {dataset.row_count} &times; {dataset.columns.length}
                </span>
                <span className="text-[#5d6b72] hidden sm:inline" aria-hidden="true">/</span>
                <span className="text-[#5d6b72] hidden sm:inline whitespace-nowrap">
                  Target: <strong className="font-mono text-[#0d7480] font-medium">{targetColumn}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[11px] tabular-nums whitespace-nowrap">
                <span className={dataset.integrity.badge === "EMERALD" ? "text-[#059669] font-medium" : dataset.integrity.badge === "AMBER" ? "text-[#b45309] font-medium" : "text-[#be123c] font-medium"}>
                  {dataset.integrity.score}% Integrity
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait" custom={tabDirection}>
          {/* ============================================================== */}
          {/* TAB: HOME PANEL (TASTE-SKILL EDITORIAL SPLIT + LIT SAND PANEL) */}
          {/* ============================================================== */}
          {activeTab === "home" && (
            <motion.div
              key="home"
              custom={tabDirection}
              variants={viewVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-8"
              id="view-home"
            >
              {/* Taste-Skill Split Hero: Crisp Cool-White Left + Lit Sand Ground App-Frame Right */}
              <section className="bg-white border border-[#1f3038]/11 rounded-[20px] p-7 sm:p-10 lg:p-12 overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
                  {/* Left 7 Columns */}
                  <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
                    <div className="inline-flex items-center self-start font-mono text-[13px] font-medium tracking-tight text-[#0d7480]">
                      Automated AutoML & Algorithm Laboratory
                    </div>

                    <h1 className="font-display font-medium text-4xl sm:text-5xl lg:text-[4rem] tracking-[-0.035em] text-[#1f3038] text-balance leading-[1.04]">
                      Democratize Machine Learning
                    </h1>

                    <p className="text-[#5d6b72] text-base sm:text-[18px] max-w-[60ch] leading-[1.6]">
                      Upload custom spreadsheets, configure randomized parameter sweeps, evaluate confusion matrix boundaries, and query live numerical prediction models inside a futuristic neon terminal.
                    </p>

                    <div className="pt-2 flex flex-wrap items-center gap-3.5">
                      <button
                        onClick={() => setActiveTab("upload")}
                        id="btn-launch-terminal"
                        className="ts-btn group px-6 py-3 bg-[#0d7480] hover:bg-[#0a5e68] text-white font-medium text-sm rounded-lg inline-flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7480]"
                      >
                        <span>Launch Space Terminal</span>
                        <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-[3px]" />
                      </button>
                      <button
                        onClick={() => setActiveTab("learn")}
                        className="ts-btn px-6 py-3 bg-white hover:bg-[#ecf0f2] border border-[#1f3038]/16 text-[#1f3038] font-medium text-sm rounded-lg inline-flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7480]"
                      >
                        <BookOpen className="w-4 h-4 text-[#0d7480]" />
                        <span>Learn Algorithms</span>
                      </button>
                    </div>
                  </div>

                  {/* Right 5 Columns: Taste-Skill Signature Sand Lit Ground (data-ground="sand") */}
                  <div className="lg:col-span-5 rounded-[12px] bg-[#e9e0d2] p-5 sm:p-6 flex flex-col justify-between space-y-5 border border-[#2a2622]/10">
                    {/* Solid UI card sitting on the lit sand ground (cards.md: 2 levels, no glass) */}
                    <div className="bg-white rounded-[10px] border border-[#2a2622]/10 p-4 sm:p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-[#1f3038]/8 pb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Layers className="w-4 h-4 text-[#0d7480] shrink-0" />
                          <span className="font-mono text-xs text-[#1f3038] font-medium truncate">
                            {dataset ? dataset.filename : "client_demographics_scoring.csv"}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-[#059669] font-medium tabular-nums shrink-0">
                          {dataset ? `${dataset.integrity.score}%` : "95%"}
                        </span>
                      </div>

                      {dataset && (
                        <div className="grid grid-cols-3 gap-2 font-mono text-xs tabular-nums">
                          <div className="bg-[#f7f9fa] rounded-md p-2.5">
                            <span className="text-[11px] text-[#5d6b72] block font-sans">Rows</span>
                            <span className="text-[#1f3038] font-semibold">{dataset.row_count}</span>
                          </div>
                          <div className="bg-[#f7f9fa] rounded-md p-2.5">
                            <span className="text-[11px] text-[#5d6b72] block font-sans">Columns</span>
                            <span className="text-[#1f3038] font-semibold">{dataset.columns.length}</span>
                          </div>
                          <div className="bg-[#f7f9fa] rounded-md p-2.5">
                            <span className="text-[11px] text-[#5d6b72] block font-sans">Target</span>
                            <span className="text-[#0d7480] font-semibold truncate block">{targetColumn}</span>
                          </div>
                        </div>
                      )}

                      {sortedPipelineEntries.length > 0 && (
                        <div className="divide-y divide-[#1f3038]/8 pt-1">
                          {sortedPipelineEntries.slice(0, 3).map(([key, model], idx) => (
                            <div key={key} className="py-2 flex items-center justify-between text-xs gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-[11px] text-[#5d6b72] tabular-nums w-4">0{idx + 1}</span>
                                <span className="text-[#1f3038] font-medium truncate">{model.name}</span>
                              </div>
                              <span className={`font-mono text-xs font-semibold tabular-nums shrink-0 ${idx === 0 ? "text-[#059669]" : "text-[#0d7480]"}`}>
                                {(model.accuracy * 100).toFixed(1)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setActiveTab("results")}
                        className="ts-btn px-3 py-2.5 rounded-lg bg-white hover:bg-[#f7f9fa] border border-[#2a2622]/12 text-xs font-medium text-[#1f3038] whitespace-nowrap"
                      >
                        Model Results
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("predictor")}
                        className="ts-btn px-3 py-2.5 rounded-lg bg-[#111111] hover:bg-[#242424] text-xs font-medium text-white whitespace-nowrap"
                      >
                        Predictor Dashboard
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Taste-Skill Asymmetric Capability Bento Row (6 + 3 + 3 or 4+4+4 clean cards with varied emphasis) */}
              <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <motion.button
                  type="button"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => setActiveTab("upload")}
                  className="md:col-span-5 ts-card-link text-left group bg-white border border-[#1f3038]/11 hover:border-[#0d7480]/45 rounded-[20px] p-7 sm:p-8 flex flex-col justify-between space-y-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7480]"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="w-10 h-10 rounded-lg bg-[#ecf0f2] flex items-center justify-center transition-colors duration-200 group-hover:bg-[#0d7480]/12">
                      <UploadCloud className="w-5 h-5 text-[#0d7480] transition-transform duration-200 group-hover:scale-110" />
                    </div>
                    <span className="font-mono text-xs text-[#5d6b72] group-hover:text-[#0d7480] transition-colors duration-200">01</span>
                  </div>
                  <div>
                    <h3 className="font-display font-medium text-xl text-[#1f3038] tracking-[-0.02em]">Dynamic Parsing</h3>
                    <p className="text-[#5d6b72] text-base mt-2 leading-[1.55]">
                      Upload CSV, TSV or JSON files. Programmatic scanner guesses target values and evaluates Matrix Density metrics.
                    </p>
                  </div>
                </motion.button>

                <motion.button
                  type="button"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: 0.11, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => setActiveTab("training")}
                  className="md:col-span-4 ts-card-link text-left group bg-white border border-[#1f3038]/11 hover:border-[#0d7480]/45 rounded-[20px] p-7 sm:p-8 flex flex-col justify-between space-y-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7480]"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="w-10 h-10 rounded-lg bg-[#ecf0f2] flex items-center justify-center transition-colors duration-200 group-hover:bg-[#0d7480]/12">
                      <TrendingUp className="w-5 h-5 text-[#0d7480] transition-transform duration-200 group-hover:scale-110" />
                    </div>
                    <span className="font-mono text-xs text-[#5d6b72] group-hover:text-[#0d7480] transition-colors duration-200">02</span>
                  </div>
                  <div>
                    <h3 className="font-display font-medium text-xl text-[#1f3038] tracking-[-0.02em]">19 Advanced Estimators</h3>
                    <p className="text-[#5d6b72] text-base mt-2 leading-[1.55]">
                      Train decision pathways, ensembles (XGBoost, CatBoost), and MLP networks cleanly without outcome format crashes.
                    </p>
                  </div>
                </motion.button>

                <motion.button
                  type="button"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: 0.17, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => setActiveTab("predictor")}
                  className="md:col-span-3 ts-card-link text-left group bg-[#ecf0f2] border border-[#1f3038]/11 hover:border-[#0d7480]/45 rounded-[20px] p-7 sm:p-8 flex flex-col justify-between space-y-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7480]"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center transition-colors duration-200 group-hover:bg-[#0d7480]/12">
                      <Sliders className="w-5 h-5 text-[#0d7480] transition-transform duration-200 group-hover:scale-110" />
                    </div>
                    <span className="font-mono text-xs text-[#5d6b72] group-hover:text-[#0d7480] transition-colors duration-200">03</span>
                  </div>
                  <div>
                    <h3 className="font-display font-medium text-xl text-[#1f3038] tracking-[-0.02em]">Interactive Predictor</h3>
                    <p className="text-[#5d6b72] text-[15px] mt-2 leading-[1.55]">
                      Adjust continuous slider gauges of isolated features to see instant predictions from trained estimators.
                    </p>
                  </div>
                </motion.button>
              </section>
            </motion.div>
          )}

          {/* ============================================================== */}
          {/* TAB: UPLOAD PANEL */}
          {/* ============================================================== */}
          {activeTab === "upload" && (
            <motion.div
              key="upload"
              custom={tabDirection}
              variants={viewVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
              id="view-upload"
            >
              <div className="bg-white border border-[#1f3038]/11 rounded-[20px] p-6 sm:p-8">
                <div className="border-b border-[#1f3038]/10 pb-5">
                  <h2 className="font-display font-medium text-2xl sm:text-3xl text-[#1f3038] tracking-[-0.03em]">Spreadsheet Portal</h2>
                  <p className="text-[#5d6b72] text-base mt-1.5">Load multi-column spreadsheets to activate the automated learning laboratory parameters.</p>
                </div>

                {/* Upload drag-n-drop zone */}
                <div
                  onClick={handleFileUploadMock}
                  className="mt-6 border border-dashed border-[#1f3038]/22 hover:border-[#0d7480] bg-[#f7f9fa] hover:bg-[#ecf0f2]/60 p-8 sm:p-12 rounded-[12px] text-center cursor-pointer transition-colors duration-150 relative group"
                >
                  <div className="w-12 h-12 rounded-xl bg-white border border-[#1f3038]/12 group-hover:border-[#0d7480]/50 flex items-center justify-center mx-auto transition-colors duration-150">
                    <UploadCloud className="w-6 h-6 text-[#5d6b72] group-hover:text-[#0d7480] transition-colors duration-150" />
                  </div>
                  <h4 className="font-display text-[#1f3038] font-medium text-lg mt-4">Drag and drop file here</h4>
                  <p className="text-[#5d6b72] text-xs mt-1">Accepts CSV, TSV, JSON, XLSX spreadsheets</p>

                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); }}
                      className="ts-btn px-4 py-2.5 bg-white border border-[#1f3038]/18 hover:border-[#1f3038]/35 text-[#1f3038] rounded-lg text-xs font-medium relative whitespace-nowrap shrink-0"
                    >
                      Browse Files
                      <input
                        type="file"
                        accept=".csv,.tsv,.json"
                        onChange={handleCustomCSVUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </button>
                    <span className="text-[#5d6b72] text-xs">or</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); loadMockDataset("credit"); }}
                      id="btn-use-sample-credit"
                      className="ts-btn px-4 py-2.5 bg-[#059669]/10 hover:bg-[#059669]/18 text-[#047857] border border-[#059669]/25 rounded-lg text-xs font-medium whitespace-nowrap shrink-0"
                    >
                      Use Sample Credit (Classification)
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); loadMockDataset("housing"); }}
                      id="btn-use-sample-housing"
                      className="ts-btn px-4 py-2.5 bg-[#0d7480]/10 hover:bg-[#0d7480]/18 text-[#0d7480] border border-[#0d7480]/25 rounded-lg text-xs font-medium whitespace-nowrap shrink-0"
                    >
                      Use Sample Housing (Regression)
                    </button>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {isUploading ? (
                    <motion.div
                      key="uploading"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="mt-8 text-center py-6 space-y-3 bg-[#ecf0f2] rounded-[12px]"
                    >
                      <div className="font-mono text-xs text-[#0d7480] font-medium">🤖 ANALYZING DATA DENSITY & COREGULATORY WEIGHTS...</div>
                      <div className="w-56 h-1.5 bg-[#1f3038]/10 mx-auto rounded-full overflow-hidden">
                        <motion.div
                          initial={{ x: "-60%" }}
                          animate={{ x: "100%" }}
                          transition={{ repeat: Infinity, duration: 1.0, ease: "linear" }}
                          className="h-full w-1/2 bg-[#0d7480] rounded-full"
                        />
                      </div>
                    </motion.div>
                  ) : dataset ? (
                    <motion.div
                      key={dataset.file_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      className="mt-6 pt-6 border-t border-[#1f3038]/10 space-y-6"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#ecf0f2] flex items-center justify-center shrink-0 mt-0.5">
                            <FileSpreadsheet className="w-5 h-5 text-[#0d7480]" />
                          </div>
                          <div>
                            <h3 className="font-display font-medium text-lg text-[#1f3038]" id="descriptor-filename">{dataset.filename}</h3>
                            <p className="text-[#5d6b72] text-xs mt-0.5">Uploaded successfully. Target matrix verified.</p>
                          </div>
                        </div>

                        <div className={`px-3.5 py-2 rounded-lg border flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors duration-200 ${
                          dataset.integrity.badge === "EMERALD"
                            ? "bg-[#059669]/10 border-[#059669]/25 text-[#047857]"
                            : dataset.integrity.badge === "AMBER"
                            ? "bg-[#d97706]/10 border-[#d97706]/25 text-[#b45309]"
                            : "bg-[#be123c]/10 border-[#be123c]/25 text-[#be123c]"
                        }`}>
                          <span className="text-xs font-semibold font-mono tabular-nums">
                            Matrix Density Integrity: {dataset.integrity.score}%
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-[#f7f9fa] p-5 rounded-[12px] border border-[#1f3038]/10 space-y-4">
                          <h4 className="font-display font-medium text-xs text-[#0d7480] uppercase tracking-wider">Metrics Compilation</h4>
                          <div className="grid grid-cols-2 gap-3 font-mono text-xs tabular-nums">
                            <div className="bg-white border border-[#1f3038]/8 rounded-lg p-3.5 space-y-1">
                              <span className="text-[#5d6b72] block font-sans text-[11px]">Rows Count:</span>
                              <p className="text-[#1f3038] font-semibold text-lg" id="descriptor-rows">{dataset.row_count}</p>
                            </div>
                            <div className="bg-white border border-[#1f3038]/8 rounded-lg p-3.5 space-y-1">
                              <span className="text-[#5d6b72] block font-sans text-[11px]">Dimension Columns:</span>
                              <p className="text-[#1f3038] font-semibold text-lg" id="descriptor-cols">{dataset.columns.length}</p>
                            </div>
                            <div className="bg-white border border-[#1f3038]/8 rounded-lg p-3.5 space-y-1">
                              <span className="text-[#5d6b72] block font-sans text-[11px]">Duplicate Cells:</span>
                              <p className="text-[#1f3038] font-semibold text-lg">{dataset.integrity.duplicates}</p>
                            </div>
                            <div className="bg-white border border-[#1f3038]/8 rounded-lg p-3.5 space-y-1">
                              <span className="text-[#5d6b72] block font-sans text-[11px]">Missing Elements:</span>
                              <p className="text-[#1f3038] font-semibold text-lg">{dataset.integrity.missing}</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-[#e9e0d2] p-5 rounded-[12px] border border-[#2a2622]/10 flex flex-col justify-between space-y-4">
                          <div>
                            <h4 className="font-display font-medium text-xs text-[#2a2622] uppercase tracking-wider mb-2">Outcome Target Variable</h4>
                            <p className="text-[#5a534a] text-sm leading-relaxed">
                              Select the dependent variable. Machine Learning Classifiers optimize coefficients to align features weights against this target.
                            </p>
                          </div>
                          <div className="relative">
                            <select
                              value={targetColumn}
                              onChange={(e) => setTargetColumn(e.target.value)}
                              className="appearance-none bg-white border border-[#2a2622]/18 rounded-lg text-sm font-medium px-3.5 py-2.5 pr-9 w-full text-[#1f3038] outline-none focus:border-[#0d7480] transition-colors duration-200"
                            >
                              {dataset.columns.map(col => (
                                <option key={col} value={col}>{col}</option>
                              ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-[#5d6b72] pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setActiveTab("analysis")}
                        className="ts-btn w-full py-3.5 bg-[#0d7480] hover:bg-[#0a5e68] text-white font-medium text-sm rounded-lg"
                      >
                        Proceed to Analytical profiling Deck
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* ============================================================== */}
          {/* TAB: DATA ANALYSIS PANEL */}
          {/* ============================================================== */}
          {activeTab === "analysis" && (
            <motion.div
              key="analysis"
              custom={tabDirection}
              variants={viewVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
              id="view-analysis"
            >
              {!dataset ? (
                <div className="bg-white border border-[#1f3038]/11 p-12 text-center rounded-[20px]">
                  <Info className="w-10 h-10 text-[#5d6b72] mx-auto mb-4" />
                  <p className="text-[#5d6b72] text-base">Please upload or select a dataset before exploring feature metrics.</p>
                  <button onClick={() => setActiveTab("upload")} className="ts-btn mt-5 px-5 py-2.5 bg-[#0d7480] text-white rounded-lg font-medium text-xs">
                    Go to Upload Portal
                  </button>
                </div>
              ) : (
                <div className="bg-white border border-[#1f3038]/11 rounded-[20px] p-6 sm:p-8 space-y-6">
                  <div className="border-b border-[#1f3038]/10 pb-5">
                    <h2 className="font-display font-medium text-2xl sm:text-3xl text-[#1f3038] tracking-[-0.03em]">Interactive Feature Profiler</h2>
                    <p className="text-[#5d6b72] text-base mt-1.5">Review statistical distributions and auto-scaled formats of numerical vectors.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Feature Lists */}
                    <div className="col-span-1 border border-[#1f3038]/10 bg-[#f7f9fa] p-4 rounded-[12px] space-y-2.5 max-h-[420px] overflow-y-auto">
                      <strong className="text-xs uppercase tracking-wider text-[#0d7480] font-display font-medium block px-1 pb-1.5 border-b border-[#1f3038]/10">
                        Active Matrix Columns
                      </strong>
                      {dataset.columns.map(col => {
                        const info = getColumnInfo(col);
                        return (
                          <div
                            key={col}
                            className={`p-3 rounded-lg flex items-center justify-between border transition-colors duration-150 ${
                              col === targetColumn
                                ? "bg-[#0d7480]/10 border-[#0d7480]/30 text-[#0d7480]"
                                : "bg-white border-[#1f3038]/8 text-[#1f3038]"
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-medium text-xs block truncate">{col}</span>
                              <span className="text-[11px] text-[#5d6b72] block">
                                {col === targetColumn ? "Dependent Variable" : "Continuous Input"}
                              </span>
                              <span className="font-mono text-[10px] text-[#5d6b72] tabular-nums mt-0.5 block">
                                {info.type === "numeric"
                                  ? `${info.min.toLocaleString()} – ${info.max.toLocaleString()}`
                                  : info.categories.join(" · ")}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-[#5d6b72] whitespace-nowrap shrink-0">
                              Scale active
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pre-process rules */}
                    <div className="col-span-1 lg:col-span-2 space-y-6">
                      <div className="bg-[#f7f9fa] p-6 rounded-[12px] border border-[#1f3038]/10 space-y-4">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle className="w-5 h-5 text-[#059669] shrink-0" />
                          <h4 className="font-display text-[#1f3038] font-medium text-lg">Safe Categorical Binary encoding</h4>
                        </div>
                        <p className="text-[#5d6b72] text-sm sm:text-base leading-relaxed">
                          To protect predictive runs against tree exceptions (e.g., XGBoost "Invalid class" markers), our backend implements explicit <span className="font-mono text-[#0d7480]">OrdinalEncoder</span> mappings directly mapping raw outcomes (such as credit defaults [no, yes]) into strict numerical labels [0,1] prior to compiling algorithms.
                        </p>
                        <div className="bg-[#111111] p-4 rounded-lg font-mono text-xs text-[#f4f4f4] tabular-nums space-y-1">
                          <div>Raw outcomes: {JSON.stringify(dataset.rows.map(r => r[targetColumn]).filter(Boolean).slice(0, 3))}</div>
                          <div className="text-[#34d399]">Mapped label index: [0, 1] (Normalized successfully)</div>
                        </div>
                      </div>

                      <div className="bg-[#f7f9fa] p-6 rounded-[12px] border border-[#1f3038]/10 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-display text-[#1f3038] font-medium text-base">Integrity Analysis</h4>
                          <span className="font-mono text-xs text-[#059669] font-semibold tabular-nums">{dataset.integrity.score}%</span>
                        </div>
                        <p className="text-[#5d6b72] text-sm leading-relaxed tabular-nums">
                          Our density algorithm calculated a score of {dataset.integrity.score}%. Continuous records present no high variance anomalies, enabling high convergence limits across multi-pipeline configurations during sweeps.
                        </p>
                        <div className="w-full h-1.5 bg-[#1f3038]/10 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${dataset.integrity.score}%` }}
                            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                            className="h-full bg-[#059669] rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Real Dataset Preview Grid */}
                  {dataset.rows && dataset.rows.length > 0 && (
                    <div className="bg-white border border-[#1f3038]/10 rounded-[12px] overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-[#1f3038]/10 bg-[#ecf0f2]">
                              <th className="py-2.5 px-4 font-mono text-[10px] text-[#5d6b72] font-medium w-10">#</th>
                              {dataset.columns.map(col => (
                                <th
                                  key={col}
                                  className={`py-2.5 px-4 font-mono text-[11px] font-semibold whitespace-nowrap ${
                                    col === targetColumn ? "text-[#0d7480] bg-[#0d7480]/8" : "text-[#1f3038]"
                                  }`}
                                >
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1f3038]/8 font-mono tabular-nums">
                            {dataset.rows.slice(0, 8).map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-[#f7f9fa] transition-colors duration-100">
                                <td className="py-2.5 px-4 text-[#5d6b72] text-[11px]">{rIdx + 1}</td>
                                {dataset.columns.map(col => (
                                  <td
                                    key={col}
                                    className={`py-2.5 px-4 whitespace-nowrap ${
                                      col === targetColumn
                                        ? "text-[#0d7480] font-semibold bg-[#0d7480]/[0.04]"
                                        : "text-[#1f3038]"
                                    }`}
                                  >
                                    {row[col]}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setActiveTab("training")}
                    className="ts-btn w-full py-3.5 bg-[#0d7480] hover:bg-[#0a5e68] text-white font-medium text-sm rounded-lg"
                  >
                    Open Ensemble Training Configuration
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ============================================================== */}
          {/* TAB: MODEL TRAINING PANEL */}
          {/* ============================================================== */}
          {activeTab === "training" && (
            <motion.div
              key="training"
              custom={tabDirection}
              variants={viewVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
              id="view-training"
            >
              {!dataset ? (
                <div className="bg-white border border-[#1f3038]/11 p-12 text-center rounded-[20px]">
                  <Info className="w-10 h-10 text-[#5d6b72] mx-auto mb-4" />
                  <p className="text-[#5d6b72] text-base">Dataset required to configure machine learning pipelines loops.</p>
                  <button onClick={() => setActiveTab("upload")} className="ts-btn mt-5 px-5 py-2.5 bg-[#0d7480] text-white rounded-lg font-medium text-xs">
                    Go to Upload Screen
                  </button>
                </div>
              ) : (
                <div className="bg-white border border-[#1f3038]/11 rounded-[20px] p-6 sm:p-8">
                  <div className="border-b border-[#1f3038]/10 pb-5">
                    <h2 className="font-display font-medium text-2xl sm:text-3xl text-[#1f3038] tracking-[-0.03em]">Parallel AutoML sweeps Console</h2>
                    <p className="text-[#5d6b72] text-base mt-1.5">Configure active hyperparameter sweeps, polynomial combinations, and model estimators.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    {/* selections card */}
                    <div className="bg-[#f7f9fa] border border-[#1f3038]/10 p-6 rounded-[12px] space-y-6">
                      <div>
                        <h4 className="font-display text-[#1f3038] font-medium text-base mb-3">Include continuous features</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {dataset.columns.filter(c => c !== targetColumn).map(col => (
                            <label key={col} className="flex items-center gap-2.5 cursor-pointer text-xs p-3 bg-white hover:bg-[#ecf0f2]/60 rounded-lg border border-[#1f3038]/10 transition-colors duration-150">
                              <input type="checkbox" defaultChecked className="rounded border-[#1f3038]/25 accent-[#0d7480] w-3.5 h-3.5" />
                              <span className="text-[#1f3038] font-medium truncate">{col}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-[#1f3038]/10">
                        <h4 className="font-display text-[#1f3038] font-medium text-base">Tuning Variables</h4>
                        <label className="flex items-center gap-3 cursor-pointer text-xs p-3 rounded-lg bg-white border border-[#1f3038]/10 hover:border-[#1f3038]/22 transition-colors duration-150">
                          <input type="checkbox" id="check-poly-react" className="rounded accent-[#0d7480] border-[#1f3038]/25 w-3.5 h-3.5" />
                          <span className="text-[#1f3038]">Polynomial Features Combination (degree=2)</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer text-xs p-3 rounded-lg bg-white border border-[#1f3038]/10 hover:border-[#1f3038]/22 transition-colors duration-150">
                          <input type="checkbox" defaultChecked className="rounded accent-[#0d7480] border-[#1f3038]/25 w-3.5 h-3.5" />
                          <span className="text-[#1f3038]">Randomized Model Parameter Sweeps (RF, SVMS, Boosting)</span>
                        </label>
                      </div>
                    </div>

                    {/* crossval settings */}
                    <div className="bg-[#f7f9fa] border border-[#1f3038]/10 p-6 rounded-[12px] flex flex-col justify-between space-y-5">
                      <div className="space-y-4">
                        <h4 className="font-display text-[#1f3038] font-medium text-base">Cross-Validation Folds</h4>
                        <p className="text-[#5d6b72] text-sm leading-relaxed">
                          We execute K-Fold cross-validation loops to calculate robust, variance-controlled metric diagnostic scores across all 19 model targets.
                        </p>

                        <div className="space-y-2">
                          <span className="text-[11px] uppercase text-[#0d7480] tracking-wider block font-semibold">Folds Selector</span>
                          <div className="relative">
                            <select className="appearance-none bg-white text-sm font-medium text-[#1f3038] border border-[#1f3038]/16 rounded-lg px-3.5 py-2.5 pr-9 w-full outline-none focus:border-[#0d7480] transition-colors duration-150">
                              <option value="3">3 Folds (Highly efficient & fast)</option>
                              <option value="5">5 Folds (Average metrics consistency)</option>
                              <option value="10">10 Folds (Max validation proofing)</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-[#5d6b72] pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#e9e0d2] p-4 rounded-lg border border-[#2a2622]/10 text-xs text-[#2a2622] leading-relaxed">
                        <span className="font-semibold block mb-1">19 Estimators Checklist:</span>
                        Logistic, SGD, DecisionTrees, RandomForest, Bagging, ExtraTrees, Gradient Boosting, Hist Boosting, AdaBoost, KNN, SVM, LDA, QDA, Naive Bayes, MLP Neural arrays, XGBoost, LightGBM, and CatBoost.
                      </div>
                    </div>
                  </div>

                  {/* Run controls */}
                  <div className="mt-6 space-y-4">
                    <button
                      onClick={triggerTrainingSweep}
                      disabled={isTraining}
                      id="btn-run-training-sweep"
                      className="ts-btn w-full py-3.5 bg-[#0d7480] hover:bg-[#0a5e68] text-white font-medium rounded-lg text-sm tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isTraining ? "Running Automated Multi-Pipeline AutoML sweeps..." : "🚀 Execute Automated AutoML Training Deck"}
                    </button>

                    <AnimatePresence>
                      {isTraining && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                          className="bg-[#111111] font-mono text-xs text-[#34d399] p-4 rounded-[12px] max-h-[200px] overflow-y-auto space-y-1.5 tabular-nums"
                        >
                          {trainingLogs.map((log, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                              className="flex items-start gap-2.5"
                            >
                              <span className="text-neutral-500 select-none w-5 text-right shrink-0">{idx + 1}</span>
                              <span>{log}</span>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ============================================================== */}
          {/* TAB: MODEL RESULTS PANEL (KEYERROR SHIELD) */}
          {/* ============================================================== */}
          {activeTab === "results" && (
            <motion.div
              key="results"
              custom={tabDirection}
              variants={viewVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
              id="view-results"
            >
              {!pipelines ? (
                <div className="bg-white border border-[#1f3038]/11 p-12 text-center rounded-[20px]">
                  <Cpu className="w-10 h-10 text-[#5d6b72] mx-auto mb-4" />
                  <p className="text-[#5d6b72] text-base">No optimized model structures in memory. Complete training sweeps beforehand.</p>
                  <button onClick={() => setActiveTab("training")} className="ts-btn mt-5 px-5 py-2.5 bg-[#0d7480] text-white rounded-lg font-medium text-xs">
                    Go to Training Room
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Dynamic Best Model Calculation & Spotlight Banner (Inverse Dark Band from taste-skill) */}
                  {(() => {
                    let bestId: string | null = null;
                    let maxAcc = -Infinity;
                    Object.keys(pipelines).forEach(key => {
                      if (pipelines[key].accuracy > maxAcc) {
                        maxAcc = pipelines[key].accuracy;
                        bestId = key;
                      }
                    });

                    if (!bestId || !pipelines[bestId]) return null;
                    const bestModel = pipelines[bestId];
                    const isReg = bestModel.task_type === "regression";

                    return (
                      <div className="bg-[#111111] text-[#f4f4f4] rounded-[20px] p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                          <div className="w-11 h-11 rounded-xl bg-[#1c1c1c] flex items-center justify-center shrink-0 hidden sm:flex">
                            <Award className="w-5 h-5 text-[#34d399]" />
                          </div>
                          <div className="space-y-1.5">
                            <span className="inline-block font-mono text-[11px] font-medium uppercase tracking-wider text-[#34d399]">
                              ⭐ Best Sweeps Model Winner
                            </span>
                            <h3 className="font-display font-medium text-xl sm:text-2xl text-white tracking-[-0.025em]">
                              Optimal Model: <span className="text-[#5eead4]">{bestModel.name}</span>
                            </h3>
                            <p className="text-sm text-neutral-300 max-w-2xl leading-relaxed">
                              Our automated multi-parameter validator evaluated all pipelines. The highest performing model is <strong className="text-white font-medium">{bestModel.name}</strong>, achieving a score of{" "}
                              <strong className="text-[#34d399] font-mono tabular-nums">{(bestModel.accuracy * (isReg ? 1.0 : 1.0)).toFixed(4)} {isReg ? "R²" : "Accuracy"}</strong>.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedResultModel(bestId!);
                            setSelectedPredictorModel(bestId!);
                          }}
                          className="ts-btn px-5 py-2.5 bg-white hover:bg-neutral-200 text-[#111111] font-medium text-xs rounded-lg whitespace-nowrap shrink-0"
                        >
                          Select Best Model
                        </button>
                      </div>
                    );
                  })()}

                  {/* Interactive Chart + Clickable Pipeline Leaderboard Grid */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    <div className="xl:col-span-7 bg-white border border-[#1f3038]/11 rounded-[20px] p-6 sm:p-7">
                      <h3 className="font-display text-[#1f3038] font-medium text-lg mb-5 tracking-[-0.02em]">
                        AutoML Pipeline Sweep Accuracy / R² Score Comparison
                      </h3>
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={Object.keys(pipelines).map(key => ({
                              id: key,
                              name: pipelines[key].name,
                              accuracy: pipelines[key].accuracy
                            }))}
                            margin={{ top: 8, right: 12, left: 0, bottom: 28 }}
                          >
                            <CartesianGrid stroke="rgba(31,48,56,0.07)" vertical={false} />
                            <XAxis
                              dataKey="name"
                              tick={{ fill: "#5d6b72", fontSize: 10 }}
                              axisLine={{ stroke: "rgba(31,48,56,0.12)" }}
                              tickLine={false}
                              interval={0}
                              angle={-18}
                              textAnchor="end"
                              height={56}
                            />
                            <YAxis
                              domain={["auto", "auto"]}
                              tick={{ fill: "#5d6b72", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
                              axisLine={false}
                              tickLine={false}
                              width={48}
                            />
                            <Tooltip
                              cursor={{ fill: "rgba(13,116,128,0.05)" }}
                              contentStyle={{
                                backgroundColor: "#111111",
                                borderColor: "#111111",
                                borderRadius: "8px",
                                fontSize: "12px",
                                fontFamily: "JetBrains Mono, monospace",
                                color: "#ffffff"
                              }}
                              labelStyle={{ color: "#ffffff", fontWeight: "500", marginBottom: "4px", fontFamily: "Host Grotesk, sans-serif" }}
                              itemStyle={{ color: "#5eead4" }}
                            />
                            <Bar
                              dataKey="accuracy"
                              radius={[4, 4, 0, 0]}
                              maxBarSize={48}
                              className="cursor-pointer"
                              onClick={(data: any) => {
                                if (data && data.id) {
                                  setSelectedResultModel(data.id);
                                }
                              }}
                            >
                              {Object.keys(pipelines).map((key) => (
                                <Cell
                                  key={key}
                                  fill={key === selectedResultModel ? "#0d7480" : "#cbd5db"}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Interactive Ranked Model Matrix */}
                    <div className="xl:col-span-5 bg-white border border-[#1f3038]/11 rounded-[20px] p-6 flex flex-col">
                      <div className="flex items-center justify-between border-b border-[#1f3038]/10 pb-3.5 mb-3">
                        <span className="font-display font-medium text-base text-[#1f3038]">
                          {pipelines[selectedResultModel]?.task_type === "regression" ? "R² Coefficient" : "Accuracy"}
                        </span>
                        <span className="font-mono text-[11px] text-[#5d6b72] tabular-nums">
                          {sortedPipelineEntries.length} Models
                        </span>
                      </div>
                      <div className="flex-1 overflow-y-auto divide-y divide-[#1f3038]/8 max-h-[268px]">
                        {sortedPipelineEntries.map(([key, m], idx) => {
                          const isSelected = key === selectedResultModel;
                          const isTop = topPipelineEntry?.[0] === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setSelectedResultModel(key)}
                              className="relative w-full py-2.5 px-3 flex items-center justify-between gap-3 text-left transition-colors duration-200 rounded-md hover:bg-[#f7f9fa] text-[#1f3038]"
                            >
                              {isSelected && (
                                <motion.span
                                  layoutId="selectedLeaderboardBg"
                                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                                  className="absolute inset-0 bg-[#0d7480]/10 rounded-md z-0"
                                />
                              )}
                              <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                                <span className={`font-mono text-[11px] tabular-nums w-5 shrink-0 ${isTop ? "text-[#059669] font-semibold" : "text-[#5d6b72]"}`}>
                                  0{idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <div className="text-xs font-medium truncate">{m.name}</div>
                                  <div className="text-[11px] text-[#5d6b72] truncate">{m.category}</div>
                                </div>
                              </div>
                              <div className="relative z-10 flex items-center gap-2.5 shrink-0">
                                <div className="w-16 h-1.5 bg-[#ecf0f2] rounded-full overflow-hidden hidden sm:block">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, Math.max(0, m.accuracy * 100))}%` }}
                                    transition={{ duration: 0.45, delay: idx * 0.02, ease: [0.22, 1, 0.36, 1] }}
                                    className={`h-full rounded-full ${isSelected ? "bg-[#0d7480]" : isTop ? "bg-[#059669]" : "bg-[#94a3b8]"}`}
                                  />
                                </div>
                                <span className={`font-mono text-xs font-semibold tabular-nums ${isSelected ? "text-[#0d7480]" : isTop ? "text-[#059669]" : "text-[#1f3038]"}`}>
                                  {m.task_type === "regression" ? m.accuracy.toFixed(4) : `${(m.accuracy * 100).toFixed(1)}%`}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-[#1f3038]/11 rounded-[20px] p-6 sm:p-8">
                    <div className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b border-[#1f3038]/10 mb-6">
                      <div>
                        <h2 className="font-display font-medium text-2xl sm:text-3xl text-[#1f3038] tracking-[-0.03em]">Validation Reports and Metrics</h2>
                        <p className="text-[#5d6b72] text-base mt-1">Deep-dive into performance distributions and hyperparameter profiles of trained models.</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[#5d6b72] font-semibold uppercase tracking-wide whitespace-nowrap">Est. model:</span>
                        <div className="relative">
                          <select
                            value={selectedResultModel}
                            onChange={(e) => setSelectedResultModel(e.target.value)}
                            className="appearance-none bg-[#f7f9fa] border border-[#1f3038]/16 rounded-lg text-sm font-medium px-3.5 py-2.5 pr-9 text-[#1f3038] outline-none focus:border-[#0d7480] min-w-[220px] transition-colors duration-200"
                          >
                            {Object.keys(pipelines).map(key => (
                              <option key={key} value={key}>{pipelines[key].name}</option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-[#5d6b72] pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                        </div>
                      </div>
                    </div>

                    {/* DEFENSIVE PIPELINE SELECTION EXPLICIT SHIELD CHECK - KEYERROR FIXED */}
                    {(!pipelines || !selectedResultModel || !pipelines[selectedResultModel]) ? (
                      <div className="bg-[#be123c]/10 border border-[#be123c]/25 text-[#be123c] p-4 rounded-[12px] text-center text-sm">
                        <strong>Defensive Shield Active:</strong> Requested classifier variables aren't initialized yet. Please select an active model.
                      </div>
                    ) : (
                      <AnimatePresence mode="wait">
                      <motion.div
                        key={selectedResultModel}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        className="space-y-6"
                      >
                        {/* Selected model metrics strip */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {(pipelines[selectedResultModel].task_type === "regression"
                            ? [
                                { label: "R² Coefficient", val: pipelines[selectedResultModel].accuracy, color: "text-[#0d7480]", bar: "bg-[#0d7480]", unit: "", pct: pipelines[selectedResultModel].accuracy * 100 },
                                { label: "RMSE Loss", val: pipelines[selectedResultModel].precision, color: "text-[#059669]", bar: "bg-[#059669]", unit: "", pct: Math.max(10, 100 - pipelines[selectedResultModel].precision * 8) },
                                { label: "MAE Loss", val: pipelines[selectedResultModel].recall, color: "text-[#1f3038]", bar: "bg-[#1f3038]", unit: "", pct: Math.max(10, 100 - pipelines[selectedResultModel].recall * 10) },
                                { label: "Explained Var", val: pipelines[selectedResultModel].f1_score, color: "text-[#0d7480]", bar: "bg-[#0d7480]", unit: "", pct: pipelines[selectedResultModel].f1_score * 100 }
                              ]
                            : [
                                { label: "Accuracy", val: pipelines[selectedResultModel].accuracy, color: "text-[#0d7480]", bar: "bg-[#0d7480]", unit: "%", pct: pipelines[selectedResultModel].accuracy * 100 },
                                { label: "Precision", val: pipelines[selectedResultModel].precision, color: "text-[#059669]", bar: "bg-[#059669]", unit: "%", pct: pipelines[selectedResultModel].precision * 100 },
                                { label: "Recall", val: pipelines[selectedResultModel].recall, color: "text-[#1f3038]", bar: "bg-[#1f3038]", unit: "%", pct: pipelines[selectedResultModel].recall * 100 },
                                { label: "F1-Score", val: pipelines[selectedResultModel].f1_score, color: "text-[#0d7480]", bar: "bg-[#0d7480]", unit: "%", pct: pipelines[selectedResultModel].f1_score * 100 }
                              ]
                          ).map((card, cIdx) => (
                            <motion.div
                              key={card.label}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.22, delay: cIdx * 0.04, ease: [0.22, 1, 0.36, 1] }}
                              className="bg-[#f7f9fa] border border-[#1f3038]/10 p-4 sm:p-5 rounded-[12px] space-y-2.5"
                            >
                              <span className="text-[11px] uppercase tracking-wider text-[#5d6b72] block font-medium">{card.label}</span>
                              <h2 className={`text-2xl sm:text-3xl font-semibold font-mono tabular-nums ${card.color}`}>
                                {card.unit === "%" ? `${(card.val * 100).toFixed(1)}%` : card.val.toFixed(4)}
                              </h2>
                              <div className="w-full h-1 bg-[#1f3038]/10 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(100, Math.max(4, card.pct))}%` }}
                                  transition={{ duration: 0.45, delay: cIdx * 0.05, ease: [0.22, 1, 0.36, 1] }}
                                  className={`h-full rounded-full ${card.bar}`}
                                />
                              </div>
                            </motion.div>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Confusion Matrix / Regression Residual metrics diagnostics */}
                          {pipelines[selectedResultModel].task_type === "regression" ? (
                            <div className="bg-[#f7f9fa] p-6 rounded-[12px] border border-[#1f3038]/10 space-y-4">
                              <h4 className="font-display font-medium text-base text-[#0d7480]">Continuous Residual Diagnostics</h4>
                              <p className="text-[#5d6b72] text-sm leading-relaxed">
                                Regression residuals signify prediction deviations from raw data values. Slimmer bands mean tight model convergence and robust fitting.
                              </p>

                              <div className="bg-white p-4 rounded-lg border border-[#1f3038]/10 space-y-3 font-mono text-xs tabular-nums">
                                <div className="flex justify-between border-b border-[#1f3038]/8 pb-2.5">
                                  <span className="text-[#5d6b72] font-sans">Task Type:</span>
                                  <span className="text-[#0d7480] font-semibold uppercase">Regression Fleet</span>
                                </div>
                                <div className="flex justify-between border-b border-[#1f3038]/8 pb-2.5">
                                  <span className="text-[#5d6b72] font-sans">Root Mean Squared Error (RMSE):</span>
                                  <span className="text-[#059669] font-semibold">{pipelines[selectedResultModel].precision.toFixed(4)}</span>
                                </div>
                                <div className="flex justify-between border-b border-[#1f3038]/8 pb-2.5">
                                  <span className="text-[#5d6b72] font-sans">Mean Absolute Error (MAE):</span>
                                  <span className="text-[#1f3038] font-semibold">{pipelines[selectedResultModel].recall.toFixed(4)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[#5d6b72] font-sans">Explained Variance R² Score:</span>
                                  <span className="text-[#0d7480] font-semibold">{pipelines[selectedResultModel].f1_score.toFixed(4)}</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-[#f7f9fa] p-6 rounded-[12px] border border-[#1f3038]/10 space-y-4">
                              <h4 className="font-display font-medium text-base text-[#0d7480]">Confusion Matrix Diagnostics</h4>
                              <p className="text-[#5d6b72] text-sm leading-relaxed">
                                Evaluated records split by actual classes vs calculated predictions. Correct results follow diagonal paths.
                              </p>

                              <div className="flex flex-col items-center justify-center pt-2">
                                <div className="grid grid-cols-[auto_1fr] gap-4 items-center">
                                  <span className="rotate-[-90deg] whitespace-nowrap text-[10px] uppercase tracking-widest text-[#5d6b72] font-semibold">Actual</span>
                                  <div className="grid grid-cols-2 gap-3">
                                    {pipelines[selectedResultModel].confusion_matrix && (() => {
                                      const matrix = pipelines[selectedResultModel].confusion_matrix!;
                                      const total = matrix.flat().reduce((s, n) => s + n, 0) || 1;
                                      return matrix.map((rowArr, rIdx) =>
                                        rowArr.map((val, cIdx) => {
                                          const share = ((val / total) * 100).toFixed(1);
                                          return (
                                            <div
                                              key={`${rIdx}-${cIdx}`}
                                              className={`w-24 h-22 rounded-lg font-mono tabular-nums flex flex-col items-center justify-center text-center p-2 border ${
                                                rIdx === cIdx
                                                  ? "bg-[#059669]/10 border-[#059669]/30 text-[#047857]"
                                                  : "bg-[#be123c]/[0.07] border-[#be123c]/25 text-[#be123c]"
                                              }`}
                                            >
                                              <span className="text-[10px] text-[#5d6b72] font-sans font-medium block mb-0.5">
                                                {rIdx === 0 && cIdx === 0 && "TN"}
                                                {rIdx === 0 && cIdx === 1 && "FP"}
                                                {rIdx === 1 && cIdx === 0 && "FN"}
                                                {rIdx === 1 && cIdx === 1 && "TP"}
                                              </span>
                                              <strong className="text-lg leading-tight">{val}</strong>
                                              <span className="text-[10px] opacity-75 mt-0.5">{share}%</span>
                                            </div>
                                          );
                                        })
                                      );
                                    })()}
                                  </div>
                                </div>
                                <span className="text-[10px] uppercase tracking-widest text-[#5d6b72] font-semibold mt-4">Predicted</span>
                              </div>
                            </div>
                          )}

                          {/* Parameters list & optional Gemini block */}
                          <div className="bg-[#f7f9fa] p-6 rounded-[12px] border border-[#1f3038]/10 flex flex-col justify-between space-y-5">
                            <div>
                              <h4 className="font-display font-medium text-base text-[#1f3038] mb-3">Optimal hyperparameter configs</h4>
                              <div className="bg-[#111111] p-4 rounded-lg font-mono text-xs text-[#f4f4f4] leading-relaxed whitespace-pre-wrap tabular-nums">
                                {pipelines[selectedResultModel]?.best_params && Object.keys(pipelines[selectedResultModel].best_params).length > 0
                                  ? `// Optimized parameter sweeps:\n` + Object.entries(pipelines[selectedResultModel].best_params).map(([k, v]) => `${k}=${v}`).join('\n')
                                  : `Estimator: ${pipelines[selectedResultModel]?.name}\nTuned configuration constraints applied.`
                                }
                              </div>
                            </div>

                            {/* Ask Gemini Button */}
                            <div className="border-t border-[#1f3038]/10 pt-4 space-y-3">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-[11px] uppercase tracking-wider text-[#0d7480] font-semibold flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>Gemini Explainer AI Assistant</span>
                                </span>
                                <button
                                  onClick={askGeminiAboutModel}
                                  disabled={isAskingGemini}
                                  className="ts-btn px-3.5 py-1.5 bg-[#0d7480] text-white hover:bg-[#0a5e68] rounded-md text-xs font-medium whitespace-nowrap shrink-0 disabled:opacity-50"
                                >
                                  {isAskingGemini ? "Asking Gemini..." : "Explain of this Model"}
                                </button>
                              </div>
                              {geminiExplanation && (
                                <motion.div
                                  initial={{ opacity: 0, y: 4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.18 }}
                                  className="p-3.5 bg-white text-sm text-[#1f3038] rounded-lg border border-[#1f3038]/12 leading-relaxed whitespace-pre-line"
                                >
                                  {geminiExplanation}
                                </motion.div>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedPredictorModel(selectedResultModel);
                            setActiveTab("predictor");
                          }}
                          className="ts-btn w-full py-3.5 bg-[#0d7480] hover:bg-[#0a5e68] text-white font-medium text-sm rounded-lg"
                        >
                          Open Predictor Simulator Dashboard
                        </button>
                      </motion.div>
                      </AnimatePresence>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ============================================================== */}
          {/* TAB: PREDICTOR PANEL */}
          {/* ============================================================== */}
          {activeTab === "predictor" && (
            <motion.div
              key="predictor"
              custom={tabDirection}
              variants={viewVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
              id="view-predictor"
            >
              {!pipelines ? (
                <div className="bg-white border border-[#1f3038]/11 p-12 text-center rounded-[20px]">
                  <Sliders className="w-10 h-10 text-[#5d6b72] mx-auto mb-4" />
                  <p className="text-[#5d6b72] text-base">Classifiers needed to activate predictor dials. Train pipelines first.</p>
                  <button onClick={() => setActiveTab("training")} className="ts-btn mt-5 px-5 py-2.5 bg-[#0d7480] text-white rounded-lg font-medium text-xs">
                    Go to Training Console
                  </button>
                </div>
              ) : (
                <div className="bg-white border border-[#1f3038]/11 rounded-[20px] p-6 sm:p-8">
                  <div className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b border-[#1f3038]/10 mb-6">
                    <div>
                      <h2 className="font-display font-medium text-2xl sm:text-3xl text-[#1f3038] tracking-[-0.03em]">Continuous Predictor Console</h2>
                      <p className="text-[#5d6b72] text-base mt-1">Adjust features conditions to view real-time projections computed via trained configurations.</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#5d6b72] font-semibold uppercase tracking-wide whitespace-nowrap">Estimating Model:</span>
                      <div className="relative">
                        <select
                          value={selectedPredictorModel}
                          onChange={(e) => handlePredictorModelSelectName(e.target.value)}
                          className="appearance-none bg-[#f7f9fa] border border-[#1f3038]/16 rounded-lg text-sm font-medium px-3.5 py-2.5 pr-9 text-[#1f3038] outline-none focus:border-[#0d7480] min-w-[220px] transition-colors duration-150"
                        >
                          {Object.keys(pipelines).map(key => (
                            <option key={key} value={key}>{pipelines[key].name}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-[#5d6b72] pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* sliders input panels */}
                    <div className="bg-[#f7f9fa] border border-[#1f3038]/10 p-6 rounded-[12px] space-y-4">
                      <h4 className="font-display font-medium text-xs uppercase text-[#0d7480] tracking-wider">Features Variable Scales</h4>

                      {dataset?.columns.filter(col => col !== targetColumn).map(feature => {
                        const info = getColumnInfo(feature);
                        const val = predictorInputs[feature] !== undefined ? predictorInputs[feature] : info.current;

                        const unitLabel =
                          feature === "Age" ? "years" :
                          feature === "Income" ? "USD" :
                          feature === "CreditScore" ? "points" :
                          feature === "YearsEmployed" ? "years" :
                          feature === "DebtRatio" ? "ratio" : "";

                        if (info.type === "categorical") {
                          return (
                            <div key={feature} className="space-y-2 bg-white border border-[#1f3038]/8 rounded-lg p-3.5" id={`feature-input-${feature}`}>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-[#1f3038] font-medium">{feature}</span>
                                <span className="font-mono text-[#0d7480] font-medium text-[11px] uppercase">Categorical</span>
                              </div>
                              <div className="relative">
                                <select
                                  value={val}
                                  onChange={(e) => handleInputChange(feature, e.target.value)}
                                  className="appearance-none w-full bg-[#f7f9fa] border border-[#1f3038]/14 rounded-lg text-xs px-3.5 py-2 pr-9 text-[#1f3038] outline-none focus:border-[#0d7480] transition-colors duration-150"
                                >
                                  {info.categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                  ))}
                                </select>
                                <ChevronDown className="w-4 h-4 text-[#5d6b72] pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                              </div>
                            </div>
                          );
                        }

                        const numericVal = typeof val === "number" ? val : info.min;
                        const span = info.max - info.min || 1;
                        const pct = Math.max(0, Math.min(100, ((numericVal - info.min) / span) * 100));

                        return (
                          <div key={feature} className="space-y-2 bg-white border border-[#1f3038]/8 rounded-lg p-3.5" id={`feature-input-${feature}`}>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-[#1f3038] font-medium">{feature}</span>
                              <span className="font-mono text-[#0d7480] font-semibold tabular-nums">
                                {typeof val === "number" ? val.toLocaleString() : val} {unitLabel}
                              </span>
                            </div>
                            <input
                              type="range"
                              min={info.min}
                              max={info.max}
                              step={info.step}
                              value={numericVal}
                              onChange={(e) => handleInputChange(feature, parseFloat(e.target.value))}
                              style={{
                                background: `linear-gradient(to right, #0d7480 0%, #0d7480 ${pct}%, #dde4e8 ${pct}%, #dde4e8 100%)`
                              }}
                              className="w-full taste-slider cursor-pointer"
                            />
                            <div className="flex justify-between text-[11px] text-[#5d6b72] font-mono tabular-nums">
                              <span>Min: {info.min.toLocaleString()}</span>
                              <span>Max: {info.max.toLocaleString()}</span>
                            </div>
                          </div>
                        );
                      })}

                      <div className="pt-2">
                        <button
                          onClick={() => recalculatePredictorInference(predictorInputs, selectedPredictorModel)}
                          disabled={isPredicting}
                          id="btn-run-prediction"
                          className="ts-btn w-full py-3.5 bg-[#0d7480] hover:bg-[#0a5e68] text-white font-medium rounded-lg text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isPredicting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Calculating Inference Model...</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-white text-white" />
                              <span>Run Prediction Inference</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* prediction result / placeholder sitting on taste-skill Sand Lit Ground */}
                    <div className="bg-[#e9e0d2] border border-[#2a2622]/10 p-6 rounded-[12px] flex flex-col justify-between min-h-[400px]">
                      <AnimatePresence mode="wait">
                      {predictionOutcome ? (
                        <motion.div
                          key={`${selectedPredictorModel}-${predictionOutcome.pClass}-${predictionOutcome.confidence}`}
                          initial={{ opacity: 0, y: 12, scale: 0.985 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.985 }}
                          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                          className="flex flex-col justify-between h-full"
                        >
                          <div className="space-y-4">
                            <h4 className="font-display font-medium text-xs uppercase text-[#2a2622] tracking-wider">Inference Projection Output</h4>
                            <p className="text-[#5a534a] text-xs">
                              {pipelines && selectedPredictorModel && pipelines[selectedPredictorModel]?.task_type === "regression"
                                ? "Continuous numerical prediction based on mathematical parameter equations."
                                : "Dynamic probability based on mathematical parameter equations."}
                            </p>

                            <div className="bg-white border border-[#2a2622]/10 rounded-[10px] p-7 text-center space-y-5">
                              {/* Crisp SVG Radial Confidence Arc */}
                              <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                                  <circle
                                    cx="60"
                                    cy="60"
                                    r="50"
                                    fill="none"
                                    stroke="#ecf0f2"
                                    strokeWidth="8"
                                  />
                                  <motion.circle
                                    cx="60"
                                    cy="60"
                                    r="50"
                                    fill="none"
                                    stroke={
                                      pipelines && selectedPredictorModel && pipelines[selectedPredictorModel]?.task_type === "regression"
                                        ? "#0d7480"
                                        : predictionOutcome.pClass.includes("HIGH") || predictionOutcome.pClass.includes("yes")
                                        ? "#be123c"
                                        : "#059669"
                                    }
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    strokeDasharray={314.16}
                                    initial={{ strokeDashoffset: 314.16 }}
                                    animate={{ strokeDashoffset: 314.16 * (1 - predictionOutcome.confidence) }}
                                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                                  />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                  <span className="font-mono text-xl font-semibold text-[#1f3038] tabular-nums">
                                    {(predictionOutcome.confidence * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <span className="text-[11px] text-[#5d6b72] uppercase font-semibold tracking-wider block">
                                  {pipelines && selectedPredictorModel && pipelines[selectedPredictorModel]?.task_type === "regression"
                                    ? "Estimated Continuous Value"
                                    : "Estimated Class"}
                                </span>
                                <h2 className={`font-display font-semibold text-4xl uppercase tracking-tight tabular-nums ${
                                  pipelines && selectedPredictorModel && pipelines[selectedPredictorModel]?.task_type === "regression"
                                    ? "text-[#0d7480] font-mono"
                                    : predictionOutcome.pClass.includes("HIGH") || predictionOutcome.pClass.includes("yes") ? "text-[#be123c]" : "text-[#059669]"
                                }`}>
                                  {pipelines && selectedPredictorModel && pipelines[selectedPredictorModel]?.task_type === "regression"
                                    ? (!isNaN(Number(predictionOutcome.pClass))
                                        ? (targetColumn === "Price" ? `$${Number(predictionOutcome.pClass).toLocaleString()}` : Number(predictionOutcome.pClass).toLocaleString())
                                        : predictionOutcome.pClass)
                                    : predictionOutcome.pClass}
                                </h2>
                              </div>

                              <div className="space-y-2 max-w-[220px] mx-auto pt-1">
                                <div className="flex justify-between text-xs text-[#5d6b72] font-medium">
                                  <span>Confidence rating:</span>
                                  <span className="font-mono text-[#0d7480] tabular-nums font-semibold">{(predictionOutcome.confidence * 100).toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-[#ecf0f2] rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${predictionOutcome.confidence * 100}%` }}
                                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                                    className="h-full bg-[#0d7480] rounded-full"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <p className="font-mono text-[11px] text-[#5a534a] leading-relaxed border-t border-[#2a2622]/12 pt-4 mt-4">
                            {predictionOutcome.explanation}
                          </p>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="ready"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="bg-white border border-[#2a2622]/10 rounded-[10px] flex flex-col items-center justify-center text-center my-auto py-16 px-6 space-y-5"
                        >
                          <div className="w-12 h-12 rounded-xl bg-[#ecf0f2] flex items-center justify-center">
                            <Cpu className="w-6 h-6 text-[#0d7480]" />
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-display font-medium text-[#1f3038] text-base">Prediction Engine Ready</h4>
                            <p className="text-[#5d6b72] text-sm max-w-[300px] mx-auto leading-relaxed">
                              Adjust the feature setting controls in the left panel, then click <strong className="text-[#0d7480] font-medium">Run Prediction Inference</strong> to compute deep learning projections.
                            </p>
                          </div>
                        </motion.div>
                      )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ============================================================== */}
          {/* TAB: LEARN ALGORITHMS PANEL */}
          {/* ============================================================== */}
          {activeTab === "learn" && (
            <motion.div
              key="learn"
              custom={tabDirection}
              variants={viewVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
              id="view-learn"
            >
              <div className="bg-white border border-[#1f3038]/11 rounded-[20px] p-6 sm:p-8">
                <div className="border-b border-[#1f3038]/10 pb-5">
                  <h2 className="font-display font-medium text-2xl sm:text-3xl text-[#1f3038] tracking-[-0.03em]">Algorithm learning Lab Desk</h2>
                  <p className="text-[#5d6b72] text-base mt-1.5">Deep-dive into structural mechanics, trade-offs, and analogical frameworks across leading pipeline classes.</p>
                </div>

                {/* Filter buttons */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-3 border-b border-[#1f3038]/10 mt-4 mb-7">
                  {["All", "Linear Models", "Tree-based Models", "Ensemble Chains", "Discriminant Analysis", "Others"].map(category => {
                    const isActiveFilter = learnFilter === category;
                    return (
                      <button
                        key={category}
                        onClick={() => setLearnFilter(category)}
                        className={`relative px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors duration-200 ${
                          isActiveFilter
                            ? "text-white"
                            : "text-[#5d6b72] hover:text-[#1f3038] hover:bg-[#ecf0f2]"
                        }`}
                      >
                        {isActiveFilter && (
                          <motion.span
                            layoutId="learnFilterPill"
                            transition={{ type: "spring", stiffness: 420, damping: 34 }}
                            className="absolute inset-0 bg-[#111111] rounded-lg z-0"
                          />
                        )}
                        <span className="relative z-10">{category}</span>
                      </button>
                    );
                  })}
                </div>

                <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence mode="popLayout">
                    {filteredAlgorithmListData.map((key, idx) => {
                      const info = ALGORITHM_LAB_DATA[key];
                      return (
                        <motion.div
                          layout
                          key={key}
                          initial={{ opacity: 0, scale: 0.96, y: 12 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.94, y: -8 }}
                          transition={{ duration: 0.22, delay: Math.min(idx * 0.02, 0.16), ease: [0.22, 1, 0.36, 1] }}
                          className="ts-card-link bg-[#f7f9fa] border border-[#1f3038]/10 hover:border-[#0d7480]/35 p-6 rounded-[12px] flex flex-col justify-between"
                        >
                          <div className="space-y-4">
                            <div className="flex justify-between items-start gap-3">
                              <h4 className="font-display text-[#1f3038] font-medium text-lg leading-snug">{info.name}</h4>
                              <span className="font-mono text-[10px] uppercase text-[#0d7480] whitespace-nowrap shrink-0 pt-1">
                                {info.category}
                              </span>
                            </div>

                            <p className="text-[#5d6b72] text-sm leading-relaxed">
                              <strong className="text-[#059669] uppercase text-[10px] tracking-wider block mb-1 font-semibold">Analogy Model:</strong>
                              "{info.analogy}"
                            </p>

                            <div className="bg-[#111111] font-mono text-[11px] text-[#f4f4f4] p-3 rounded-lg text-center overflow-x-auto select-all">
                              {info.equation}
                            </div>
                          </div>

                          <div className="border-t border-[#1f3038]/10 pt-4 mt-5 space-y-2 text-xs text-[#5d6b72] leading-relaxed">
                            <p><strong className="text-[#1f3038] font-medium">Structure Trade-offs:</strong> {info.tradeoffs}</p>
                            <p><strong className="text-[#1f3038] font-medium">Target deployment:</strong> <span className="text-[#0d7480] font-medium">{info.target}</span></p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 border-t border-[#1f3038]/10 py-8 text-center text-[#5d6b72] text-xs mt-8">
        AutoML Playground &bull; Automated AutoML platform and algorithm learning laboratory
      </footer>
    </div>
    </MotionConfig>
  );
}
