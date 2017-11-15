# code-stats-atom package

Code::Stats plugin for the Atom editor.

To use the package, generate an API key on your "Machines" page and copy that API key into the package settings.

Code::Stats is a free statistics tracking service for programmers: [https://codestats.net/](https://codestats.net/)

## Publish instructions

1. Make changes.
2. Create new tag `vX.Y.Z` corresponding to new version (try to adhere to sort of semantic versioning).
3. Push changes and tag to GitLab.
4. Check that changes are mirrored to [GitHub repository](https://github.com/code-stats/code-stats-atom). APM will pull from GitHub as it doesn't support GitLab.
5. `apm publish --tag <tag>` using the just created tag.
