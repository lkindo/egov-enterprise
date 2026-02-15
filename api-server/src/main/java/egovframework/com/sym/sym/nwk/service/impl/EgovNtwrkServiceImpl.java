package egovframework.com.sym.sym.nwk.service.impl;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.system.NtwrkRepository;

import egovframework.com.sym.sym.nwk.service.EgovNtwrkService;
import egovframework.com.sym.sym.nwk.service.Ntwrk;
import egovframework.com.sym.sym.nwk.service.NtwrkVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

@Service("egovNtwrkService")
public class EgovNtwrkServiceImpl extends EgovAbstractServiceImpl implements EgovNtwrkService {

	@Resource
	private NtwrkRepository ntwrkRepository;

	/**
	 * 네트워크를 관리하기 위해 등록된 네트워크목록을 조회한다.
	 * 
	 * @param ntwrkVO - 네트워크 Vo
	 * @return List - 네트워크 목록
	 */
	@Override
	public List<NtwrkVO> selectNtwrkList(NtwrkVO ntwrkVO) throws Exception {
		Pageable pageable = PageRequest.of(ntwrkVO.getFirstIndex() / ntwrkVO.getRecordCountPerPage(),
				ntwrkVO.getRecordCountPerPage());
		Page<com.company.project.domain.system.Ntwrk> page = ntwrkRepository.searchNtwrks(
				ntwrkVO.getStrManageIem() == null ? "00" : ntwrkVO.getStrManageIem(),
				ntwrkVO.getStrUserNm(),
				pageable);
		return page.getContent().stream().map(this::mapToEntityNtwrkVO).collect(Collectors.toList());
	}

	/**
	 * 네트워크목록 총 개수를 조회한다.
	 * 
	 * @param ntwrkVO - 네트워크 Vo
	 * @return int - 네트워크 카운트 수
	 */
	@Override
	public int selectNtwrkListTotCnt(NtwrkVO ntwrkVO) throws Exception {
		return (int) ntwrkRepository.count();
	}

	/**
	 * 등록된 네트워크의 상세정보를 조회한다.
	 * 
	 * @param ntwrkVO - 네트워크 Vo
	 * @return NtwrkVO - 네트워크 Vo
	 */
	@Override
	public NtwrkVO selectNtwrk(NtwrkVO ntwrkVO) throws Exception {
		return ntwrkRepository.findById(ntwrkVO.getNtwrkId())
				.map(this::mapToEntityNtwrkVO)
				.orElse(null);
	}

	/**
	 * 네트워크정보를 신규로 등록한다.
	 * 
	 * @param ntwrk - 네트워크 model
	 * @return NtwrkVO - 네트워크 Vo
	 */
	@Override
	@Transactional
	public NtwrkVO insertNtwrk(Ntwrk ntwrk, NtwrkVO ntwrkVO) throws Exception {
		com.company.project.domain.system.Ntwrk entity = com.company.project.domain.system.Ntwrk.builder()
				.ntwrkId(ntwrk.getNtwrkId())
				.ntwrkIp(ntwrk.getNtwrkIp())
				.gtwy(ntwrk.getGtwy())
				.subnet(ntwrk.getSubnet())
				.domnServer(ntwrk.getDomnServer())
				.manageIem(ntwrk.getManageIem())
				.userNm(ntwrk.getUserNm())
				.useAt(ntwrk.getUseAt())
				.regstYmd(parseLocalDate(EgovStringUtil.removeMinusChar(ntwrk.getRegstYmd())))
				.build();
		entity.setFrstRegisterId(ntwrk.getFrstRegisterId());
		ntwrkRepository.save(entity);
		ntwrkVO.setNtwrkId(entity.getNtwrkId());
		return selectNtwrk(ntwrkVO);
	}

	/**
	 * 기 등록된 네트워크정보를 수정한다.
	 * 
	 * @param ntwrk - 네트워크 model
	 */
	@Override
	@Transactional
	public void updateNtwrk(Ntwrk ntwrk) throws Exception {
		ntwrkRepository.findById(ntwrk.getNtwrkId()).ifPresent(entity -> {
			com.company.project.domain.system.Ntwrk updated = com.company.project.domain.system.Ntwrk.builder()
					.ntwrkId(entity.getNtwrkId())
					.ntwrkIp(ntwrk.getNtwrkIp())
					.gtwy(ntwrk.getGtwy())
					.subnet(ntwrk.getSubnet())
					.domnServer(ntwrk.getDomnServer())
					.manageIem(ntwrk.getManageIem())
					.userNm(ntwrk.getUserNm())
					.useAt(ntwrk.getUseAt())
					.regstYmd(parseLocalDate(EgovStringUtil.removeMinusChar(ntwrk.getRegstYmd())))
					.build();
			updated.setFrstRegisterId(entity.getFrstRegisterId());
			ntwrkRepository.save(updated);
		});
	}

	/**
	 * 기 등록된 네트워크정보를 삭제한다.
	 * 
	 * @param ntwrk - 네트워크 model
	 */
	@Override
	@Transactional
	public void deleteNtwrk(Ntwrk ntwrk) throws Exception {
		ntwrkRepository.deleteById(ntwrk.getNtwrkId());
	}

	private NtwrkVO mapToEntityNtwrkVO(com.company.project.domain.system.Ntwrk entity) {
		NtwrkVO vo = new NtwrkVO();
		vo.setNtwrkId(entity.getNtwrkId());
		vo.setNtwrkIp(entity.getNtwrkIp());
		vo.setGtwy(entity.getGtwy());
		vo.setSubnet(entity.getSubnet());
		vo.setDomnServer(entity.getDomnServer());
		vo.setManageIem(entity.getManageIem());
		vo.setUserNm(entity.getUserNm());
		vo.setUseAt(entity.getUseAt());
		vo.setRegstYmd(
				entity.getRegstYmd() != null ? entity.getRegstYmd().format(DateTimeFormatter.ofPattern("yyyyMMdd"))
						: "");
		vo.setFrstRegisterPnttm(entity.getCreatedDate() != null
				? entity.getCreatedDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
				: "");
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		vo.setLastUpdusrPnttm(entity.getLastModifiedDate() != null
				? entity.getLastModifiedDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
				: "");
		vo.setLastUpdusrId(entity.getLastUpdusrId());
		return vo;
	}

	private LocalDate parseLocalDate(String dateStr) {
		if (dateStr == null || dateStr.isEmpty())
			return null;
		try {
			return LocalDate.parse(dateStr, DateTimeFormatter.ofPattern("yyyyMMdd"));
		} catch (Exception e) {
			return null;
		}
	}
}
