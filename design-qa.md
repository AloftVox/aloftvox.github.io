**Source Visual Truth**
- Reference: `C:/Users/25395/Downloads/已生成图像 1.png`
- Local implementation: `http://localhost:4321/`
- Same-viewport comparison: `tmp/orbit-home-qa-v8/baseline-vs-final-2048.png`
- Desktop hero: `tmp/orbit-home-qa-v8/final-1366x768.png`, `tmp/orbit-home-qa-v8/final-1440x900.png`, `tmp/orbit-home-qa-v8/final-1920x1080.png`, `tmp/orbit-home-qa-v8/final-2048x1124.png`, `tmp/orbit-home-qa-v8/final-2560x1440.png`
- Mobile hero: `tmp/orbit-home-qa-v7/final-mobile.png`
- Hover state: `tmp/orbit-home-qa-v7/final-hover.png`

**Findings**
- No actionable P0, P1, or P2 findings remain.
- Intentional difference: category labels are live HTML projected from Three.js nodes rather than baked into the scene, preserving keyboard access, text clarity, and content replacement.
- Intentional difference: demo article links use existing internal routes until matching Content Collection entries exist; no nonexistent external destinations were introduced.

**Fidelity And Structure**
- Hero composition: the full-bleed background is separated from a `min(94vw, 1900px)` interactive stage. Desktop height uses `clamp(820px, 90svh, 1020px)`, a short-screen 96svh override, and a tall-wide cap of 1240px so each target viewport retains only a controlled hint of the editorial index.
- Spatial depth: partial orbital draw ranges, steeper depth attenuation, shortened spark ranges, offset curve centers, explicit portrait-front and portrait-back arcs, avatar shade/aura planes, foreground dust, and restrained planet masking establish separate background, midground, and foreground planes.
- Knowledge navigation: all seven configured categories expose visible names and counts. Each node is a real link/focus target and maps to a nearby article preview with title, date, tags, and reading time.
- Particle title: AloftVox uses denser deterministic glyph-mask sampling with a faint blurred glyph foundation, stable body particles, sparse highlights, and very limited detached drift particles. Pointer displacement and settled motion are reduced so the letter skeleton remains intact.
- Constellation identity: the seven categories now use seven explicit anchor graphs rather than repeated procedural clusters: grid, radial, exploration chain, symmetric loop, connected workflow, orbital ring, and branching project forms. Each retains a bright core, eight major satellites, structural lines, sparse dust, and a local color halo.
- Content continuation: the white editorial index includes six Recent Posts, four category orbit visuals, Mission Control, a functional subscription form, and the existing site footer with About/RSS/Sitemap/GitHub links.
- Data ownership: placeholder categories, articles, previews, project, copy, and external links are centralized in `src/data/home.ts`; real Astro posts are placed before placeholder articles.
- Component ownership: the former 2,137-line homepage is reduced to data normalization and composition. Visual sections live in separate home components.
- Navigation: reduced type size/weight, removed blocky active fill, retained theme toggle, and added a more solid scrolled state.

**Responsive And Accessibility**
- Desktop verified at 1366x768, 1440x900, 1920x1080, 2048x1124, and 2560x1440. Stage widths are 1284, 1354, 1805, 1900, and 1900px respectively.
- Mobile verified at 390x844 with a reflowed hero, fewer visible label details, readable title/copy, single-column article list, two-column category section, project card, and subscription form.
- No horizontal overflow at any target viewport. Automated rectangle checks found no category-label overlaps or viewport boundary violations.
- Seven category links and projected hit targets are present. Focus states remain visible.
- `prefers-reduced-motion: reduce` settles the intro immediately and preserves access to all content.
- Canvas elements are decorative and `aria-hidden`; the actual HTML H1 remains available.

**Interaction And Runtime Verification**
- Seven visible labels verified: Web Development, Frontend, Deep Dives, Design & UX, Tools & Workflow, Life & Thinking, Projects.
- Hover preview verified with title, three tags, `2026-06-18`, and `8 min read`.
- Header enters the scrolled state after 28px.
- Theme toggled from light to dark.
- Subscription returned `已记录，感谢订阅。` and reset the field.
- Browser console errors: none. Page errors: none.
- `npm run build`: passed. Vite retains its informational warning for a minified Three.js chunk above 500 kB.

**Iteration History**
- P1: old tracks occupied the viewport without organizing content. Fixed by reducing orbital radii and binding seven constellation nodes to the curves.
- P1: category nodes were anonymous point clouds. Fixed with three procedural constellation patterns, connection segments, luminous cores, dual rings, visible labels, counts, and article previews.
- P2: Tools & Workflow overlapped Web Development. Fixed by assigning it a separate orbital phase near the title/portrait bridge.
- P2: Deep Dives and Design & UX overlapped at wide desktop sizes. Fixed with named composition offsets that preserve the data-driven node system and separate their depth planes.
- P2: complete bright orbital ellipses flattened the scene. Fixed with per-track visible fractions, offset centers, varied depth opacity, and clipped portrait rings.
- P2: the planet and stacked transition consumed too much vertical weight. Fixed by lowering and fading the planet, then replacing the layered edges with one asymmetric white surface, one shadow, and one fog layer.
- P2: the settled AloftVox form still read as loose glitter. Fixed by adding a very faint mask-derived foundation, increasing body sampling density, reducing jitter and detached particles, and separating body/highlight color and opacity.
- P2: category clusters shared too much visual grammar. Fixed by defining seven category-specific anchor layouts and edge maps, then enlarging major stars while reducing unstructured dust.
- P2: outer orbit sparks and interface controls competed with the core. Fixed by shortening spark draw ranges, reducing outer-track opacity and glint size, dimming the environment label, and unifying the replay/social control treatment.
- P1: the Hero background was full width but its content still read as a fixed 1440px composition on wide displays. Fixed by separating the stage from `site-shell`, adding a 1900px responsive stage, widening the copy rail, and adapting X-axis orbit layout without uniformly scaling the scene.
- P1: fixed camera distance made the 1900px stage crop nodes on tall 2560x1440 displays. Fixed with aspect-ratio camera compensation and height-aware vertical targeting, preserving the avatar/title position while keeping all seven nodes inside the stage.
- P2: the transition became visually flat on 2048px-wide screens. Fixed with one irregular white curve and one blurred gray-blue shadow, without reintroducing stacked wave layers.
- P2: the single hero role still entered the rotation fade cycle and could disappear. Fixed by disabling the loop when only one role is configured.
- P2: the previous homepage mixed hero, directory, projects, and obsolete styles in one 2,137-line file. Fixed by extracting data and five focused home components.

final result: passed
