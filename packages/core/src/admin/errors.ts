import type { MessageKey } from "../i18n/en";

/** Database messages from the admin functions → translated text keys. */
const KNOWN: [RegExp, MessageKey][] = [
  [/^Only the main administrator/, "admins.err.notMain"],
  [/at least one area|^Unknown area/, "admins.err.areas"],
  [/valid email/, "admins.err.email"],
  [/is the main administrator|already the main administrator/, "admins.err.isMain"],
  [/^Not an active admin/, "admins.err.notAdmin"],
  [/No open invite/, "admins.err.noInvite"],
  [/signed-up, active account/, "admins.err.account"],
];

export function adminErrorKey(message: string | null | undefined): MessageKey {
  if (message) for (const [re, key] of KNOWN) if (re.test(message)) return key;
  return "admins.err.generic";
}
