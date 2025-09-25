exports.handler = async (event, context) => {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { baseQuestion, previousQuestions = [], stepNumber } = JSON.parse(event.body);

    if (!process.env.CLAUDE_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'API key not found' })
      };
    }

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
            content: `"${baseQuestion}"에 대한 ${stepNumber}단계 탐구입니다.

이전 질문들: ${previousQuestions.length > 0 ? previousQuestions.join(', ') : '없음'}

"${baseQuestion}"와 관련된 구체적이고 흥미로운 새로운 질문 5개를 제안해주세요.

다음 JSON 형식으로만 답변해주세요:
{"questions": ["질문1", "질문2", "질문3", "질문4", "질문5"]}

JSON 외에는 다른 텍스트를 포함하지 마세요.`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.content[0].text.trim();
    
    // JSON 부분만 추출
    if (content.includes('{')) {
      content = content.substring(content.indexOf('{'));
      content = content.substring(0, content.lastIndexOf('}') + 1);
    }
    
    const questions = JSON.parse(content);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(questions)
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'API 호출 실패',
        details: error.message 
      })
    };
  }
};
