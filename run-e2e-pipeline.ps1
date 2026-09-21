# Own only the fresh processes and database created by the isolated runner.
$ErrorActionPreference = 'Stop'
$runner = Join-Path $PSScriptRoot 'scripts/run-isolated-e2e.mjs'
& node $runner -- @args
exit $LASTEXITCODE
