package egovframework.com.sec.rmt.service.impl;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.auth.RoleInfo;
import com.company.project.domain.auth.RoleInfoProjection;
import com.company.project.domain.auth.RoleInfoRepository;

import egovframework.com.sec.rmt.service.EgovRoleManageService;
import egovframework.com.sec.rmt.service.RoleManage;
import egovframework.com.sec.rmt.service.RoleManageVO;
import lombok.RequiredArgsConstructor;

/**
 * 롤관리에 관한 ServiceImpl 클래스를 정의한다.
 * 
 * @author 공통서비스 개발팀 이문준
 * @since 2009.06.01
 * @version 1.0
 */
@Service("egovRoleManageService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovRoleManageServiceImpl extends EgovAbstractServiceImpl implements EgovRoleManageService {

	private final RoleInfoRepository roleInfoRepository;

	/**
	 * 등록된 롤 정보 조회
	 */
	@Override
	public RoleManageVO selectRole(RoleManageVO roleManageVO) throws Exception {
		return roleInfoRepository.findById(roleManageVO.getRoleCode())
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	/**
	 * 등록된 롤 정보 목록 조회
	 */
	@Override
	public List<RoleManageVO> selectRoleList(RoleManageVO roleManageVO) throws Exception {
		Pageable pageable = PageRequest.of(roleManageVO.getPageIndex() - 1, roleManageVO.getRecordCountPerPage(),
				Sort.by("creatDt").descending());
		Page<RoleInfoProjection> page = roleInfoRepository.selectRoleList(roleManageVO.getSearchKeyword(), pageable);

		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	/**
	 * 불필요한 롤정보를 화면에 조회하여 데이터베이스에서 삭제
	 */
	@Override
	@Transactional
	public void deleteRole(RoleManage roleManage) throws Exception {
		roleInfoRepository.deleteById(roleManage.getRoleCode());
	}

	/**
	 * 시스템 메뉴에 따른 접근권한, 데이터 입력, 수정, 삭제의 권한 롤을 수정
	 */
	@Override
	@Transactional
	public void updateRole(RoleManage roleManage) throws Exception {
		roleInfoRepository.save(toEntity(roleManage));
	}

	/**
	 * 시스템 메뉴에 따른 접근권한, 데이터 입력, 수정, 삭제의 권한 롤을 등록
	 */
	@Override
	@Transactional
	public RoleManageVO insertRole(RoleManage roleManage, RoleManageVO roleManageVO) throws Exception {
		RoleInfo entity = roleInfoRepository.save(toEntity(roleManage));
		return toVO(entity);
	}

	/**
	 * 목록조회 카운트를 반환한다
	 */
	@Override
	public int selectRoleListTotCnt(RoleManageVO roleManageVO) throws Exception {
		Pageable pageable = PageRequest.of(0, 1);
		return (int) roleInfoRepository.selectRoleList(roleManageVO.getSearchKeyword(), pageable).getTotalElements();
	}

	/**
	 * 등록된 모든 롤 정보 목록 조회
	 */
	@Override
	public List<RoleManageVO> selectRoleAllList(RoleManageVO roleManageVO) throws Exception {
		return roleInfoRepository.findAll().stream().map(this::toVO).collect(Collectors.toList());
	}

	private RoleManageVO toVO(RoleInfo entity) {
		RoleManageVO vo = new RoleManageVO();
		vo.setRoleCode(entity.getRoleCode());
		vo.setRoleNm(entity.getRoleNm());
		vo.setRolePtn(entity.getRolePttrn());
		vo.setRoleDc(entity.getRoleDc());
		vo.setRoleTyp(entity.getRoleTy());
		vo.setRoleSort(entity.getRoleSort());
		if (entity.getCreatDt() != null) {
			vo.setRoleCreatDe(entity.getCreatDt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
		}
		return vo;
	}

	private RoleManageVO toVO(RoleInfoProjection projection) {
		RoleManageVO vo = new RoleManageVO();
		vo.setRoleCode(projection.getRoleCode());
		vo.setRoleNm(projection.getRoleNm());
		vo.setRolePtn(projection.getRolePttrn());
		vo.setRoleDc(projection.getRoleDc());
		vo.setRoleTyp(projection.getRoleTyNm()); // JSP shows TyNm for list
		vo.setRoleSort(projection.getRoleSort());
		if (projection.getCreatDt() != null) {
			vo.setRoleCreatDe(projection.getCreatDt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
		}
		return vo;
	}

	private RoleInfo toEntity(RoleManage vo) {
		return RoleInfo.builder()
				.roleCode(vo.getRoleCode())
				.roleNm(vo.getRoleNm())
				.rolePttrn(vo.getRolePtn())
				.roleDc(vo.getRoleDc())
				.roleTy(vo.getRoleTyp())
				.roleSort(vo.getRoleSort())
				.build();
	}
}
