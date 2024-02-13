# archive-axios

Library for centralizing axios dependency, making it easier to manage axios versions while also providing more granular control over axios operations, such as interceptors, white-listing domains, etc.

This library should be imported by other archive projects that use of axios.

## How to import

Add the entry with the desired version to package.json

```
"archive-axios": "https://github.com/archiveprotocol/archive-axios.git#<YOUR_VERSION>",
```

## Running tests

First copy over the .env.example to .env, then fill in the details. You can either start a Kafka docker container or use our test/staging one
