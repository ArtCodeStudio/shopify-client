# shopify-client

Angular library to use the REST APIs of our [shopify-server](https://github.com/JumpLinkNetwork/shopify-server) koa middleware and authenticates your app user using the [Shopify Embedded App SDK](https://help.shopify.com/api/sdks/shopify-apps/embedded-app-sdk).

Or in short, together with shopify-client and shopify-server you write Shopify Apps in Angular, easily.

## Documentation

You found the documentation on [docs.jumplink.eu/shopify-client/](https://docs.jumplink.eu/shopify-client/).

build the documentation with:

```bash
npm run doc
```

Pulish the documentation with

```bash
npm run publish-doc
```

## Code Style

To ensure that the code becomes uniform this Project use [TSLint](https://palantir.github.io/tslint/) a linting utility for TypeScript.
If you are using Visual Studio Code, you should install the [TSLint Extension](https://marketplace.visualstudio.com/items?itemName=eg2.tslint).

## TODO

* Database Adapter to make it possible to use another Database instead of Firebase Realtime Database
* Remove Callbacks, just use Promises
* More Dokumentation

## See also

* [shopify-server](https://github.com/JumpLinkNetwork/shopify-server)
