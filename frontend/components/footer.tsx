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
    <footer className="border-t border-gold/15 bg-[linear-gradient(180deg,rgba(247,241,227,0.5),rgba(239,230,209,0.75))]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 text-sm text-sage/80 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p>© 2026 {brandName}. Consultations, classes, and direct astrologer support.</p>
        <div className="flex items-center gap-4">
          <a href={youtube} target="_blank" rel="noreferrer" className="transition hover:text-gold">
            <Youtube className="h-5 w-5" />
          </a>
          <a href={facebook} target="_blank" rel="noreferrer" className="transition hover:text-gold">
            <Facebook className="h-5 w-5" />
          </a>
          <a href={instagram} target="_blank" rel="noreferrer" className="transition hover:text-gold">
            <Instagram className="h-5 w-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
