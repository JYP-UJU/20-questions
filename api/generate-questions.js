export default async function handler(req, res) {
  // CORS 헤더 추가
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { baseQuestion, previousQuestions = [], stepNumber } = req.body;

  if (!process.env.CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'API key not found' });
  }

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
            content: `기본 질문: "${baseQuestion}"에 대한 ${stepNumber}단계 탐구입니다.

이전 질문들: ${previousQuestions.length > 0 ? previousQuestions.join(', ') : '없음'}

"${baseQuestion}"와 관련된 구체적이고 흥미로운 질문 5개를 제안해주세요. 이전 질문과 중복되지 않아야 합니다.

다음 JSON 형식으로만 답변해주세요:
{"questions": ["질문1", "질문2", "질문3", "질문4", "질문5"]}

JSON 형식 외에는 다른 텍스트를 포함하지 마세요.`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content[0].text.trim();
    
    // JSON 파싱 시도
    const questions = JSON.parse(content);
    
    res.status(200).json(questions);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'API 호출 실패',
      details: error.message 
    });
  }
}
