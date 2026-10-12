# Authentication reference inventory

These notes were obtained by opening every PNG in `assets/ref/`. The standalone PNGs are authoritative over the smaller board/showcase composites. Generated contact sheets and normalized reference crops are QA artifacts, not application assets.

## Route mapping

| Route / journey step | Primary PNG | Required visible content |
| --- | --- | --- |
| Get Started | `Auth 1.png` | Need Help; centered official logo; Welcome to ZAWANA; One account. One platform. Your complete sports and wellness experience.; Continue with Phone Number; or continue with; Google; Apple; Don't have an account? Sign Up |
| Sign In | `Sign in.png` | Back; Need Help; logo; Sign In; Enter your phone number to access your ZAWANA account.; Myanmar flag / +95 country selector; phone number; Send Verification Code; bottom photo and SPORTS / FITNESS / HEALTHCARE / LIFESTYLE |
| Sign Up | `Sign-up-ref.png` | Same composition as Sign In; Sign Up; Enter your phone number to create your ZAWANA account.; Send Verification Code |
| Verify (both journeys) | `verify.png` | Back; Need Help; logo; Verify Your Number; We've sent a 6-digit code to; dynamic phone and Edit; six outlined code boxes (active border gold); Didn't receive the code? Resend in 00:28; Verify & Continue; or; Call Me Instead; bottom architecture image and service label |
| Existing user Password | `pwd.png` | Back; Need Help; logo; Enter Your Password; Your phone number is verified. Enter your password to sign in.; password with lock and visibility icon; Forgot password?; Remember this device checkbox; Sign In; lower architecture image |
| Profile Setup | `profile set up.png` | Back; Need Help; logo; three progress strokes with first two gold; Complete Your Profile; This helps us personalise your ZAWANA experience.; Profile Photo (Optional); Add Photo; Select your interests (Optional); 2-column interest grid: Badminton, Gym & Fitness, Coaching, Physiotherapy, Sports Retail, Cafe; Continue; Skip for now |
| Create Account details | `create-account.png` | Back; Need Help; logo; Create Your Account; Tell us a bit about yourself to get started.; Full Name; verified Phone Number with green check and Phone number verified banner; Date of Birth; Gender selector; Continue; By continuing, you agree to our Terms of Service and Privacy Policy. |
| Set Password | `set password.png` | Back; Need Help; logo; Set a Password; Create a secure password for your account.; Password; three rules: At least 8 characters / Include letters and numbers / Include a special character (e.g. @ # $); Confirm Password; visibility toggle on both; Create Account |
| Complete | `account created.png` | Logo; gold circle/check and scattered decorative gold shapes; Account Created Successfully!; Welcome to ZAWANA. Let's start your journey towards a healthier and better you.; promotional carousel with Book Badminton Courts / Play, train and improve with world-class facilities.; Gym & Fitness / Train stronger every day.; three paging dots; Explore ZAWANA |
| Authenticated Home | `Premium Badminton App Home Screen.png` | Five tabs Home / Book / Services / Activity / Profile; dynamic greeting/member; promotional hero; four quick actions; upcoming bookings; membership promotion; five facility cards. This is a design reference, not evidence that this home already exists as code. |

The latest requested journey puts Profile Setup before Create Account details. The `ZAWANA Sports Authentication Flow.png` composite shows Create Account details before Profile Setup. Follow the user's exact requested order and keep the discrepancy visible in implementation notes. `create-account.png` contains an Ethiopian +251 example; Sign In, Sign Up, Verify consistently use Myanmar +95. These are sample details, not defaults for a real member.

## Geometry and style

- Each individual auth PNG is 1122 x 1402 including a surrounding phone frame and white canvas. Compare against the **inner display**, not the full PNG. Approximate measured display bounds and QA crops are in `reference-map.json`.
- Reference display proportions vary materially. Width-normalized to 390, heights range from about 802 to 870. Choose one real device profile for capture; retain flex layout / scrolling rather than forcing the screenshots' different artificial device ratios.
- Auth 1 display: approx x237..883, y28..1357, normalized 390 x802. Logo top around65; title left35/top216; main button left25/top548/width340/height51; divider top624; social buttons top647/height57; footer baseline around751. All normalized coordinates include the screenshot's simulated status-bar region.
- Sign In / Sign Up display approx 390 x812. Logo top75; title left25/top267; phone field top382/height57; main button top461/height53; photo begins below around546. Horizontal content inset25.
- Verify approx390 x828: logo top71; heading top236; OTP top353/height52, six boxes separated by about8; resend top443; primary top480/height53; phone fallback top577/height52.
- Password approx390 x823: logo top84; title left34/top265; field top375/height52; forgot password around444; checkbox around473; main button top516/height51.
- Shared form corners are about10; primary buttons gold gradient, black semibold text, outlined navy arrow; inputs near-white with pale grey/lavender borders; strong navy headings; muted slate body text; ivory/white background with pale sweeping cream bands in non-photo screens. The optical size of headings is around30-32 at390-width, body18-20 in larger form screens and14-16 in Get Started.
- The system status bar in most references is a stylized 9:41. Use the real platform status bar; do not render fake device signal/battery/clock or the surrounding frame.

## Official brand assets and limitations

- `assets/zawana logo png.png`: 3000 x3000 RGBA; true alpha0..255; visible full official lion, gold crown, serif wordmark, EST2022. Alpha bounding box x553..2447 / y109..2669. Use the entire official logo with an Image; do not reconstruct its wordmark as native text. It contains the official gold wordmark backplate, unlike the newer mockups.
- `assets/brand/zawana-logo-square.png`:720 x720 RGB; opaque white background, lion/crown, serif wordmark on gold block, EST2022. Suitable when opaque white backing is acceptable.
- `assets/brand/zawana-logo-mark.png`:589 x810 **RGB**, despite the name it includes the complete logo/wordmark/EST and has an opaque black background. It is not a usable transparent mark image.
- The standalone mockups show a newer/different condensed sans wordmark and altered lion illustration. No matching separately editable asset was found. Preserve official identity, report this visual mismatch, and replace with an authorized newer logo if supplied later. A reference crop used as a recreated production logo would conflict with the requirement to use official brand assets.
- Brand guideline PDF page4 specifies **Gotham** as primary font. No .ttf/.otf/.woff font file exists in assets. Page5 contains a decorative striped secondary type specimen but no extractable family name. Raster references appear to use another UI sans; the exact font cannot be proven from pixels. Do not label a system font or unrelated downloaded font as exact Gotham.
- PDF digital colors: #FFFFFF, #3B395F, #C4AF49, #1D1B47, #A2A3AE, #53526B, #161442, #D5D6D8. Mockup CTAs use a warmer brighter gold around #E2B649; use the image as primary visual authority.
- `assets/auth/welcome-building.png` is explicitly a generated reconstruction from the earlier Get Started task. It differs from the reference architecture. Original background artwork is absent.
- Sign In and Sign Up require a different racket/shuttlecock photograph. Complete requires player and gym-person artwork. No matching standalone originals were found. Existing `assets/facilities/*.webp` are official facility photography and can be reused honestly but are visibly different.
- Do not render the whole reference PNG as a background or slice out text-bearing UI regions for production. QA crops are strictly for comparison.

## Other PNGs

- `A & B.png`: core member onboarding/home/court booking board, not a standalone screen.
- `c.png`: services/membership board.
- `D.png`: Activity/account board.
- `E.png`: future payment/accountability/coaching board.
- `F.png`: dark-mode board.
- `design.png`: brand/design system composite; font names are not reliably legible.
- `ChatGPT Image Oct 8, 2026, 02_59_12 PM.png`: auth experience marketing board, includes alternative email sign-in not requested by standalone refs.
- `ChatGPT Image Oct 8, 2026, 02_59_20 PM.png`: signup/verification marketing board with alternative UI and error/success/help illustrations; secondary reference only.
- `ZAWANA Sports Authentication Flow.png`: auth composite, useful hierarchy/order context but inconsistent with latest explicit journey.
- `ZAWANA Sports App UI Showcase.png`: service/booking/coaching composite.
- `book-1.png` through `book-6.png`: court booking screens, out of current auth scope.

## Behavior constraints from the visuals

Call Me Instead, forgot-password recovery, social login, photo upload, interests persistence, and terms/privacy links require actual backend/provider support. Hide, disable with an explanation, or clearly report missing functionality; never fake a verified state. Progress indicators, phone verification badge, completion check, and authenticated home may only represent state proven by the actual supported authentication architecture.
