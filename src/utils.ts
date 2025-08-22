import { format, parse, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Utility functions shared across the application. Keeping these helpers in
 * a separate module prevents circular dependencies between components.
 */

/**
 * Formats a number as BRL currency with two decimal places.
 *
 * @param value Numeric value to format.
 * @returns A string representing the formatted currency.
 */
export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

/**
 * Attempts to parse a date string and return it formatted as dd/MM/yyyy.
 * Supports both ISO (yyyy-MM-dd) and dd/MM/yyyy input.
 *
 * @param date A date string.
 * @returns A formatted date string, or the original input if parsing fails.
 */
export const formatDate = (date: string) => {
  try {
    // Try parsing as dd/MM/yyyy first
    const parsedDate = parse(date, 'dd/MM/yyyy', new Date());
    if (!isNaN(parsedDate.getTime())) {
      return format(parsedDate, 'dd/MM/yyyy', { locale: ptBR });
    }
    // Fallback to ISO parsing
    return format(parseISO(date), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return date;
  }
};