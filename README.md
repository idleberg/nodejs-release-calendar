# 📆 Node.js Release Calendar

> A calendar for Apple Calendar, Outlook etc. containing all upcoming Node.js releases.

[![Build](https://img.shields.io/github/actions/workflow/status/idleberg/nodejs-release-calendar/gh-pages.yml?style=for-the-badge)](https://github.com/idleberg/nodejs-release-calendar/actions)

**TL;DR**

Subscribe to this URL:

```
https://idleberg.github.io/nodejs-release-calendar/nodejs-releases.ics
```

## Self-hosted

In order to host the feed yourself, please follow these steps:

```sh
# fork repository
git clone https://github.com/idleberg/nodejs-release-calendar

# install dependencies
cd nodejs-release-calendar && bun install

# generate iCal file
bun run build
```

> [!TIP]  
> I'm using [Bun](https://bun.sh/) as my JavaScript runtime. If you don't, you can replace both `bun` commands in the example with `npm` or the likes.

You can now deploy the files inside the `public`-folder to your webspace.

## Related

[Node.js Releases](https://github.com/nodejs/release)
