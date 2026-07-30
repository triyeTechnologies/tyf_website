IMAGES
══════════════════════════════════════════════════════════════════════════

Drop files here with these exact names and they take over their slot on the
page automatically. Anything missing keeps its coloured placeholder, which
prints the filename and the shot you need — so the site looks deliberate
while you are still shooting.

showcase/ — the try-on looks  (IN USE)
──────────────────────────────────────────────────────────────────────────
Seven complete looks, each three files. These are live on the site now.

  showcase/look-N-person.webp    the model in their own clothes
  showcase/look-N-garment.webp   the garment on its own
  showcase/look-N-result.webp    the TyF output

  N runs 1 to 7. All are 3:4 portraits, around 386x517.

  Where each one appears:
    look-1  hero comparison slider (person -> result), the garment beside it,
            and the three "how it works" steps — one look, told twice
    look-2  through look-7 — the results gallery, each output showing the
            person and garment it came from

  Adding an eighth look: copy a gallery <figure> in the RESULTS section of
  index.html and change the 7 to an 8. Nothing else needs touching.

  These were PNGs totalling 3.06 MB. Re-encoded as WebP at quality 82 they
  come to 0.23 MB — 93% smaller, with no visible difference. Export
  replacements as WebP too; a PNG here costs about ten times its worth.

in use
──────────────────────────────────────────────────────────────────────────
  app.webp               928 x 1152   app screen · PRODUCT section
  team-akhilesh.webp    640 x 640    headshot
  team-akshay.webp      640 x 640    headshot
  team-aditya.webp      473 x 640    headshot · cropped square by object-fit

  app.webp was a 1.2 MB PNG and is now 22 KB — a screenshot of flat UI is
  the best case WebP has. It still loads lazily, below the fold.

still placeholders
──────────────────────────────────────────────────────────────────────────
  og.jpg               1200 x 630    social share card

closet/ — the outfit calculator tiles  (IN USE)
──────────────────────────────────────────────────────────────────────────
Twelve garment photographs, one per tile. Each is drawn `contain`, so the
whole garment fits inside its tile regardless of shape and the tile never
changes size. Every tile also carries a drawn garment underneath as a
fallback: delete a file and the drawing takes over rather than going blank.

  closet/white-tee.avif     closet/denim.webp      closet/sneakers.avif
  closet/oxford.jpg         closet/trouser.jpg     closet/loafers.avif
  closet/check-shirt.jpg    closet/chinos.webp     closet/derby.jpg
  closet/hoodie.jpg         closet/overshirt.avif
                            closet/jacket.webp

  The mixed extensions are deliberate — the supplied files were WebP, JPEG
  and AVIF despite all being named .png, so each was given its real one. That
  matters: the server picks the Content-Type from the extension, and a file
  that lies about its format is at the mercy of browser sniffing.

  Replacing one: keep the same base name, use the true extension, and update
  the src in the CLOSET section of index.html to match.

Notes
  · hero-before and hero-after must be the same framing, or the comparison
    slider will look wrong.
  · Keep each file under ~300 KB. Export at 80% JPEG quality; these are
    served with a 7-day cache in production.
  · The spec label disappears on its own once a real image loads.
