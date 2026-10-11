# AI connection

For local text chat, set `OPENROUTER_API_KEY` in ignored `.env.local`, run `npm run dev`, and visit `/chat?preview=1`. The local API binds to loopback and accepts preview requests only from the 127.0.0.1 browser origin. Use `LOCAL_API_PORT` if another project occupies port 3001; Vite reads the same setting.

Preview conversations are tab-local and model responses do not save journey events. Health responses remain curated; sensitive input is not routed to OpenRouter. Audio still requires configured Gemini privacy processing. Production retains session authentication, consent and quota checks; the development preview endpoint is not deployed.

Set `OPENROUTER_API_KEY` and optionally `OPENROUTER_MODEL` in the hosting environment to enable production text fallback. Never prefix a private key with `VITE_`, commit it, or include it in the browser bundle.

Adapter follows [OpenRouter's API reference](https://openrouter.ai/docs/api_reference/overview), uses structured JSON output, requires provider parameter support and denies provider data collection. All model output remains validated against the application's schema.
