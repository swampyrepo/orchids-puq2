export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push("Password minimal 8 karakter");
  }
  
  const symbols = password.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/g) || [];
  const uniqueSymbols = [...new Set(symbols)];
  if (uniqueSymbols.length < 2) {
    errors.push("Password harus memiliki minimal 2 simbol unik");
  }
  
  const numbers = password.match(/[0-9]/g) || [];
  if (numbers.length < 1) {
    errors.push("Password harus memiliki minimal 1 angka");
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export function getPasswordStrength(password: string): number {
  let strength = 0;
  
  if (password.length >= 8) strength += 25;
  if (password.length >= 12) strength += 10;
  
  const symbols = password.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/g) || [];
  const uniqueSymbols = [...new Set(symbols)];
  if (uniqueSymbols.length >= 1) strength += 15;
  if (uniqueSymbols.length >= 2) strength += 15;
  
  if (/[0-9]/.test(password)) strength += 15;
  if (/[a-z]/.test(password)) strength += 10;
  if (/[A-Z]/.test(password)) strength += 10;
  
  return Math.min(100, strength);
}
