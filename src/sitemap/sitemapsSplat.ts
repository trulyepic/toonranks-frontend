import type { LoaderFunctionArgs } from "react-router";
import { proxySitemap } from "./proxy";

// Resource route for /sitemaps/* (e.g. /sitemaps/series-1.xml, /sitemaps/forum-1.xml).
export const loader = ({ request }: LoaderFunctionArgs) =>
  proxySitemap(request);
