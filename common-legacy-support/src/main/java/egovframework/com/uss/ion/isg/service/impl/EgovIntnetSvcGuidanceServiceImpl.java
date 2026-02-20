package egovframework.com.uss.ion.isg.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.notification.IntnetSvc;
import com.company.project.domain.notification.IntnetSvcRepository;

import egovframework.com.uss.ion.isg.service.EgovIntnetSvcGuidanceService;
import egovframework.com.uss.ion.isg.service.IntnetSvcGuidance;
import egovframework.com.uss.ion.isg.service.IntnetSvcGuidanceVO;
import jakarta.annotation.Resource;

@Service("egovIntnetSvcGuidanceService")
public class EgovIntnetSvcGuidanceServiceImpl extends EgovAbstractServiceImpl implements EgovIntnetSvcGuidanceService {

	@Resource(name = "intnetSvcRepository")
	private IntnetSvcRepository intnetSvcRepository;

	@Resource(name = "egovIntnetSvcGuidanceIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public List<IntnetSvcGuidanceVO> selectIntnetSvcGuidanceList(IntnetSvcGuidanceVO searchVO) throws Exception {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
		Page<IntnetSvc> page = intnetSvcRepository.findAll(pageable);
		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public int selectIntnetSvcGuidanceListTotCnt(IntnetSvcGuidanceVO searchVO) throws Exception {
		return (int) intnetSvcRepository.count();
	}

	@Override
	public IntnetSvcGuidanceVO selectIntnetSvcGuidance(IntnetSvcGuidanceVO searchVO) throws Exception {
		return intnetSvcRepository.findById(searchVO.getIntnetSvcId())
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public IntnetSvcGuidanceVO insertIntnetSvcGuidance(IntnetSvcGuidance intnetSvcGuidance,
			IntnetSvcGuidanceVO searchVO) throws Exception {
		String id = idgenService.getNextStringId();
		intnetSvcGuidance.setIntnetSvcId(id);

		IntnetSvc entity = IntnetSvc.builder()
				.intnetSvcId(id)
				.intnetSvcNm(intnetSvcGuidance.getIntnetSvcNm())
				.intnetSvcDc(intnetSvcGuidance.getIntnetSvcDc())
				.reflctAt(intnetSvcGuidance.getReflctAt())
				.frstRegisterId(intnetSvcGuidance.getUserId())
				.build();

		intnetSvcRepository.save(entity);
		return toVO(entity);
	}

	@Override
	public void updateIntnetSvcGuidance(IntnetSvcGuidance searchVO) throws Exception {
		intnetSvcRepository.findById(searchVO.getIntnetSvcId()).ifPresent(entity -> {
			entity.update(searchVO.getIntnetSvcNm(), searchVO.getIntnetSvcDc(), searchVO.getReflctAt(),
					searchVO.getUserId());
			intnetSvcRepository.save(entity);
		});
	}

	@Override
	public void deleteIntnetSvcGuidance(IntnetSvcGuidance searchVO) throws Exception {
		intnetSvcRepository.deleteById(searchVO.getIntnetSvcId());
	}

	@Override
	public List<IntnetSvcGuidanceVO> selectIntnetSvcGuidanceResult(IntnetSvcGuidanceVO searchVO) throws Exception {
		return intnetSvcRepository.findAll().stream()
				.filter(e -> "Y".equals(e.getReflctAt()))
				.map(this::toVO)
				.collect(Collectors.toList());
	}

	private IntnetSvcGuidanceVO toVO(IntnetSvc entity) {
		IntnetSvcGuidanceVO vo = new IntnetSvcGuidanceVO();
		vo.setIntnetSvcId(entity.getIntnetSvcId());
		vo.setIntnetSvcNm(entity.getIntnetSvcNm());
		vo.setIntnetSvcDc(entity.getIntnetSvcDc());
		vo.setReflctAt(entity.getReflctAt());
		vo.setUserId(entity.getFrstRegisterId());
		if (entity.getFrstRegisterPnttm() != null) {
			vo.setRegDate(entity.getFrstRegisterPnttm().toString());
		}
		return vo;
	}
}
