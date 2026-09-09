package nuri.business.service.file;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import javax.sql.DataSource;
import java.util.Comparator;
import java.util.List;

/** Aggregate-only diagnostic. This never grants file access or changes business data. */
@Service
@Transactional(readOnly = true)
public class AttachmentReferenceIntegrityService {
    private final JdbcTemplate jdbc;
    private final List<AttachmentSource> sources;

    public AttachmentReferenceIntegrityService(DataSource dataSource, List<AttachmentSourceContributor> contributors) {
        jdbc = new JdbcTemplate(dataSource);
        jdbc.setQueryTimeout(10);
        sources = contributors.stream().flatMap(c -> c.sources().stream()).distinct()
                .filter(s -> s.sensitivity() != AttachmentSource.Sensitivity.DERIVED)
                .sorted(Comparator.comparing(AttachmentSource::table)).toList();
    }

    public record Result(long checked, long dangling, int sourcesChecked, boolean complete) { }

    @Transactional(readOnly = true, timeout = 60, isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public Result scan(int maxReferences) {
        if (maxReferences < 1 || maxReferences > 1_000_000) throw new IllegalArgumentException("Invalid reference limit");
        long checked = 0;
        long dangling = 0;
        int scanned = 0;
        for (AttachmentSource source : sources) {
            // Table identifiers originate only from the compiled enum, never from a request/configuration.
            if (!source.table().matches("tb_[a-z0-9_]+")) throw new IllegalStateException("Invalid source registry");
            boolean popup = source == AttachmentSource.POPUP;
            String column = popup ? "file_url" : "atch_file_sn";
            String predicate = popup
                    ? "(src.file_url = '/api/v1/files/' || m.atch_file_sn OR src.file_url = '/api/v1/files/download?fileId=' || m.atch_file_sn)"
                    : "src.atch_file_sn = m.atch_file_sn";
            String sourceFilter = popup
                    ? "file_url LIKE '/api/v1/files/%'"
                    : "atch_file_sn IS NOT NULL";
            String sql = "SELECT COUNT(*) AS checked, COALESCE(SUM(CASE WHEN EXISTS (SELECT 1 FROM tb_file_master m WHERE "
                    + predicate + ") THEN 0 ELSE 1 END), 0) AS dangling FROM (SELECT " + column
                    + " FROM " + source.table() + " WHERE " + sourceFilter + " LIMIT ?) src";
            long remaining = maxReferences - checked;
            long[] counts = jdbc.queryForObject(sql, (rs, row) -> new long[] {rs.getLong("checked"), rs.getLong("dangling")}, remaining + 1);
            if (counts == null) throw new IllegalStateException("Reference census returned no aggregate");
            if (counts[0] > remaining) return new Result(checked, dangling, scanned, false);
            checked += counts[0];
            dangling += counts[1];
            scanned++;
        }
        return new Result(checked, dangling, scanned, true);
    }
}
