module.exports = async (req, res) => {
  // 🛑 주의: 아래 주소를 재영님의 '구글 앱스 스크립트 배포 URL(/exec)'로 반드시 바꿔주세요!
  const GAS_URL = "https://script.google.com/macros/s/AKfycbxrekMu69GUi0lU8djKxRqgVSOhwEnrgS0O7g3NmMPlvGY33ClXeQpd52wItCqWGssL/exec";

  // 1. 카카오가 가장 좋아하는 군더더기 없는 헤더 (charset 제거)
  res.setHeader('Content-Type', 'application/json');

  try {
    // 2. [핵심] 구글로 데이터 전송! (await를 뺐습니다 = 구글의 대답을 기다리지 않음)
    fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {}),
      redirect: "follow"
    }).catch(err => console.error("GAS 호출 에러:", err)); 
    // (구글이 시트에 적다가 에러나도 Vercel은 신경 안 씁니다)

    // 3. 카카오에게는 0.1초 만에 바로 '성공' 답변을 던져버립니다!
    return res.status(200).json({
      version: "2.0",
      template: {
        outputs: [
          {
            simpleText: {
              text: "✅ 예약 요청이 접수되었습니다! 담당자 확인 후 시트에 반영됩니다."
            }
          }
        ]
      }
    });

  } catch (error) {
    // 혹시 모를 내부 에러 방어
    return res.status(200).json({
      version: "2.0",
      template: { outputs: [{ simpleText: { text: "시스템 통신 오류: " + error.message } }] }
    });
  }
};
