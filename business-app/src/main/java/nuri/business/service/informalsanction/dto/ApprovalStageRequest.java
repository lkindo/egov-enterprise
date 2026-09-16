package nuri.business.service.informalsanction.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import nuri.business.domain.informalsanction.ApprovalStageKind;

import java.util.List;

public record ApprovalStageRequest(
        @NotNull ApprovalStageKind kind,
        @NotNull @Size(min = 1, max = 10) List<@NotBlank @Size(max = 20) String> approverIds) {
}
