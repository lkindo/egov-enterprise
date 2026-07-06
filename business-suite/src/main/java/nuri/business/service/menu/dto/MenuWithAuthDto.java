package nuri.business.service.menu.dto;

import nuri.business.domain.menu.Menu;
import nuri.business.domain.auth.MenuAuthority;

public record MenuWithAuthDto(Menu menu, MenuAuthority menuAuthority) {
}
