package egovframework.com.uss.ion.ism.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import com.company.project.domain.notification.InfrmlSanctnRepository;

import egovframework.com.uss.ion.ism.service.EgovInfrmlSanctnService;
import egovframework.com.uss.ion.ism.service.InfrmlSanctn;
import egovframework.com.uss.ion.ism.service.SanctnerVO;
import jakarta.annotation.Resource;

@Service("egovInfrmlSanctnService")
public class EgovInfrmlSanctnServiceImpl extends EgovAbstractServiceImpl implements EgovInfrmlSanctnService {

	@Resource(name = "infrmlSanctnRepository")
	private InfrmlSanctnRepository infrmlSanctnRepository;

	@Resource(name = "egovInfrmlSanctnIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public Map<String, Object> selectSanctnerList(SanctnerVO sanctnerVO) throws Exception {
		Map<String, Object> map = new HashMap<>();
		map.put("resultList", List.of());
		map.put("resultCnt", 0);
		return map;
	}

	@Override
	public InfrmlSanctn selectInfrmlSanctn(InfrmlSanctn infrmlSanctn) throws Exception {
		return infrmlSanctnRepository.findById(infrmlSanctn.getInfrmlSanctnId())
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public InfrmlSanctn updateInfrmlSanctn(InfrmlSanctn infrmlSanctn) throws Exception {
		infrmlSanctnRepository.findById(infrmlSanctn.getInfrmlSanctnId()).ifPresent(entity -> {
			entity.update(infrmlSanctn.getSanctnerId(), infrmlSanctn.getLastUpdusrId());
			infrmlSanctnRepository.save(entity);
		});
		return infrmlSanctn;
	}

	@Override
	public InfrmlSanctn updateInfrmlSanctnConfm(InfrmlSanctn infrmlSanctn) throws Exception {
		infrmlSanctnRepository.findById(infrmlSanctn.getInfrmlSanctnId()).ifPresent(entity -> {
			entity.confirm(infrmlSanctn.getConfmAt(), infrmlSanctn.getReturnResn(), infrmlSanctn.getLastUpdusrId());
			infrmlSanctnRepository.save(entity);
		});
		return infrmlSanctn;
	}

	@Override
	public InfrmlSanctn updateInfrmlSanctnReturn(InfrmlSanctn infrmlSanctn) throws Exception {
		return updateInfrmlSanctnConfm(infrmlSanctn);
	}

	@Override
	public InfrmlSanctn insertInfrmlSanctn(InfrmlSanctn infrmlSanctn) throws Exception {
		String id = idgenService.getNextStringId();
		com.company.project.domain.notification.InfrmlSanctn entity = com.company.project.domain.notification.InfrmlSanctn
				.builder()
				.infrmlSanctnId(id)
				.jobSeCode(infrmlSanctn.getJobSeCode())
				.applcntId(infrmlSanctn.getApplcntId())
				.reqstDe(infrmlSanctn.getReqstDe())
				.sanctnerId(infrmlSanctn.getSanctnerId())
				.confmAt(infrmlSanctn.getConfmAt())
				.frstRegisterId(infrmlSanctn.getFrstRegisterId())
				.build();
		infrmlSanctnRepository.save(entity);
		infrmlSanctn.setInfrmlSanctnId(id);
		return infrmlSanctn;
	}

	@Override
	public void deleteInfrmlSanctn(InfrmlSanctn infrmlSanctn) throws Exception {
		infrmlSanctnRepository.deleteById(infrmlSanctn.getInfrmlSanctnId());
	}

	private InfrmlSanctn toVO(com.company.project.domain.notification.InfrmlSanctn entity) {
		InfrmlSanctn vo = new InfrmlSanctn();
		vo.setInfrmlSanctnId(entity.getInfrmlSanctnId());
		vo.setJobSeCode(entity.getJobSeCode());
		vo.setApplcntId(entity.getApplcntId());
		vo.setReqstDe(entity.getReqstDe());
		vo.setSanctnerId(entity.getSanctnerId());
		vo.setConfmAt(entity.getConfmAt());
		vo.setReturnResn(entity.getReturnResn());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		if (entity.getFrstRegisterPnttm() != null) {
			vo.setFrstRegisterPnttm(entity.getFrstRegisterPnttm().toString());
		}
		return vo;
	}
}
