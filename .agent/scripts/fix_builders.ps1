$f = "business-suite/src/main/java/nuri/business/domain/common/BaseTimeEntity.java"
$c = Get-Content $f -Raw
$c = $c -replace 'private LocalDateTime mdfcnDt;\r?\n', "private LocalDateTime mdfcnDt;`n`n        protected abstract B self();`n        public abstract C build();`n"
Set-Content $f -Value $c -NoNewline
