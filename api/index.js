module.exports = async (req, res) => {
  // ★ 여기에 본인의 GAS 웹앱 URL을 넣으세요
  const GAS_URL = "https://script.google.com/macros/s/AKfycbytrIHGjAzMgz-yWr7tFDHD1SypWZchDtavG-OIpvyA1CJLOvvyNBWbwV_kG8rZimdb/exec";

  // ── 1) 응답 헤더를 가장 먼저 세팅 ──
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  // ── 2) 카카오 규격 simpleText 응답 생성 헬퍼 ──
  const kakaoSimpleText = (msg) => ({
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: {
            text: String(msg).substring(0, 490) // 카카오 simpleText는 500자 제한
          }
        }
      ]
    }
  });

  // ── 3) ★ 핵심 추가: 카카오 스킬 응답 스키마 검증 함수 ★ ──
  //    "유효한 JSON"과 "카카오 스킬 응답 JSON"은 다릅니다!
  const isValidKakaoResponse = (obj) => {
    if (!obj || typeof obj !== "object") return false;
    if (obj.version !== "2.0") return false;
    if (obj.template && Array.isArray(obj.template.outputs)) return true;
    if (obj.useCallback === true) return true;
    return false;
  };

  // ── 디버그 로그 (Vercel Dashboard > Logs에서 확인) ──
  const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP A: req.body 안전하게 읽기
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Vercel은 req.body를 JavaScript getter로 구현.
    // malformed JSON이면 접근 순간 예외 발생!
    let requestBody;
    try {
      requestBody = req.body ?? {};
      log("✅ req.body 파싱 성공");
    } catch (bodyError) {
      log("❌ req.body 파싱 실패: " + bodyError.message);
      return res.status(200).json(
        kakaoSimpleText("[디버그] req.body 파싱 오류: " + bodyError.message)
      );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP B: GAS 호출 (2.5초 타임아웃)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 카카오 스킬 타임아웃 = 5초 (고정, 변경 불가)
    // GAS 302 리다이렉트 + 시트 I/O를 고려하면
    // fetch 자체는 2.5초 이내로 끊어야 안전
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    let gasResponse;
    try {
      log("📡 GAS 호출 시작...");
      gasResponse = await fetch(GAS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(requestBody),
        redirect: "follow",
        signal: controller.signal
      });
      log("📡 GAS 응답 수신 - status: " + gasResponse.status);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      const isTimeout = fetchError.name === "AbortError";
      const msg = isTimeout
        ? "⏱️ GAS 응답 시간 초과(2.5초). 시트 저장은 됐지만 응답이 느립니다."
        : "🌐 GAS 통신 오류: " + fetchError.message;
      log("❌ " + msg);
      return res.status(200).json(kakaoSimpleText(msg));
    } finally {
      clearTimeout(timeoutId);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP C: GAS 응답 텍스트 읽기
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let rawText;
    try {
      rawText = await gasResponse.text();
      log("📄 GAS 응답 본문 (앞 300자): " + rawText.substring(0, 300));
    } catch (textError) {
      log("❌ 응답 읽기 실패: " + textError.message);
      return res.status(200).json(
        kakaoSimpleText("[디버그] GAS 응답 읽기 실패: " + textError.message)
      );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP D: JSON 파싱 시도
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let parsed;
    try {
      parsed = JSON.parse(rawText);
      log("✅ JSON 파싱 성공");
    } catch (parseError) {
      log("❌ JSON 파싱 실패 (GAS가 HTML 반환 가능성)");
      return res.status(200).json(
        kakaoSimpleText("[디버그] GAS가 JSON이 아닌 응답:\n" + rawText.substring(0, 200))
      );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP E: ★ 카카오 스킬 스키마 검증 ★
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 여기가 기존 코드에 없던 핵심 방어입니다!
    if (!isValidKakaoResponse(parsed)) {
      log("⚠️ JSON이지만 카카오 스킬 형식 아님");
      return res.status(200).json(
        kakaoSimpleText(
          "[디버그] GAS가 카카오 형식 아닌 JSON 반환:\n" +
          JSON.stringify(parsed).substring(0, 200)
        )
      );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP F: 정상 응답 전달 🎉
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    log("🎉 카카오 스킬 응답 정상 전달!");
    return res.status(200).json(parsed);

  } catch (error) {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 최후의 방어벽
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const msg = "[최후방어] Vercel 예외: " + (error?.message || "unknown");
    console.error(msg, error);
    try {
      return res.status(200).json(kakaoSimpleText(msg));
    } catch (finalError) {
      res.statusCode = 200;
      res.end(JSON.stringify(kakaoSimpleText("시스템 오류가 발생했습니다.")));
    }
  }
};
