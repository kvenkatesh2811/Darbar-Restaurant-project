import { useEffect, useState } from "react";
import QRCodeLib from "qrcode";
import { Download, Printer, QrCode as QrCodeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Production-safe site URL — mirrors the pattern App.tsx uses for logoImageUrl. */
export function getSiteUrl(path = "/"): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${window.location.origin}${basePath}${cleanPath}`;
}

interface RestaurantQRCodeProps {
  /** Path (relative to the site root) the QR code should open. Defaults to the homepage. */
  path?: string;
  size?: number;
  title?: string;
  subtitle?: string;
  className?: string;
  /** Show download/print action buttons below the code. */
  showActions?: boolean;
  fileName?: string;
}

/**
 * Reusable QR code card pointing at a page on the live site (never localhost).
 * Regenerates automatically whenever the target URL changes since the
 * underlying data URL is derived, not cached across sessions.
 */
export function RestaurantQRCode({
  path = "/",
  size = 200,
  title,
  subtitle,
  className,
  showActions = true,
  fileName = "darbar-restaurant-qr.png",
}: RestaurantQRCodeProps) {
  const [dataUrl, setDataUrl] = useState("");
  const targetUrl = getSiteUrl(path);

  useEffect(() => {
    let cancelled = false;
    QRCodeLib.toDataURL(targetUrl, {
      width: size * 2,
      margin: 2,
      color: { dark: "#7c2d12", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch((err) => console.error("Failed to generate QR code", err));
    return () => {
      cancelled = true;
    };
  }, [targetUrl, size]);

  const handlePrint = () => {
    const win = window.open("", "_blank", "width=420,height=560");
    if (!win) return;
    win.document.write(`
      <html>
        <head><title>Darbar Restaurant — QR Code</title></head>
        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;">
          <img src="${dataUrl}" style="width:280px;height:280px;" />
          <p style="margin-top:16px;font-size:14px;color:#444;">${targetUrl}</p>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      {title && <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">{title}</h4>}
      <div
        className="bg-white p-3 rounded-xl shadow-sm border border-border inline-flex items-center justify-center"
        style={{ width: size + 24, height: size + 24 }}
      >
        {dataUrl ? (
          <img src={dataUrl} alt="Scan to visit Darbar Restaurant online" width={size} height={size} />
        ) : (
          <QrCodeIcon className="h-10 w-10 text-muted-foreground/40 animate-pulse" />
        )}
      </div>
      {subtitle && <p className="text-xs text-muted-foreground mt-3 max-w-[220px]">{subtitle}</p>}
      {showActions && (
        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={!dataUrl} data-testid="button-print-qr">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" size="sm" asChild disabled={!dataUrl} data-testid="button-download-qr">
            <a href={dataUrl} download={fileName}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
