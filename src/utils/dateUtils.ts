/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Holidays list in MM-DD format for fixed national holidays
const FIXED_HOLIDAYS = [
  "01-01", // Ano Novo
  "04-21", // Tiradentes
  "05-01", // Dia do Trabalho
  "09-07", // Independência
  "10-12", // Nossa Senhora Aparecida
  "11-02", // Finados
  "11-15", // Proclamação da República
  "12-25", // Natal
];

// Corpus Christi variable dates
const MOBILE_HOLIDAYS_BY_YEAR: Record<string, string[]> = {
  "2025": ["2025-06-19"], // Corpus Christi 2025
  "2026": ["2026-06-04"], // Corpus Christi 2026
};

/**
 * Checks if a given date is a holiday or a Sunday
 */
export function isDateBlocked(dateStr: string): { blocked: boolean; reason?: string } {
  const date = new Date(dateStr + "T12:00:00"); // avoid tz shifts
  const dayOfWeek = date.getDay();

  if (dayOfWeek === 0) {
    return { blocked: true, reason: "Domingo - CD Fechado" };
  }

  const mmDd = dateStr.slice(5); // "MM-DD"
  const year = dateStr.slice(0, 4); // "YYYY"

  if (FIXED_HOLIDAYS.includes(mmDd)) {
    return { blocked: true, reason: "Feriado Nacional" };
  }

  if (MOBILE_HOLIDAYS_BY_YEAR[year]?.includes(dateStr)) {
    return { blocked: true, reason: "Corpus Christi (Feriado)" };
  }

  return { blocked: false };
}

/**
 * Gets a formatted Brazilian date string (e.g. "Segunda-feira, 08/06/2026")
 */
export function formatFriendlyDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T12:00:00");
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  };
  const formatted = date.toLocaleDateString("pt-BR", options);
  // Capitalize first letter
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Formats date as DD/MM
 */
export function formatDayMonth(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}

/**
 * Generates the list of allowed dates (tomorrow up to 30 days ahead)
 */
export function getAvailableDates(): { value: string; label: string }[] {
  const dates: { value: string; label: string }[] = [];
  const today = new Date();
  
  for (let i = 1; i <= 30; i++) {
    const nextDate = new Date();
    nextDate.setDate(today.getDate() + i);
    
    const year = nextDate.getFullYear();
    const month = String(nextDate.getMonth() + 1).padStart(2, "0");
    const day = String(nextDate.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    
    const check = isDateBlocked(dateStr);
    if (!check.blocked) {
      dates.push({
        value: dateStr,
        label: formatFriendlyDate(dateStr),
      });
    }
  }
  
  return dates;
}

/**
 * Array of predefined 1-hour time slots from 06h00 to 18h00 (last entry 17h00)
 */
export const TIME_SLOTS = [
  "06:00 - 07:00",
  "07:00 - 08:00",
  "08:00 - 09:00",
  "09:00 - 10:00",
  "10:00 - 11:00",
  "11:00 - 12:00",
  "12:00 - 13:00",
  "13:00 - 14:00",
  "14:00 - 15:00",
  "15:00 - 16:00",
  "16:00 - 17:00",
  "17:00 - 18:00",
];
