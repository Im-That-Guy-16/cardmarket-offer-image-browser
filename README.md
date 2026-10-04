<h1 align="center">Cardmarket Offer Image Browser</h1>

<p align="center"><em>Browse a seller's card images in a carousel without leaving the offer list.</em></p>

<p align="center">
  <img alt="Type" src="https://img.shields.io/badge/Type-Userscript-6E40C9?style=for-the-badge">
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black">
  <img alt="Tampermonkey" src="https://img.shields.io/badge/Tampermonkey-Ready-00485B?style=for-the-badge&logo=tampermonkey&logoColor=white">
  <img alt="Violentmonkey" src="https://img.shields.io/badge/Violentmonkey-Ready-2F4F4F?style=for-the-badge">
</p>

---

## Overview

A userscript for Cardmarket seller offer pages. It leaves the existing offer rows
untouched and adds an image carousel on top, so you can flick through every card
in a filtered offer list without opening each product page.

## Features

- Card-image carousel modal with previous/next controls.
- Caches every pagination page for the current filter and sort before opening.
- Quantity and add-to-basket controls inside the modal.
- Left and right arrow keys move between cards when no form field is focused.
- Leaves the original offer table entirely intact.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Open the raw userscript URL:

   ```text
   https://raw.githubusercontent.com/Im-That-Guy-16/cardmarket-offer-image-browser/main/outputs/cardmarket-offer-image-browser.user.js
   ```

3. Confirm the install in your manager.

## Usage

Click the camera icon in any offer row, or the **Card images** button in the
bottom-right corner. The page dims while pages are cached, then the modal lists
every card found.

## Supported pages

```text
https://www.cardmarket.com/*/Magic/Users/*/Offers/Singles*
```

## Notes

- Images are fetched from the matching Cardmarket product pages.
- The script only changes your browser view. It does not buy cards or submit forms.
