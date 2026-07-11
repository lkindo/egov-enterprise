package nuri.business.service.menu.dto;

import nuri.business.domain.menu.Menu;
import nuri.business.domain.program.Program;

public record MenuWithProgramDto(Menu menu, Program program) {
}
