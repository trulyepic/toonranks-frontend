import type { LoaderFunctionArgs } from "react-router";
import { proxySitemap } from "./proxy";

// Resource route for /sitemap-static.xml.
export const loader = ({ request }: LoaderFunctionArgs) =>
  proxySitemap(request);
