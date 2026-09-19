import NepaliDate from 'nepali-date-converter';

export interface NepaliMonthInfo {
  index: number; // 0 to 11 (0 = Baishakh, 11 = Chaitra)
  name: string; // 'Baishakh'
  nepaliName: string; // 'बैशाख'
  shortName: string; // 'Bai'
}

export const NEPALI_MONTHS: NepaliMonthInfo[] = [
  { index: 0, name: 'Baishakh', nepaliName: 'बैशाख', shortName: 'Bai' },
  { index: 1, name: 'Jestha', nepaliName: 'जेठ', shortName: 'Jes' },
  { index: 2, name: 'Ashadh', nepaliName: 'असार', shortName: 'Ash' },
  { index: 3, name: 'Shrawan', nepaliName: 'साउन', shortName: 'Shr' },
  { index: 4, name: 'Bhadra', nepaliName: 'भाद्र', shortName: 'Bha' },
  { index: 5, name: 'Ashwin', nepaliName: 'असोज', shortName: 'Asw' },
  { index: 6, name: 'Kartik', nepaliName: 'कात्तिक', shortName: 'Kar' },
  { index: 7, name: 'Mangsir', nepaliName: 'मंसिर', shortName: 'Man' },
  { index: 8, name: 'Poush', nepaliName: 'पुष', shortName: 'Pou' },
  { index: 9, name: 'Magh', nepaliName: 'माघ', shortName: 'Mag' },
  { index: 10, name: 'Falgun', nepaliName: 'फागुन', shortName: 'Fal' },
  { index: 11, name: 'Chaitra', nepaliName: 'चैत', shortName: 'Cha' },
];

export const toYMDString = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const getCurrentNepaliDate = (): { year: number; month: number; day: number } => {
  try {
    const nd = new NepaliDate(new Date());
    return {
      year: nd.getYear(),
      month: nd.getMonth(),
      day: nd.getDate(),
    };
  } catch (e) {
    return { year: 2082, month: 0, day: 1 };
  }
};

export const getAvailableNepaliYears = (): number[] => {
  const currentYear = getCurrentNepaliDate().year;
  const years: number[] = [];
  for (let y = currentYear - 6; y <= currentYear + 3; y++) {
    years.push(y);
  }
  return years;
};

export const getNepaliMonthRange = (
  year: number,
  monthIndex: number
): { start: string; end: string; days: number; label: string; subLabel: string } => {
  const safeMonthIdx = Math.max(0, Math.min(11, monthIndex));
  const monthInfo = NEPALI_MONTHS[safeMonthIdx] || NEPALI_MONTHS[0];

  // First day: 1st of this month
  const firstDay = new NepaliDate(year, safeMonthIdx, 1).toJsDate();
  // Last day: day 0 of the next month
  const lastDay = new NepaliDate(year, safeMonthIdx + 1, 0).toJsDate();

  const startStr = toYMDString(firstDay);
  const endStr = toYMDString(lastDay);

  const days = Math.max(1, Math.round((lastDay.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const sFormat = firstDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const eFormat = lastDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return {
    start: startStr,
    end: endStr,
    days,
    label: `${monthInfo.name} ${year} BS`,
    subLabel: `${sFormat} – ${eFormat}`,
  };
};

export const getNepaliYearRange = (
  year: number
): { start: string; end: string; days: number; label: string; subLabel: string } => {
  // Baishakh 1
  const firstDay = new NepaliDate(year, 0, 1).toJsDate();
  // Chaitra end (day 0 of next Baishakh)
  const lastDay = new NepaliDate(year + 1, 0, 0).toJsDate();

  const startStr = toYMDString(firstDay);
  const endStr = toYMDString(lastDay);

  const days = Math.max(1, Math.round((lastDay.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const sFormat = firstDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const eFormat = lastDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return {
    start: startStr,
    end: endStr,
    days,
    label: `Year ${year} BS`,
    subLabel: `${sFormat} – ${eFormat}`,
  };
};

export const getPreviousNepaliMonth = (year: number, monthIndex: number) => {
  if (monthIndex <= 0) {
    return { year: year - 1, monthIndex: 11 };
  }
  return { year, monthIndex: monthIndex - 1 };
};

export const getNextNepaliMonth = (year: number, monthIndex: number) => {
  if (monthIndex >= 11) {
    return { year: year + 1, monthIndex: 0 };
  }
  return { year, monthIndex: monthIndex + 1 };
};
