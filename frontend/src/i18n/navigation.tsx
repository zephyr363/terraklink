import {
  Link,
  NavLink,
  type LinkProps,
  type NavLinkProps,
} from "react-router-dom";
import { useTranslation, type Language } from ".";

export function languageHref(path: string, language: Language) {
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.startsWith("/admin") ||
    path.startsWith("/django-admin")
  )
    return path;
  const url = new URL(path, window.location.origin);
  if (language === "kk") url.searchParams.set("lang", "kk");
  else url.searchParams.delete("lang");
  return url.pathname + url.search + url.hash;
}
export function LocalizedLink(props: LinkProps) {
  const { language } = useTranslation();
  return (
    <Link
      {...props}
      to={
        typeof props.to === "string"
          ? languageHref(props.to, language)
          : props.to
      }
    />
  );
}
export function LocalizedNavLink(props: NavLinkProps) {
  const { language } = useTranslation();
  return (
    <NavLink
      {...props}
      to={
        typeof props.to === "string"
          ? languageHref(props.to, language)
          : props.to
      }
    />
  );
}
