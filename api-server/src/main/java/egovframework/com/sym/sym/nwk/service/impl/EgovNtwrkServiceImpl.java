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
		Page<Object[]> page = ntwrkRepository.selectNtwrkList(
				ntwrkVO.getStrManageIem() == null ? "00" : ntwrkVO.getStrManageIem(),
				ntwrkVO.getStrUserNm(),
				pageable);
		return page.getContent().stream().map(this::mapToNtwrkVO).collect(Collectors.toList());
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
				.frstRegisterId(ntwrk.getFrstRegisterId())
				.build();
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
					.frstRegisterId(entity.getFrstRegisterId())
					.build();
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
		vo.setFrstRegisterPnttm(entity.getFrstRegisterPnttm() != null
				? entity.getFrstRegisterPnttm().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
				: "");
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		vo.setLastUpdusrPnttm(entity.getLastUpdusrPnttm() != null
				? entity.getLastUpdusrPnttm().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
				: "");
		vo.setLastUpdusrId(entity.getLastUpdusrId());
		return vo;
	}

	private NtwrkVO mapToNtwrkVO(Object[] row) {
		NtwrkVO vo = new NtwrkVO();
		vo.setNtwrkId((String) row[0]);
		vo.setNtwrkIp((String) row[1]);
		vo.setManageIem((String) row[3]); // Use the Name instead of the Code if possible, or mapping logic needed
		vo.setUserNm((String) row[6]);
		vo.setUseAt((String) row[7]);
		vo.setRegstYmd(
				row[8] != null ? ((java.sql.Date) row[8]).toLocalDate().format(DateTimeFormatter.ofPattern("yyyyMMdd"))
						: "");
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
