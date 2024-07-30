#!/bin/bash
export VUE_APP_GIT_COMMIT=$(git rev-parse HEAD)
export VUE_APP_GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
export VUE_APP_GIT_TAG=$(git describe --tags --always)
export VUE_APP_GIT_COMMIT_DATE=$(git show --quiet --format=%cd --date=iso-strict)
if [[ -n $GITHUB_ACTIONS ]]; then
  export VUE_APP_CI=github
fi
exec "$@"
