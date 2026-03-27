module.exports = async (req, res) => {
  // 🛑 주의: 아래 주소를 재영님의 '구글 앱스 스크립트 배포 URL(/exec)'로 반드시 바꿔주세요!
  const GAS_URL = "https://script.google.com/macros/s/AKfycbzztfSpFoLRAHwzhEwqOxaHiWjCtXqSaVm1_cZfWi-U3k8hRPgtttZk_GO_kJE1-2K-/exec";
  
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  // 어떤 상황에서도 무조건 카카오에 보낼 '비상용(Fallback)' 응답
  const fallback = (msg) => ({
    version: "2.0",
    template: { outputs: [{ simpleText: { text: msg } }] }
  });

  // 구글이 보낸 응답이 진짜 카카오 규격인지 깐깐하게 검사하는 함수
  const isKakaoResponse = (obj) => {
    return !!obj && obj.version === "2.0" && obj.template && Array.isArray(obj.template.outputs);
  };

  try {
    const body = req.body || {};
    
    // [핵심] 딱 3초만 기다리는 타이머 설정
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); 

    let response;
    try {
      response = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(body),
        redirect: "follow",
        signal: controller.signal // 3초 지나면 여기서 강제 중단!
      });
    } catch (fetchError) {
      clearTimeout(timeout);
      if (fetchError.name === 'AbortError') {
        // 🚨 구글이 3초 안에 답을 안 줬을 때! 
        // 시트 기록은 구글 서버에서 계속 돌아가니, 카카오에겐 성공 메시지를 먼저 줘버립니다.
        return res.status(200).json(fallback("✅ 예약이 정상 접수되었습니다! (시트 반영 중)"));
      }
      throw fetchError;
    }
    clearTimeout(timeout);

    // 구글이 3초 안에 준 답변을 까봅니다.
    const rawText = await response.text();

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      return res.status(200).json(fallback("구글 파싱 에러 (시트 확인 요망): " + rawText.slice(0, 50)));
    }

    if (!isKakaoResponse(parsed)) {
      return res.status(200).json(fallback("구글 규격 에러 (시트 확인 요망): " + rawText.slice(0, 50)));
    }

    // 모든 검문 통과! 완벽한 카카오 응답 반환
    return res.status(200).json(parsed);

  } catch (error) {
    return res.status(200).json(fallback("Vercel 시스템 예외: " + error.message));
  }
};
