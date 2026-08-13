# Korean language pack

English | [中文](README.zh.md)

`@deepseek-ai/dsh-client-locale-ko` adds Korean as an installable browser locale. It registers the `ko` locale and Korean dictionaries through the public locale registry instead of changing the base locale package.

The Web bundle includes this package by default. A profile that does not include it can install it independently:

```sh
dsh plugin --profile web add @deepseek-ai/dsh-client-locale-ko
```

Because the language pack is a profile bundle, updating DSH does not require editing the global installation. Update or remove the package through the same profile plugin workflow.

## Model Experience

None, as the package supplies browser UI copy and does not add model-visible input.

#### KV Cache effect

None. The package does not assemble or send provider requests.

## Known Limitations and Deferred Work

- The browser plugin requires the base `locale` service. Duplicate `ko` locale or dictionary registrations fail during plugin activation instead of replacing another language pack.
