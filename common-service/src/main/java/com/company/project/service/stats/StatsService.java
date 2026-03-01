package com.company.project.service.stats;

import com.company.project.service.stats.dto.StatsDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * ???Ä???ïÌâ¨???¥—ãÏÅΩÔß?
 * Native Query???????èÎø¨ Êπ≤Í≥ó?????Ä??Î∂øÎπü ???î†?âÎ∂øÎø???Í≥óÏî†??Ë≠∞Í≥†?? */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StatsService implements EgovStatsService {

    private final EntityManager entityManager;

    @Override
    public List<StatsDto> getConnectionStats(String fromDate, String toDate, String statsKind) {
        // ?Î¨íÎÉΩ Êø°Ïíì?????î†?âÎ∂øÎø????∞ÌÄ??Î∂æÌÄ??Íæ®ÌÄ?ÔßûÎ¨é??(SCONECTSUMMARY -> sweblogsummary)
        String sql = """
                SELECT OCCRRNC_DE as stats_date, SUM(rdcnt) as stats_co
                FROM sweblogsummary
                WHERE OCCRRNC_DE BETWEEN :fromDate AND :toDate
                GROUP BY OCCRRNC_DE
                ORDER BY OCCRRNC_DE
                """;

        return executeStatsQuery(sql, fromDate, toDate);
    }

    @Override
    public List<StatsDto> getBoardStats(String fromDate, String toDate, String statsKind) {
        // ÂØÉÎöØ????Î∂øÎπü ???î†?âÎ∂øÎø??Ë≠∞Í≥†??(SBBSSUMMARY)
        String sql = """
                SELECT OCCRRNC_DE as stats_date, SUM(CREAT_CO) as stats_co
                FROM SBBSSUMMARY
                WHERE OCCRRNC_DE BETWEEN :fromDate AND :toDate
                GROUP BY OCCRRNC_DE
                ORDER BY OCCRRNC_DE
                """;

        return executeStatsQuery(sql, fromDate, toDate);
    }

    @Override
    public List<StatsDto> getUserStats(String fromDate, String toDate, String statsKind) {
        // ??????Î∂øÎπü ???î†?âÎ∂øÎø??Ë≠∞Í≥†??(SUSERSUMMARY)
        String sql = """
                SELECT OCCRRNC_DE as stats_date, SUM(user_co) as stats_co
                FROM SUSERSUMMARY
                WHERE OCCRRNC_DE BETWEEN :fromDate AND :toDate
                GROUP BY OCCRRNC_DE
                ORDER BY OCCRRNC_DE
                """;

        return executeStatsQuery(sql, fromDate, toDate);
    }

    @Override
    public List<StatsDto> getRequestStats(String fromDate, String toDate, String statsKind) {
        // ?Î∂æ„àÉ ?Î∂øÎπü ???î†?âÎ∂øÎø???Î∂øÍªå ???Ä?ÔßûÎ¨é??(SSCRINSUMMARY -> sweblogsummary ??Ôß?
        String sql = """
                SELECT OCCRRNC_DE as stats_date, SUM(rdcnt) as stats_co
                FROM sweblogsummary
                WHERE OCCRRNC_DE BETWEEN :fromDate AND :toDate
                GROUP BY OCCRRNC_DE
                ORDER BY OCCRRNC_DE
                """;

        return executeStatsQuery(sql, fromDate, toDate);
    }

    @SuppressWarnings("unchecked")
    private List<StatsDto> executeStatsQuery(String sql, String fromDate, String toDate) {
        List<StatsDto> result = new ArrayList<>();

        try {
            Query query = entityManager.createNativeQuery(sql);
            query.setParameter("fromDate", fromDate);
            query.setParameter("toDate", toDate);

            List<Object[]> rows = query.getResultList();
            for (Object[] row : rows) {
                StatsDto dto = StatsDto.builder()
                        .statsDate((String) Objects.requireNonNull(row[0]))
                        .statsCo(((Number) Objects.requireNonNull(row[1])).intValue())
                        .build();
                result.add(dto);
            }
        } catch (Exception e) {
            // ???î†?âÎ∂ø????æÍµÖ???ëÏá∞????ªÏ™ü ????Ôßè‚ë∏Ï§?Ë´õÏÑë??            // ?Î®?ú≠???æÎåÅ???? ??ÑÌÄ? ??ÂØÉÍ≥å??Ë´õÏÑë??        }

        return result;
    }
}
