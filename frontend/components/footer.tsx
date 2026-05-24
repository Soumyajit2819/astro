import { Facebook, Instagram, Youtube } from "lucide-react";

export function Footer({
  brandName,
  instagram,
  youtube,
  facebook
}: {
  brandName: string;
  instagram: string;
  youtube: string;
  facebook: string;
}) {
  return (
    <footer className="border-t border-sage/10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 text-sm text-sage/70 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p>© 2026 {brandName}. Consultations, classes, and direct astrologer support.</p>
        <div className="flex items-center gap-4">
          <a href={youtube} target="_blank" rel="noreferrer" className="transition hover:text-sage">
            <Youtube className="h-5 w-5" />
          </a>
          <a href={facebook} target="_blank" rel="noreferrer" className="transition hover:text-sage">
            <Facebook className="h-5 w-5" />
          </a>
          <a href={instagram} target="_blank" rel="noreferrer" className="transition hover:text-sage">
            <Instagram className="h-5 w-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
