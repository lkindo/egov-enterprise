package nuri.migration.plan;

import nuri.migration.discovery.ObjectKind;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/** plan coverage와 객체별 disposition을 다시 계산해 실행 가능성을 fail-closed 판정한다. */
public final class MigrationPlanValidator {

    public PlanReadiness validate(List<MigrationObjectPlan> objects, PlanCoverage coverage) {
        return validate(objects, coverage, List.of());
    }

    PlanReadiness validate(
            List<MigrationObjectPlan> objects,
            PlanCoverage coverage,
            List<String> additionalBlockers) {
        Objects.requireNonNull(objects, "objects");
        Objects.requireNonNull(coverage, "coverage");
        Objects.requireNonNull(additionalBlockers, "additionalBlockers");

        List<String> blockers = new ArrayList<>(additionalBlockers);
        long actualUnclassified = objects.stream().filter(object -> object.disposition() == null).count();
        long actualAutomatic = objects.stream()
                .filter(object -> object.disposition() == ObjectDisposition.AUTO_DATA_LOAD)
                .count();

        if (coverage.discovered() != objects.size()) {
            blockers.add("coverage 불일치: discovered=" + coverage.discovered()
                    + ", objects=" + objects.size());
        }
        if (coverage.unclassified() != actualUnclassified) {
            blockers.add("coverage 불일치: unclassified=" + coverage.unclassified()
                    + ", actual=" + actualUnclassified);
        }
        if (coverage.automatic() != actualAutomatic) {
            blockers.add("coverage 불일치: automatic=" + coverage.automatic()
                    + ", actual=" + actualAutomatic);
        }
        if (coverage.unreadable() > 0) {
            blockers.add("판독 불가 또는 불완전한 discovery 결과: " + coverage.unreadable() + "건");
        }
        if (coverage.discovered() == 0) {
            blockers.add("inventory에서 발견한 객체가 0건이므로 실행할 수 없습니다");
        }

        Set<String> seen = new HashSet<>();
        for (MigrationObjectPlan object : objects) {
            if (!seen.add(object.sourceObjectId())) {
                blockers.add("중복 객체 ID: " + object.sourceObjectId());
            }
            validateObject(object, blockers);
        }

        boolean ready = blockers.isEmpty();
        return new PlanReadiness(ready, ready, blockers);
    }

    private static void validateObject(MigrationObjectPlan object, List<String> blockers) {
        String id = object.sourceObjectId();
        ObjectDisposition disposition = object.disposition();
        if (disposition == null) {
            blockers.add("미분류 객체: " + id);
        }
        if (!object.reviewed()) {
            blockers.add("미검토 객체: " + id);
        }
        if (disposition == ObjectDisposition.BLOCKED) {
            blockers.add("BLOCKED 객체: " + id);
        }
        if (disposition == ObjectDisposition.AUTO_DATA_LOAD) {
            if (object.objectKind() != ObjectKind.TABLE || !object.dataMappingPresent()) {
                blockers.add("AUTO_DATA_LOAD는 TABLE과 MappingSpec 매핑이 모두 필요합니다: " + id);
            }
            if (object.targetObject() == null) {
                blockers.add("AUTO_DATA_LOAD 타깃 테이블 누락: " + id);
            }
            if (!object.automatic()) {
                blockers.add("AUTO_DATA_LOAD automatic 표시 누락: " + id);
            }
        } else if (object.automatic()) {
            blockers.add("AUTO_DATA_LOAD가 아닌 객체의 automatic 표시: " + id);
        }
        if (disposition == ObjectDisposition.APPROVED_IGNORE
                && (object.rationale() == null || object.rationale().isBlank())) {
            blockers.add("APPROVED_IGNORE 승인 사유 누락: " + id);
        }
        if ((disposition == ObjectDisposition.TARGET_OWNED
                || disposition == ObjectDisposition.RECREATE_VIA_FLYWAY)
                && object.targetObject() == null) {
            blockers.add(disposition + " 타깃 객체 누락: " + id);
        }
    }
}
