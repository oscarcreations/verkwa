export const SUPERADMIN_EMAILS = [
  "flowboard.team@gmail.com",
  "getfoundro@gmail.com"
];

export const isPrimarySuperadmin = (email: string | undefined) => {
  return email ? SUPERADMIN_EMAILS.includes(email) : false;
};
