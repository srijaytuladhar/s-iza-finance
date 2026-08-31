export const formatNumber = (value: number, customSymbol = ''): string => {
  if (value === undefined || value === null || isNaN(value)) return '0.00';
  
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  
  const fixed = absValue.toFixed(2);
  const parts = fixed.split('.');
  const numStr = parts[0];
  const decimalStr = parts[1];

  let formatted = '';
  if (numStr.length <= 3) {
    formatted = numStr;
  } else {
    const lastThree = numStr.substring(numStr.length - 3);
    const remaining = numStr.substring(0, numStr.length - 3);
    
    let grouped = '';
    let i = remaining.length;
    while (i > 0) {
      if (i >= 2) {
        grouped = ',' + remaining.substring(i - 2, i) + grouped;
        i -= 2;
      } else {
        grouped = ',' + remaining.substring(0, i) + grouped;
        i = 0;
      }
    }
    if (grouped.startsWith(',')) {
      grouped = grouped.substring(1);
    }
    formatted = grouped + ',' + lastThree;
  }

  const result = `${isNegative ? '-' : ''}${formatted}.${decimalStr}`;
  
  if (customSymbol) {
    return `${customSymbol} ${result}`;
  }
  return result;
};
