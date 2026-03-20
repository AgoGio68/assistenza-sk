$f = "c:\assistenza-sk\src\pages\Installations.tsx"
$c = Get-Content $f
$new = @()
for ($i=0; $i -lt $c.Length; $i++) {
    if ($i -eq 1098 -and $c[$i] -like "*if (val.includes('T')) {*") {
        $new += "                                                        onChange={e => {"
        $new += "                                                            const val = e.target.value;"
        $new += "                                                            if (val.includes('T')) {"
        $new += "                                                                const [, t] = val.split('T');"
        $new += "                                                                setEditData(prev => ({ ...prev, scheduledDate: val, scheduledTime: t }));"
        $new += "                                                            } else {"
        $new += "                                                                setEditData(prev => ({ ...prev, scheduledDate: val }));"
        $new += "                                                            }"
        $new += "                                                        }}"
        $i += 6
    } else {
        $new += $c[$i]
    }
}
$new | Set-Content $f
