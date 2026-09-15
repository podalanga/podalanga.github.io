// Console sigil (§7.6): once per full page load, print a small ASCII eye and a styled signature
// to the devtools console. Purely cosmetic; wrapped in try/catch since console access can be
// blocked/patched in some environments.
const EYE = String.raw`
    .-"""-.
   /  o o  \
  |    ^    |
   \  ---  /
    '-...-'
`;

export function initConsoleSigil(): void {
  try {
    console.log(EYE);
    console.log('%cWE SEE YOU. (github.com/podalanga)', 'color:#ff3333;font-weight:bold;font-size:14px;');
  } catch {
    // console unavailable; nothing to do
  }
}
