/** Accept only same-site paths ("/x"), never "//host" or absolute URLs. */
export function safeRedirect(value: string | undefined): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}
