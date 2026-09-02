import { format, isValid, parseISO } from "date-fns";

export const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** Stored dates are ISO strings; readers should never see one raw. */
export const formatDate = (value: string) => {
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, "d MMM yyyy") : value;
};
