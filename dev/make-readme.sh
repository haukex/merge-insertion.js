#!/bin/bash
set -euxo pipefail
cd -- "$( dirname -- "${BASH_SOURCE[0]}" )"/..

npx typedoc --githubPages false --out . --cleanOutputDir false --excludeInternal \
  --plugin typedoc-plugin-markdown --router module --readme none \
  --disableSources true --hidePageHeader true --hidePageTitle true \
  --plugin typedoc-plugin-rename-defaults src/merge-insertion.ts
# move the copyright block to the bottom of the file
perl -wM5.012 -0777 -i -pe 's/(\nAuthor,(?:(?!\n##).)+)//s||die;$_.=$1' README.md
