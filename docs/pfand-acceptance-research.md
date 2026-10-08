# Pfand Acceptance Research

**Checked:** 2026-10-08  
**Scope:** Whether Pfandfach can say that a German supermarket chain accepts a scanned beverage container. This is product research, not legal advice.

## Finding

Pfandfach should not answer an unconditional chain-level or branch-level “yes” from a photo or EAN alone. It can identify visible evidence for Einweg/Mehrweg and explain a *conditional legal return rule*. Acceptance at a particular branch or machine needs separate evidence. The current scanner obtains product name and brand from Open Food Facts; the image classifier reads visible Pfand evidence and explicitly does not estimate retailer acceptance ([scanner](../app/camera.tsx), [classifier](../api/pfand-classifier.ts), [result screen](../app/result.tsx)). Neither input establishes a branch’s assortment, legal sales area, return arrangements, or machine database.

Recommended user-facing result: “This appears to be [Einweg/Mehrweg]. Whether this branch accepts it is not confirmed. For eligible Einweg containers, retailers that sell containers of the relevant material have statutory return duties; machine recognition can still vary. Ask staff if the machine rejects it.” Avoid presenting a chain name as proof of local acceptance.

## Current legal baseline

The VerpackDG was enacted on 2026-07-13 and entered into force on 2026-08-12. The previous VerpackG is not the operative baseline on the checked date; cite the current provisions rather than historical provisions.

- **Einweg:** VerpackDG § 46 requires a deposit of at least EUR 0.25 for covered single-use beverage packages. Inverkehrbringer must take back emptied eligible packages free of charge at or near the point of handover during business hours and refund the deposit. The duty is limited to the material types (glass, metal, paper/cardboard, plastic and their composites) the seller carries. If sales area is **under 200 m²**, the duty is further limited to brands the seller carries. Vending and distance sales require a suitable nearby return option.
- **Einweg exceptions:** § 46(4) excludes packages not intended for German end consumers; fill volumes below 0.1 L or above 3.0 L; specified beverage cartons (block, gable, cylinder), PE beverage sachets and foil stand-up pouches; and specified drink categories including sparkling wine, wine/wine-like products, certain spirits and alcoholic mixes, milk/dairy drinks, juices/nectars, foods for special medical purposes, and certain low-alcohol alternatives to spirits. These are examples, not an exhaustive paraphrase of the statutory list. The drink-category exceptions do **not** apply when the drink is in a single-use plastic beverage bottle or can. Check the full list and definitions in the statute; do not infer eligibility from an incomplete product name.
- **Mehrweg beverage packaging:** § 39(1) requires free take-back of the same kind, form and size as packaging made available by the seller, at or near the actual handover point. An end retailer’s duty is limited to packaging from goods in its assortment. Unlike § 46’s Einweg rule, this provision does not set a general under-200-m² cutoff for Mehrweg beverage containers.
- **Meaning of labels:** § 47 requires “EINWEG” / “MEHRWEG” shelf or price-label information in applicable cases. UBA says deposit-bearing one-way containers are generally marked with the DPG symbol. These visible labels support container classification; they do not establish that a given branch's machine will identify the individual container. A GTIN identifies a trade item; it does not encode the branch's current assortment, return route, or machine database.

**Primary sources:**

| Source | Relevant scope | Source date | Checked |
|---|---|---|---|
| [VerpackDG, full official text](https://www.gesetze-im-internet.de/verpackdg/BJNR0CF0B0026.html) | Enacted 2026-07-13; in force 2026-08-12. §§ 39, 46–47, 68. | Enactment 2026-07-13; effective 2026-08-12 | 2026-10-08 |
| [VerpackDG § 39](https://www.gesetze-im-internet.de/verpackdg/__39.html) | Reusable and other packaging return duties | Enactment 2026-07-13; effective 2026-08-12 | 2026-10-08 |
| [VerpackDG § 46](https://www.gesetze-im-internet.de/verpackdg/__46.html) | Single-use deposit, return duty, thresholds and exceptions | Enactment 2026-07-13; effective 2026-08-12 | 2026-10-08 |
| [VerpackDG § 47](https://www.gesetze-im-internet.de/verpackdg/__47.html) | “EINWEG” / “MEHRWEG” information duties | Enactment 2026-07-13; effective 2026-08-12 | 2026-10-08 |
| [UBA packaging FAQ](https://www.umweltbundesamt.de/themen/abfall-ressourcen/produktverantwortung-in-der-abfallwirtschaft/verpackungen/fragen-antworten-verpackungen-verpackungsabfaelle) | Consumer-facing summary of return rights and exceptions, sections 4–5 | Updated 2026-09-30 | 2026-10-08 |
| [UBA: Packaging law](https://www.umweltbundesamt.de/themen/abfall-ressourcen/produktverantwortung-in-der-abfallwirtschaft/verpackungen/verpackungsgesetz) | Confirms PPWR and VerpackDG as the framework from 2026-08-12 | Updated 2026-08-12 | 2026-10-08 |
| [GS1: Global Trade Item Number](https://www.gs1.org/standards/id-keys/gtin) | Explains GTIN as an identifier for trade items, not a retailer's return-policy or machine-acceptance record | Undated | 2026-10-08 |

## Retailer evidence

In the table, “statutory rule” is a description of the conditional legal baseline, not a chain policy verification. “Not verified” means no directly applicable first-party policy was verified in this research; it does not mean that the retailer has no legal duty or does not accept the container in practice. The statutory rules apply independently when their conditions are met. Neither a chain-wide statement nor the legal rule confirms a specific branch machine's configuration.

| Chain | Einweg beverage containers | Mehrweg beverage containers | Verified first-party evidence and limits |
|---|---|---|---|
| ALDI Nord | Statutory rule; chain-specific acceptance not verified | Statutory rule; chain-specific acceptance not verified | No direct container-return policy verified. |
| ALDI SÜD | Statutory rule; chain-specific acceptance not verified | Statutory rule; chain-specific acceptance not verified | The located FAQ concerns redeeming a Pfandbon at a different branch, not which containers a branch accepts: [ALDI SÜD FAQ](https://kontakt.aldi-sued.de/faqs/article/Kann-ich-den-Pfandbon-in-jeder-Filiale-einloesen) (undated; checked 2026-10-08). |
| EDEKA | Statutory rule; chain-specific acceptance not verified | Statutory rule; chain-specific acceptance not verified | No directly applicable first-party chain policy verified. |
| Kaufland | Corporate source says customers can return “jegliches Pfand” | Same broad claim, but machine recognition is not universal | Kaufland says the machines use barcode/form/mark recognition; its Mehrweg database is updated about monthly, and unlisted bottles may not be recognized. This is a chain statement plus an explicit machine-data limitation, not a branch guarantee: [How a deposit machine works](https://unternehmen.kaufland.de/presse/kaufland-corporate-blog/wie-funktioniert-ein-pfandautomat), published 2026-02-25; checked 2026-10-08. |
| Lidl | Statutory rule; chain-specific acceptance not verified | Statutory rule; chain-specific acceptance not verified | No directly applicable first-party chain policy verified. |
| Netto Marken-Discount | Statutory rule; chain-specific acceptance not verified | Statutory rule; chain-specific acceptance not verified | No directly applicable first-party chain policy verified. |
| Netto (dog logo) | Statutory rule; chain-specific acceptance not verified | Statutory rule; chain-specific acceptance not verified | No directly applicable first-party chain policy verified. |
| PENNY | Statutory rule; chain-specific acceptance not verified | Statutory rule; chain-specific acceptance not verified | No directly applicable first-party chain policy verified. |
| REWE | Statutory rule; chain-specific acceptance not verified | Statutory rule; chain-specific acceptance not verified | REWE documents “Einfach Mehrweg” for its own reusable *to-go food/drink containers* in 3,800+ markets. Its return instructions concern that pool, not all reusable beverage bottles: [Einfach Mehrweg](https://nachhaltigkeit.rewe.de/verpackungen/mehrweg/einfachmehrweg) and [Mehrweg overview](https://nachhaltigkeit.rewe.de/verpackungen/mehrweg), both undated on-page (© 2026); checked 2026-10-08. |

## Product implications

| Proposed status | Evidence required |
|---|---|
| `legally returnable if conditions apply` | Enough product/package evidence to assess § 46 eligibility and relevant material, plus the retailer’s category/brand scope. This is not a branch-machine guarantee. |
| `first-party chain policy verified within stated scope` | A current, dated retailer source that directly states which containers it accepts and any conditions. Preserve the exact scope and date. |
| `branch confirmed` | Current confirmation tied to a named branch and return route (machine or staffed return), with confirmation date. |
| `machine-specific limitation` | Evidence about that branch’s machine database, supported container forms, or known rejection condition. |
| `not legally returnable / exception` | Sufficient evidence for a specific § 46(4) exception; otherwise say `eligibility unclear`, not “no Pfand.” |
| `not verified` | No sufficiently specific, current evidence. This is the default for chain-specific claims in the table above. |

### Minimum dataset and update process

For a container-level legal eligibility result, retain the observed barcode and product identity, one-way/reusable evidence, package material, format and volume, and beverage category when a statutory exception may apply. A chain-level policy record also needs a first-party source, exact scope, publication or access date, and any stated conditions. A branch-level result additionally needs the branch identifier, assortment and relevant sales-area category, return route (machine or staffed), supported container identifiers or formats, observation date, outcome, and evidence source.

To publish an acceptance percentage, first define the target population and denominator. A defensible operational metric would be: successful returns divided by attempted returns of eligible container presentations, reported separately by chain, region, container type/material, and return route, over a stated period. Publish the sample size and coverage alongside the percentage. Sample branches across regions and store formats, sample multiple eligible container presentations per category, and record machine rejection separately from staff-assisted acceptance. Exclude ineligible containers from the acceptance denominator but report their count separately. Do not treat scans, retailer marketing statements, user anecdotes, or classifier confidence as successful return observations.

Maintain the evidence through a dated source register and scheduled review, with immediate review when a law, retailer policy, machine system, or product record changes. Expire branch observations on a declared schedule and show the last-verified date in the product. Keep the raw observation and source so a percentage can be reproduced; do not silently carry stale branch results forward. Until representative branch-level testing exists, no chain acceptance percentage is supportable.

## Unknowns and prohibited claims

Unknowns include the assortment, floor area where legally relevant, return route, and machine records at each branch; actual branch acceptance rates; and whether an individual product record matches the physical package being scanned. No representative branch test dataset was available for this research.

Do not claim that a chain accepts every Einweg or Mehrweg container, that an EAN or photo proves a particular branch will accept it, that a retailer is legally required to accept every Pfand container, or that the model's confidence is an acceptance probability. Do not turn an unverified retailer policy into a “no” claim. State the visible classification separately from legal eligibility and from branch or machine confirmation.

## Research limits

Retailer policy verification was incomplete for ALDI Nord/Süd, EDEKA, Lidl, Netto Marken-Discount, Netto (dog logo) and PENNY. REWE’s verified page concerns its own to-go pool, not general bottle acceptance. No branch-by-branch machine database or acceptance test set was available. Treat these as explicit evidence gaps, not negative acceptance findings.