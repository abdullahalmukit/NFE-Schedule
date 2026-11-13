export const en = {
  "app.name": "NFE Schedule",
  "app.tagline": "Class routine · NFE Department, DIU",

  "lang.en": "English",
  "lang.bn": "বাংলা",
  "lang.label": "Language",

  "auth.step1": "Step 1 of 2",
  "auth.title": "Sign in",
  "auth.intro":
    "Your personal class routine from the department's official file, on the web and on your phone.",
  "auth.google": "Continue with Google",
  "auth.domainHint": "Use your {domains} email",
  "auth.firstTime": "Your first sign-in creates your account.",
  "auth.or": "or",
  "auth.emailCode": "Sign in with email code",
  "auth.emailLabel": "Email address",
  "auth.sendCode": "Send code",
  "auth.codeSent": "We sent a sign-in code to {email}.",
  "auth.codeLabel": "Code from the email",
  "auth.verify": "Sign in",
  "auth.changeEmail": "Use another email",
  "auth.guest": "Browse routine without signing in",
  "auth.errorGeneric": "Sign-in failed. Please try again.",
  "auth.errorCode": "That code is wrong or has expired.",
  "auth.errorOffline": "Signing in needs an internet connection.",
  "auth.signOut": "Sign out",

  "pending.title": "Waiting for approval",
  "pending.body":
    "Your account has been created. The department will approve it soon; this screen moves on by itself once it is approved.",
  "pending.signedInAs": "Signed in as {email}",
  "pending.browse": "Browse routines meanwhile",
  "pending.checkAgain": "Check again",
  "disabled.title": "Account not active",
  "disabled.body":
    "This account cannot use the app right now. Please contact the department office.",

  "home.guest": "You are browsing as a guest. Sign in for notices, exams and your own routine.",
  "home.signIn": "Sign in",
  "home.signedInAs": "Signed in as {email}",
  "home.pending": "Your account is waiting for approval.",
  "home.routineSoon": "Your routine will appear here after you choose your class.",
} as const;

export type MessageKey = keyof typeof en;
