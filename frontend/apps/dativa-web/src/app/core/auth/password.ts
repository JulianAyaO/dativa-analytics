export function isStrongPassword(value: string): boolean {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export const PASSWORD_HINT =
  'Mínimo 8 caracteres, con al menos una letra y un número.';
