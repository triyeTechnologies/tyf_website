IMAGES
══════════════════════════════════════════════════════════════════════════

Drop files here with these exact names and they take over their slot on the
page automatically. Anything missing keeps its coloured placeholder, which
prints the filename and the shot you need — so the site looks deliberate
while you are still shooting.

showcase/ — the try-on looks  (IN USE)
──────────────────────────────────────────────────────────────────────────
Nine complete looks, each three files. These are live on the site now.

  showcase/look-N-person.webp    the model in their own clothes
  showcase/look-N-garment.webp   the garment on its own
  showcase/look-N-result.webp    the TyF output

  N runs 1 to 9. All are 3:4 portraits at 480x640.

  If your export names them N.1 / N.2 / N.3, the mapping is
  1 = person, 2 = garment, 3 = result.

  Where each one appears:
    look-1        hero comparison slider (person -> result), the garment
                  beside it, and the "how it works" steps
    look-2 to 7   the results gallery, each output showing the person and
                  garment it came from
    look-8, 9     the "how it works" picker only — no gallery tile yet

  Adding a tenth look: drop the three files in, then add one <button> to each
  of the two `.picks` rows in the HOW IT WORKS section. The script builds the
  path from the number on the button, so nothing else needs touching. A
  gallery tile is a separate copy-paste in the RESULTS section.

  CACHING — why these are not cached for a year.

  They were, with `immutable`, and it was wrong. `immutable` promises the
  browser that a URL's content will NEVER change, so it stops checking
  entirely. That is only safe when the filename carries a content hash. These
  names stay the same while the picture behind them changes, so replacing a
  photo left every browser that had already loaded the page showing the old
  one — for a year, with no way to tell anything was stale.

  vercel.json now sends max-age=300 with stale-while-revalidate on /images
  and /videos: still instant from cache, but a swap appears within minutes
  instead of never. Fonts keep `immutable`, because those filenames really do
  only change when the file does.

  Do not put `immutable` back unless the filenames start carrying hashes.

  SAVE THESE AS ACTUAL WEBP. All 27 arrived once as JPEG carrying a .webp
  extension, which the browser mostly gets away with by sniffing — but the
  server sets Content-Type from the extension, so the file is lying to every
  client that trusts it, and none of the compression is real: 3.42 MB of
  JPEG became 0.57 MB once genuinely encoded. In Photoshop or Squoosh, pick
  WebP in the format list rather than typing .webp into the filename.

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
