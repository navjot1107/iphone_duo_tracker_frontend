# iPhone Duo Availability Dashboard — Live Frontend Attempt

A React/Vite frontend that directly attempts to fetch live Apple Store pickup availability from Apple's undocumented `shop/retail/pickup-message` endpoint. There are no email/SMS notifications and no backend in this version.

## Deploy to Netlify

1. Extract this ZIP and push the `iphone-duo-frontend` folder contents to a GitHub repository.
2. In Netlify, choose **Add new site → Import an existing project** and connect that repository.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. No environment variables are needed. Deploy.

## Run locally

```sh
npm install
npm run dev
```

## Important limitations

- The page sends a browser `fetch()` request directly to Apple's public but undocumented pickup endpoint.
- Apple may return HTTP 541, rate-limit the request, change the endpoint, or the browser may block it due to CORS. If the browser cannot read Apple's response, a small backend proxy is required; Netlify hosting alone cannot bypass CORS.
- The app never substitutes sample results for failed live requests. A failed request is shown as an error/unknown status, not as out of stock.
- Auto-refresh only works while the page is open and should be used conservatively.
- The default part number (`MK1G4LL/A`) should be verified against the exact iPhone Duo configuration you want.
- Delivery estimates are not included in this browser-only version; pickup is the first live endpoint to test.
