# Generated Sites

Generated/client site repositories are intended to move here.

Current production sites such as `site-amblast` and `site-amicare-zorg` keep
their existing image names and VPS stack entries until each site is migrated
deliberately. Moving source into this directory must not imply a same-step
production deploy, data-path change, or image-name change.

Expected shape:

```txt
sites/
  amblast/
  ami-care/
```

Generated sites should continue to consume the shared contracts from
`packages/site-template`, `packages/site-themes`, and the `/add-cms` workflow.
