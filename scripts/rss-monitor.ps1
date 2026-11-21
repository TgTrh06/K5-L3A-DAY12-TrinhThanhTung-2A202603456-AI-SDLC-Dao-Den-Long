param([Parameter(Mandatory = $true)][int]$RootProcessId)
$ErrorActionPreference = 'SilentlyContinue'
while (Get-Process -Id $RootProcessId) {
    $items = @(Get-CimInstance Win32_Process -Property ProcessId, ParentProcessId, WorkingSetSize)
    $ids = [System.Collections.Generic.HashSet[int]]::new()
    [void]$ids.Add($RootProcessId)
    $changed = $true
    while ($changed) {
        $changed = $false
        foreach ($item in $items) {
            if ($ids.Contains([int]$item.ParentProcessId) -and $ids.Add([int]$item.ProcessId)) { $changed = $true }
        }
    }
    $sum = ($items | Where-Object { $ids.Contains([int]$_.ProcessId) } | Measure-Object -Property WorkingSetSize -Sum).Sum
    if ($sum) { [Console]::WriteLine([int][Math]::Round($sum / 1MB)); [Console]::Out.Flush() }
    Start-Sleep -Milliseconds 500
}
