export function normalizeNumber(input: string, type: 'supplier' | 'pos'): string {
    // Remove any whitespace and leading zeroes
    // const num  = input.replace(/^0+/, '');
    const num  = input.replace(/\s+/g, '').replace(/\D/g, '').replace(/^0+/, '');
    console.log({num, type})
    return num 
  }
  
//   export  function isNumberMatch(num1: string, num2: string): boolean {
//     return normalizeNumber(num1) === normalizeNumber(num2);
//   }