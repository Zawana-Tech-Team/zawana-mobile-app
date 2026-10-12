import { parsePhoneNumberFromString, getCountryCallingCode, type CountryCode } from 'libphonenumber-js/max';

export function normalizePhone(value: string, countryCode = '+95') {
  if (!value.trim() || !/^[+\d\s().-]+$/.test(value) || !/^\+[1-9]\d{0,2}$/.test(countryCode)) return '';
  const country: CountryCode | undefined = countryCode === '+95' ? 'MM' : countryCode === '+66' ? 'TH' : countryCode === '+65' ? 'SG' : undefined;
  try {
    const input = value.trim().startsWith('+') ? value.trim()
      : country ? value.trim() : countryCode + value.replace(/[\s().-]/g, '').replace(/^0+/, '');
    const phone = parsePhoneNumberFromString(input, country ? { defaultCountry: country, extract: false } : { extract: false });
    if (!phone || !phone.isValid() || (phone.getType() !== 'MOBILE' && phone.getType() !== 'FIXED_LINE_OR_MOBILE')) return '';
    if (country && !value.trim().startsWith('+') && phone.countryCallingCode !== getCountryCallingCode(country)) return '';
    return phone.number;
  } catch { return ''; }
}

export function isPhone(value: string) {
  return Boolean(value.startsWith('+') && normalizePhone(value));
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) && value.length <= 254;
}

export function passwordRules(value: string) {
  return [value.length >= 8, /[A-Za-z]/.test(value) && /\d/.test(value), /[^A-Za-z0-9\s]/.test(value)] as const;
}

export function isDateOfBirth(value: string) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && date <= new Date() && date.getUTCFullYear() >= 1900;
}
