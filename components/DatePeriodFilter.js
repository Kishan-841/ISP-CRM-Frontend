'use client';

import { useState, useMemo } from 'react';

// Indian Financial Year: Apr-Mar
// Q1: Apr-Jun, Q2: Jul-Sep, Q3: Oct-Dec, Q4: Jan-Mar

const getFinancialYears = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentFYStart = currentMonth < 3 ? currentYear - 1 : currentYear;
  const years = [];
  for (let y = currentFYStart; y >= currentFYStart - 4; y--) {
    years.push({ label: `FY ${y}-${(y + 1).toString().slice(2)}`, value: y });
  }
  return years;
};

const getQuarterDates = (quarter, fyStartYear) => {
  switch (quarter) {
    case 'Q1': return { start: `${fyStartYear}-04-01`, end: `${fyStartYear}-06-30` };
    case 'Q2': return { start: `${fyStartYear}-07-01`, end: `${fyStartYear}-09-30` };
    case 'Q3': return { start: `${fyStartYear}-10-01`, end: `${fyStartYear}-12-31` };
    case 'Q4': return { start: `${fyStartYear + 1}-01-01`, end: `${fyStartYear + 1}-03-31` };
    default: return null;
  }
};

const getFYDates = (fyStartYear) => ({
  start: `${fyStartYear}-04-01`,
  end: `${fyStartYear + 1}-03-31`
});

const getCurrentFYStart = () => {
  const now = new Date();
  return now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
};

const clampToToday = (dateStr) => {
  const today = new Date().toISOString().split('T')[0];
  return dateStr > today ? today : dateStr;
};

export default function DatePeriodFilter({ startDate, endDate, onDateChange }) {
  const [periodType, setPeriodType] = useState('CUSTOM');
  const [selectedFY, setSelectedFY] = useState(getCurrentFYStart());

  const financialYears = useMemo(() => getFinancialYears(), []);

  const handlePeriodSelect = (type) => {
    setPeriodType(type);
    if (type === 'CUSTOM') return;

    if (type === 'YEAR') {
      const dates = getFYDates(selectedFY);
      onDateChange(dates.start, clampToToday(dates.end));
    } else {
      const dates = getQuarterDates(type, selectedFY);
      if (dates) onDateChange(dates.start, clampToToday(dates.end));
    }
  };

  const handleFYChange = (fyYear) => {
    setSelectedFY(fyYear);
    if (periodType === 'YEAR') {
      const dates = getFYDates(fyYear);
      onDateChange(dates.start, clampToToday(dates.end));
    } else if (['Q1', 'Q2', 'Q3', 'Q4'].includes(periodType)) {
      const dates = getQuarterDates(periodType, fyYear);
      if (dates) onDateChange(dates.start, clampToToday(dates.end));
    }
  };

  const periods = [
    { key: 'Q1', label: 'Q1' },
    { key: 'Q2', label: 'Q2' },
    { key: 'Q3', label: 'Q3' },
    { key: 'Q4', label: 'Q4' },
    { key: 'YEAR', label: 'Full Year' },
    { key: 'CUSTOM', label: 'Custom' },
  ];

  return (
    <div className="flex flex-wrap items-end gap-2 sm:gap-3">
      {/* FY Selector */}
      <div className="min-w-0">
        <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Financial Year</label>
        <select
          value={selectedFY}
          onChange={(e) => handleFYChange(Number(e.target.value))}
          className="px-2.5 py-1.5 sm:py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white w-full"
        >
          {financialYears.map((fy) => (
            <option key={fy.value} value={fy.value}>{fy.label}</option>
          ))}
        </select>
      </div>

      {/* Period Buttons */}
      <div className="min-w-0">
        <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Period</label>
        <div className="flex gap-0.5 sm:gap-1">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => handlePeriodSelect(p.key)}
              className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                periodType === p.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Inputs */}
      {periodType === 'CUSTOM' && (
        <div className="flex items-end gap-2">
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onDateChange(e.target.value, endDate)}
              className="px-2.5 py-1.5 sm:py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white w-[130px] sm:w-[150px]"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onDateChange(startDate, e.target.value)}
              className="px-2.5 py-1.5 sm:py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white w-[130px] sm:w-[150px]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
