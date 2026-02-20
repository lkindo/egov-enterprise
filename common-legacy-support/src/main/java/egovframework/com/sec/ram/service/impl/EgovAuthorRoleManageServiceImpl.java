package egovframework.com.sec.ram.service.impl;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.auth.AuthorRoleProjection;
import com.company.project.domain.auth.AuthorityRole;
import com.company.project.domain.auth.AuthorityRoleRepository;

import egovframework.com.sec.ram.service.AuthorRoleManage;
import egovframework.com.sec.ram.service.AuthorRoleManageVO;
import egovframework.com.sec.ram.service.EgovAuthorRoleManageService;
import lombok.RequiredArgsConstructor;

/**
 * ???? ???ServiceImpl ?????? ???.
 * 
 * @author ???????? ??
 * @since 2009.06.01
 * @version 1.0
 **/
@Service("egovAuthorRoleManageService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovAuthorRoleManageServiceImpl extends EgovAbstractServiceImpl implements EgovAuthorRoleManageService {

	private final AuthorityRoleRepository authorityRoleRepository;

	/**
	 * ????????
	 **/
	@Override
	public List<AuthorRoleManageVO> selectAuthorRoleList(AuthorRoleManageVO authorRoleManageVO) throws Exception {
		Pageable pageable = PageRequest.of(authorRoleManageVO.getPageIndex() - 1,
				authorRoleManageVO.getRecordCountPerPage());
		Page<AuthorRoleProjection> page = authorityRoleRepository
				.searchAuthorRoles(authorRoleManageVO.getSearchKeyword(), pageable);

		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	/**
	 * ???????????
	 **/
	@Override
	public int selectAuthorRoleListTotCnt(AuthorRoleManageVO authorRoleManageVO) throws Exception {
		Pageable pageable = PageRequest.of(0, 1);
		return (int) authorityRoleRepository.searchAuthorRoles(authorRoleManageVO.getSearchKeyword(), pageable)
				.getTotalElements();
	}

	/**
	 * ???
	 **/
	@Override
	@Transactional
	public void insertAuthorRole(AuthorRoleManage authorRoleManage) throws Exception {
		authorityRoleRepository.save(AuthorityRole.builder()
				.id(AuthorityRole.AuthorityRoleId.builder()
						.authorCode(authorRoleManage.getAuthorCode())
						.roleCode(authorRoleManage.getRoleCode())
						.build())
				.build());
	}

	/**
	 * ??????
	 **/
	@Override
	@Transactional
	public void deleteAuthorRole(AuthorRoleManage authorRoleManage) throws Exception {
		authorityRoleRepository.deleteById(AuthorityRole.AuthorityRoleId.builder()
				.authorCode(authorRoleManage.getAuthorCode())
				.roleCode(authorRoleManage.getRoleCode())
				.build());
	}

	private AuthorRoleManageVO toVO(AuthorRoleProjection p) {
		AuthorRoleManageVO vo = new AuthorRoleManageVO();
		vo.setRoleCode(p.getRoleCode());
		vo.setRoleNm(p.getRoleNm());
		vo.setRolePtn(p.getRolePtn());
		vo.setRoleDc(p.getRoleDc());
		vo.setRoleTyp(p.getRoleTyp());
		vo.setRoleSort(p.getRoleSort());
		vo.setAuthorCode(p.getAuthorCode());
		vo.setRegYn(p.getRegYn());
		if (p.getCreatDt() != null) {
			vo.setCreatDt(p.getCreatDt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
		}
		return vo;
	}
}
