import {
  Backpack,
  CoatHanger,
  Coffee,
  Eyeglasses,
  Headphones,
  Hoodie,
  Keyboard,
  Package,
  Pants,
  Sneaker,
  Tote,
  TShirt,
  Watch,
  Yarn,
} from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import { originCodes } from "@/lib/format";

export const GLYPHS = {
  tshirt: TShirt,
  hoodie: Hoodie,
  pants: Pants,
  coat: CoatHanger,
  yarn: Yarn,
  sneaker: Sneaker,
  headphones: Headphones,
  keyboard: Keyboard,
  eyeglasses: Eyeglasses,
  watch: Watch,
  tote: Tote,
  backpack: Backpack,
  coffee: Coffee,
  package: Package,
} as const;
export const PLATES = ["sage", "cobalt", "smoke", "mint", "butter", "clay", "stone", "rust"] as const;

type PlateDrop = {
  item: string;
  category: string;
  glyph: string;
  plate: string;
  imageUrl: string | null;
  spec: string;
  origin: string;
};

/**
 * The drop's visual. Brand photography when supplied; otherwise a printed
 * "specimen plate" — category, origin codes, a large glyph and the spec line —
 * rather than a fake product render.
 */
export function SpecimenPlate({
  drop,
  stamp,
  size = "lg",
  priority = false,
  className = "",
}: {
  drop: PlateDrop;
  stamp?: { text: string; tone: "go" | "hot" | "mute" } | null;
  size?: "sm" | "lg";
  priority?: boolean;
  className?: string;
}) {
  const Glyph = GLYPHS[drop.glyph as keyof typeof GLYPHS] ?? Package;
  const plate = PLATES.includes(drop.plate as (typeof PLATES)[number]) ? drop.plate : "stone";
  return (
    <div className={`plate plate-${plate} ${className}`}>
      {drop.imageUrl ? (
        <Image
          src={drop.imageUrl}
          alt={drop.item}
          fill
          priority={priority}
          sizes={size === "lg" ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 80vw"}
          className="object-cover"
        />
      ) : (
        <Glyph
          aria-hidden
          weight="duotone"
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[46%] -rotate-6 ${size === "lg" ? "w-[62%] h-[62%]" : "w-[58%] h-[58%]"}`}
        />
      )}
      <div className={`absolute inset-x-0 top-0 flex justify-between gap-3 label ${size === "lg" ? "p-5" : "p-3.5"}`}>
        <span>{drop.category}</span>
        <span>{originCodes(drop.origin)}</span>
      </div>
      {!drop.imageUrl && drop.spec ? (
        <p className={`absolute inset-x-0 bottom-0 label ${size === "lg" ? "p-5" : "p-3.5"} line-clamp-2`}>{drop.spec}</p>
      ) : null}
      {stamp ? (
        <span className={`stamp stamp-${stamp.tone} absolute ${size === "lg" ? "right-5 top-14 text-sm" : "right-3 top-10"}`}>{stamp.text}</span>
      ) : null}
    </div>
  );
}
