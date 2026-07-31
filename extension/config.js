// Fill these in yourself before "Connect" will work.
//
// Claude does not have verified, real values for clientId/authorizeUrl --
// Claude Code's subscription login talks to an internal Anthropic OAuth
// client that has never been publicly documented (no published client_id,
// authorize/token endpoint, or scope list). Putting a guessed-but-plausible
// URL here would make this look like working, verified code when it isn't.
// See the long comment at the top of lib/auth/anthropicOAuth.ts for what's
// needed and why, and treat whatever you find as reverse-engineered and
// unsupported -- Anthropic can change or block it at any time, and reusing
// Claude Code's own client outside the official app is very likely a Usage
// Policy / Consumer Terms violation.
const OAUTH_CONFIG = {
  clientId: "",
  authorizeUrl: "",
  scope: "",

  // Also register this exact value (call chrome.identity.getRedirectURL()
  // after loading the unpacked extension to see it, looks like
  // https://<extension-id>.chromiumapp.org/) as an allowed redirect_uri on
  // whatever OAuth client you end up using.

  // Where your locally-running AI Command Center backend is listening.
  backendOrigin: "http://localhost:4318",
};
