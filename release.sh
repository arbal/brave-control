#!/usr/bin/env bash

set -euo pipefail

zip -r integrations/Alfred/Brave\ Control.alfredworkflow ./brave.js -x '.*'
