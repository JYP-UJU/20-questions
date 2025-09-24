export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { baseQuestion, previousQuestions, stepNumber } = req.body;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1000,
        messages: [
          { 
            role: "user", 
            content: `기본 질문: "${baseQuestion}"에 대한 탐구 중입니다. 
            
현재 ${stepNumber}단계입니다.
이전 질문들: ${previousQuestions.join(', ')}

다음 탐구할 수 있는 구체적이고 흥미로운 질문 5개를 JSON 형식으로 제안해주세요:
{"questions": ["질문1", "질문2", "질문3", "질문4", "질문5"]}

조건:
- 기본 질문과 관련성이 높아야 함
- 이전 질문과 중복되지 않아야 함  
- 구체적이고 탐구 가능한 질문이어야 함
- JSON 형식으로만 응답` 
          }
        ]
      })
    });

    const data = await response.json();
    const questions = JSON.parse(data.content[0].text);
    
    res.status(200).json(questions);
  } catch (error) {
    res.status(500).json({ error: 'API 호출 실패' });
  }
}
