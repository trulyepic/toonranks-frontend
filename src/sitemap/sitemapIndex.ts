import type { LoaderFunctionArgs } from "react-router";
import { proxySitemap } from "./proxy";

// Resource route for /sitemap.xml (no component export = raw Response returned).
export const loader = ({ request }: LoaderFunctionArgs) =>
  proxySitemap(request);
